from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.base import PurchaseOrder, PurchaseOrderItem, Supplier, Product
from app.schemas.purchase_order import POCreate, POOut, POItemOut, POReceiveRequest
from app.services.inventory_service import InventoryService


class PurchaseOrderService:
    @staticmethod
    async def list_orders(
        db: AsyncSession,
        shop_id: str,
        status_filter: Optional[str] = None
    ) -> List[POOut]:
        filters = [PurchaseOrder.shop_id == shop_id]
        if status_filter and status_filter != "all":
            filters.append(PurchaseOrder.status == status_filter)

        stmt = (
            select(PurchaseOrder, Supplier.name.label("supplier_name"))
            .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
            .where(and_(*filters))
            .order_by(PurchaseOrder.ordered_at.desc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        pos_out = []
        for po, s_name in rows:
            # Load items
            i_stmt = (
                select(PurchaseOrderItem, Product.name.label("p_name"), Product.sku.label("p_sku"))
                .join(Product, PurchaseOrderItem.product_id == Product.id)
                .where(PurchaseOrderItem.po_id == po.id)
            )
            i_res = await db.execute(i_stmt)
            items = []
            for item, p_name, p_sku in i_res.all():
                items.append(POItemOut(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=p_name,
                    product_sku=p_sku,
                    quantity_ordered=item.quantity_ordered,
                    quantity_received=item.quantity_received,
                    unit_cost=item.unit_cost,
                    total_cost=item.total_cost
                ))

            pos_out.append(POOut(
                id=po.id,
                shop_id=po.shop_id,
                supplier_id=po.supplier_id,
                supplier_name=s_name,
                order_number=po.order_number,
                status=po.status,
                total_amount=po.total_amount,
                notes=po.notes,
                ordered_at=po.ordered_at,
                expected_delivery_date=po.expected_delivery_date,
                actual_delivery_date=po.actual_delivery_date,
                items=items,
                created_at=po.created_at
            ))
        return pos_out

    @staticmethod
    async def create_order(
        db: AsyncSession,
        shop_id: str,
        payload: POCreate,
        user_id: Optional[str] = None
    ) -> PurchaseOrder:
        # Generate PO number: PO-YYYYMMDD-XXXX
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
        order_num = f"PO-{now_str}"

        total_amount = sum(it.quantity_ordered * it.unit_cost for it in payload.items)

        po = PurchaseOrder(
            shop_id=shop_id,
            supplier_id=payload.supplier_id,
            order_number=order_num,
            status="submitted",
            total_amount=round(total_amount, 2),
            notes=payload.notes,
            ordered_at=datetime.now(timezone.utc),
            expected_delivery_date=payload.expected_delivery_date,
            created_by_user_id=user_id
        )
        db.add(po)
        await db.flush()

        for it in payload.items:
            po_item = PurchaseOrderItem(
                po_id=po.id,
                product_id=it.product_id,
                quantity_ordered=it.quantity_ordered,
                quantity_received=0,
                unit_cost=it.unit_cost,
                total_cost=round(it.quantity_ordered * it.unit_cost, 2)
            )
            db.add(po_item)

        await db.commit()
        await db.refresh(po)
        return po

    @staticmethod
    async def receive_goods(
        db: AsyncSession,
        shop_id: str,
        po_id: str,
        payload: POReceiveRequest,
        user_id: Optional[str] = None
    ) -> PurchaseOrder:
        """
        Atomically process PO receipt:
        - Updates line items quantity_received
        - Adds physical inventory lots with optional expiry dates
        - Creates auditable inventory movements
        - Updates PO status (received or partially_received)
        """
        stmt = select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.shop_id == shop_id)
        po = (await db.execute(stmt)).scalar_one_or_none()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        # Load PO items
        i_stmt = select(PurchaseOrderItem).where(PurchaseOrderItem.po_id == po.id)
        items = (await db.execute(i_stmt)).scalars().all()
        items_by_id = {i.id: i for i in items}

        for rec in payload.items:
            po_item = items_by_id.get(rec.item_id)
            if not po_item:
                continue

            po_item.quantity_received += rec.quantity_received

            # Add to inventory lot
            lot_num = rec.lot_number or f"{po.order_number}-{po_item.product_id[:4].upper()}"
            await InventoryService.add_stock_lot(
                db=db,
                shop_id=shop_id,
                product_id=po_item.product_id,
                quantity=rec.quantity_received,
                unit_cost=po_item.unit_cost,
                lot_number=lot_num,
                expiry_date=rec.expiry_date,
                reference_type="po_receipt",
                reference_id=po.order_number,
                reason=f"Received PO {po.order_number}",
                user_id=user_id
            )

        # Evaluate PO completion status
        all_received = all(i.quantity_received >= i.quantity_ordered for i in items)
        any_received = any(i.quantity_received > 0 for i in items)

        if all_received:
            po.status = "received"
            po.actual_delivery_date = datetime.now(timezone.utc)
        elif any_received:
            po.status = "partially_received"

        await db.commit()
        await db.refresh(po)
        return po
