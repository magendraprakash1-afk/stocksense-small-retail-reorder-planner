from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.base import Product, InventoryLot, InventoryMovement, PurchaseOrder, PurchaseOrderItem
from app.schemas.inventory import StockAdjustmentCreate, ExpiryAlertOut, InventorySummaryOut


class InventoryService:
    @staticmethod
    async def get_stock_on_hand(db: AsyncSession, shop_id: str, product_id: str) -> int:
        """Calculate current available physical stock from active lots."""
        stmt = select(func.coalesce(func.sum(InventoryLot.quantity_remaining), 0)).where(
            InventoryLot.shop_id == shop_id,
            InventoryLot.product_id == product_id,
            InventoryLot.status == "active",
            InventoryLot.quantity_remaining > 0
        )
        res = await db.execute(stmt)
        return int(res.scalar() or 0)

    @staticmethod
    async def get_incoming_stock(db: AsyncSession, shop_id: str, product_id: str) -> int:
        """Calculate confirmed incoming units from open purchase orders."""
        stmt = (
            select(func.coalesce(func.sum(PurchaseOrderItem.quantity_ordered - PurchaseOrderItem.quantity_received), 0))
            .join(PurchaseOrder, PurchaseOrderItem.po_id == PurchaseOrder.id)
            .where(
                PurchaseOrder.shop_id == shop_id,
                PurchaseOrderItem.product_id == product_id,
                PurchaseOrder.status.in_(["submitted", "partially_received", "draft"])
            )
        )
        res = await db.execute(stmt)
        return int(res.scalar() or 0)

    @staticmethod
    async def deduct_stock_fefo(
        db: AsyncSession,
        shop_id: str,
        product_id: str,
        quantity: int,
        reference_type: str = "sale",
        reference_id: Optional[str] = None,
        reason: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[Tuple[str, int]]:
        """
        First-Expired-First-Out (FEFO) stock deduction.
        Deducts from lots ordered by expiry date (earliest first, nulls last).
        Records audit movements for every lot affected.
        """
        if quantity <= 0:
            return []

        # Find available lots ordered by expiry date asc
        stmt = (
            select(InventoryLot)
            .where(
                InventoryLot.shop_id == shop_id,
                InventoryLot.product_id == product_id,
                InventoryLot.status == "active",
                InventoryLot.quantity_remaining > 0
            )
            .order_by(InventoryLot.expiry_date.asc().nullslast(), InventoryLot.received_at.asc())
        )
        res = await db.execute(stmt)
        lots = res.scalars().all()

        total_available = sum(l.quantity_remaining for l in lots)
        if total_available < quantity:
            # Insufficient stock - still allow sale if configured or warn
            pass

        remaining_to_deduct = quantity
        deductions: List[Tuple[str, int]] = []

        for lot in lots:
            if remaining_to_deduct <= 0:
                break
            
            deduct_from_lot = min(lot.quantity_remaining, remaining_to_deduct)
            before_qty = lot.quantity_remaining
            lot.quantity_remaining -= deduct_from_lot
            after_qty = lot.quantity_remaining
            if lot.quantity_remaining == 0:
                lot.status = "depleted"

            # Create audit movement
            movement = InventoryMovement(
                shop_id=shop_id,
                product_id=product_id,
                lot_id=lot.id,
                movement_type=reference_type,
                quantity_delta=-deduct_from_lot,
                quantity_before=before_qty,
                quantity_after=after_qty,
                unit_cost=lot.unit_cost,
                reference_type=reference_type,
                reference_id=reference_id,
                reason=reason or f"FEFO deduction from lot {lot.lot_number}",
                created_by_user_id=user_id,
            )
            db.add(movement)
            deductions.append((lot.id, deduct_from_lot))
            remaining_to_deduct -= deduct_from_lot

        # If there were no lots or not enough lots, create an unassigned movement
        if remaining_to_deduct > 0:
            movement = InventoryMovement(
                shop_id=shop_id,
                product_id=product_id,
                lot_id=None,
                movement_type=reference_type,
                quantity_delta=-remaining_to_deduct,
                quantity_before=0,
                quantity_after=-remaining_to_deduct,
                unit_cost=0.0,
                reference_type=reference_type,
                reference_id=reference_id,
                reason=f"Unassigned deduction (backorder/untracked lot) - {reason}",
                created_by_user_id=user_id,
            )
            db.add(movement)
            deductions.append(("unassigned", remaining_to_deduct))

        return deductions

    @staticmethod
    async def add_stock_lot(
        db: AsyncSession,
        shop_id: str,
        product_id: str,
        quantity: int,
        unit_cost: float,
        lot_number: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        reference_type: str = "po_receipt",
        reference_id: Optional[str] = None,
        reason: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> InventoryLot:
        """Add new inventory lot and log corresponding movement."""
        if not lot_number:
            now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
            lot_number = f"LOT-{now_str}-{product_id[:6].upper()}"

        lot = InventoryLot(
            shop_id=shop_id,
            product_id=product_id,
            lot_number=lot_number,
            quantity_received=quantity,
            quantity_remaining=quantity,
            unit_cost=unit_cost,
            received_at=datetime.now(timezone.utc),
            expiry_date=expiry_date,
            status="active"
        )
        db.add(lot)
        await db.flush()

        movement = InventoryMovement(
            shop_id=shop_id,
            product_id=product_id,
            lot_id=lot.id,
            movement_type=reference_type,
            quantity_delta=quantity,
            quantity_before=0,
            quantity_after=quantity,
            unit_cost=unit_cost,
            reference_type=reference_type,
            reference_id=reference_id,
            reason=reason or f"Received into lot {lot_number}",
            created_by_user_id=user_id,
        )
        db.add(movement)
        return lot

    @staticmethod
    async def apply_adjustment(
        db: AsyncSession,
        shop_id: str,
        adjustment: StockAdjustmentCreate,
        user_id: Optional[str] = None
    ) -> InventoryMovement:
        """Process manual stock count adjustments."""
        current_stock = await InventoryService.get_stock_on_hand(db, shop_id, adjustment.product_id)
        
        # Get product unit cost
        p_res = await db.execute(select(Product).where(Product.id == adjustment.product_id, Product.shop_id == shop_id))
        product = p_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        qty_delta = adjustment.quantity if adjustment.direction == "increase" else -adjustment.quantity
        new_total = max(0, current_stock + qty_delta)

        if qty_delta > 0:
            lot = await InventoryService.add_stock_lot(
                db=db,
                shop_id=shop_id,
                product_id=adjustment.product_id,
                quantity=qty_delta,
                unit_cost=product.unit_cost,
                reference_type=f"adj_{adjustment.adjustment_type}",
                reason=adjustment.reason,
                user_id=user_id,
            )
            movement_id = lot.id
        else:
            await InventoryService.deduct_stock_fefo(
                db=db,
                shop_id=shop_id,
                product_id=adjustment.product_id,
                quantity=abs(qty_delta),
                reference_type=f"adj_{adjustment.adjustment_type}",
                reason=adjustment.reason,
                user_id=user_id,
            )

        # Retrieve the newly created movement
        stmt = (
            select(InventoryMovement)
            .where(InventoryMovement.shop_id == shop_id, InventoryMovement.product_id == adjustment.product_id)
            .order_by(InventoryMovement.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_expiry_alerts(db: AsyncSession, shop_id: str, days_threshold: int = 30) -> List[ExpiryAlertOut]:
        """Find lots expiring within threshold days or already expired."""
        now = datetime.now(timezone.utc)
        threshold_date = now + timedelta(days=days_threshold)

        stmt = (
            select(InventoryLot, Product)
            .join(Product, InventoryLot.product_id == Product.id)
            .where(
                InventoryLot.shop_id == shop_id,
                InventoryLot.status == "active",
                InventoryLot.quantity_remaining > 0,
                InventoryLot.expiry_date != None,
                InventoryLot.expiry_date <= threshold_date
            )
            .order_by(InventoryLot.expiry_date.asc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        alerts = []
        for lot, prod in rows:
            days_to_exp = (lot.expiry_date.replace(tzinfo=timezone.utc) - now).days
            if days_to_exp < 0:
                alert_status = "expired"
            elif days_to_exp <= 7:
                alert_status = "critical"
            else:
                alert_status = "warning"

            alerts.append(ExpiryAlertOut(
                product_id=prod.id,
                product_name=prod.name,
                sku=prod.sku,
                lot_id=lot.id,
                lot_number=lot.lot_number,
                quantity_remaining=lot.quantity_remaining,
                expiry_date=lot.expiry_date,
                days_to_expiry=days_to_exp,
                status=alert_status,
                potential_loss=round(lot.quantity_remaining * lot.unit_cost, 2)
            ))
        return alerts

    @staticmethod
    async def get_inventory_summary(db: AsyncSession, shop_id: str) -> InventorySummaryOut:
        """Compute top-level inventory statistics."""
        # Active products
        p_res = await db.execute(
            select(func.count(Product.id)).where(Product.shop_id == shop_id, Product.is_active == True)
        )
        total_skus = p_res.scalar() or 0

        # Total on-hand & total valuation
        lots_res = await db.execute(
            select(
                func.coalesce(func.sum(InventoryLot.quantity_remaining), 0),
                func.coalesce(func.sum(InventoryLot.quantity_remaining * InventoryLot.unit_cost), 0.0)
            ).where(InventoryLot.shop_id == shop_id, InventoryLot.status == "active")
        )
        total_units, total_valuation = lots_res.first() or (0, 0.0)

        # Alerts count
        alerts = await InventoryService.get_expiry_alerts(db, shop_id, days_threshold=30)
        expiring_soon = sum(1 for a in alerts if a.status in ["critical", "warning"])
        expired_count = sum(1 for a in alerts if a.status == "expired")

        # Low stock and out-of-stock count
        prod_stmt = select(Product).where(Product.shop_id == shop_id, Product.is_active == True)
        prods = (await db.execute(prod_stmt)).scalars().all()
        low_stock_count = 0
        out_of_stock_count = 0

        for p in prods:
            stock = await InventoryService.get_stock_on_hand(db, shop_id, p.id)
            if stock == 0:
                out_of_stock_count += 1
            elif stock <= p.reorder_point:
                low_stock_count += 1

        return InventorySummaryOut(
            total_sku_count=total_skus,
            total_quantity_on_hand=int(total_units),
            total_inventory_valuation=round(float(total_valuation), 2),
            low_stock_count=low_stock_count,
            out_of_stock_count=out_of_stock_count,
            expiring_soon_count=expiring_soon,
            expired_count=expired_count
        )
