from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.base import Product, Supplier, InventoryLot, SaleItem, Sale
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetailOut
from app.services.inventory_service import InventoryService


class ProductService:
    @staticmethod
    async def list_products(
        db: AsyncSession,
        shop_id: str,
        category: Optional[str] = None,
        search: Optional[str] = None,
        supplier_id: Optional[str] = None,
        stock_status_filter: Optional[str] = None,
        include_inactive: bool = False,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[ProductOut], int]:
        """List products for shop with dynamic filters and stock status."""
        filters = [Product.shop_id == shop_id]
        if not include_inactive:
            filters.append(Product.is_active == True)
        if category and category != "all":
            filters.append(Product.category.ilike(category))
        if supplier_id:
            filters.append(Product.preferred_supplier_id == supplier_id)
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term)
                )
            )

        # Count total
        count_stmt = select(func.count(Product.id)).where(and_(*filters))
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Query products
        stmt = (
            select(Product, Supplier.name.label("supplier_name"))
            .outerjoin(Supplier, Product.preferred_supplier_id == Supplier.id)
            .where(and_(*filters))
            .order_by(Product.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db.execute(stmt)
        rows = res.all()

        products_out: List[ProductOut] = []
        for p, s_name in rows:
            on_hand = await InventoryService.get_stock_on_hand(db, shop_id, p.id)
            incoming = await InventoryService.get_incoming_stock(db, shop_id, p.id)
            
            # Stock status
            if on_hand == 0:
                p_status = "out_of_stock"
            elif on_hand <= p.reorder_point:
                p_status = "low"
            elif on_hand > p.max_stock:
                p_status = "overstocked"
            else:
                p_status = "ok"

            if stock_status_filter and stock_status_filter != "all" and p_status != stock_status_filter:
                continue

            p_out = ProductOut(
                id=p.id,
                shop_id=p.shop_id,
                sku=p.sku,
                barcode=p.barcode,
                name=p.name,
                category=p.category,
                unit=p.unit,
                unit_cost=p.unit_cost,
                selling_price=p.selling_price,
                min_stock=p.min_stock,
                max_stock=p.max_stock,
                shelf_life_days=p.shelf_life_days,
                lead_time_days=p.lead_time_days,
                reorder_point=p.reorder_point,
                target_stock=p.target_stock,
                safety_stock=p.safety_stock,
                moq=p.moq,
                case_pack=p.case_pack,
                preferred_supplier_id=p.preferred_supplier_id,
                preferred_supplier_name=s_name,
                is_active=p.is_active,
                notes=p.notes,
                stock_on_hand=on_hand,
                stock_incoming=incoming,
                stock_status=p_status,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            products_out.append(p_out)

        return products_out, total

    @staticmethod
    async def create_product(db: AsyncSession, shop_id: str, payload: ProductCreate) -> Product:
        # Check SKU uniqueness per shop
        sku_stmt = select(Product).where(Product.shop_id == shop_id, Product.sku.ilike(payload.sku))
        if (await db.execute(sku_stmt)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A product with SKU '{payload.sku}' already exists in this store."
            )

        product = Product(
            shop_id=shop_id,
            sku=payload.sku,
            barcode=payload.barcode,
            name=payload.name,
            category=payload.category,
            unit=payload.unit,
            unit_cost=payload.unit_cost,
            selling_price=payload.selling_price,
            min_stock=payload.min_stock,
            max_stock=payload.max_stock,
            shelf_life_days=payload.shelf_life_days,
            lead_time_days=payload.lead_time_days,
            reorder_point=payload.reorder_point,
            target_stock=payload.target_stock,
            safety_stock=payload.safety_stock,
            moq=payload.moq,
            case_pack=payload.case_pack,
            preferred_supplier_id=payload.preferred_supplier_id,
            notes=payload.notes,
            is_active=True,
        )
        db.add(product)
        await db.flush()

        # If initial stock provided, create lot
        if payload.initial_stock and payload.initial_stock > 0:
            await InventoryService.add_stock_lot(
                db=db,
                shop_id=shop_id,
                product_id=product.id,
                quantity=payload.initial_stock,
                unit_cost=payload.unit_cost,
                expiry_date=payload.initial_expiry_date,
                reference_type="initial_stock",
                reason="Initial product creation stock",
            )

        await db.commit()
        await db.refresh(product)
        return product

    @staticmethod
    async def get_product_detail(db: AsyncSession, shop_id: str, product_id: str) -> ProductDetailOut:
        stmt = (
            select(Product, Supplier.name.label("supplier_name"))
            .outerjoin(Supplier, Product.preferred_supplier_id == Supplier.id)
            .where(Product.id == product_id, Product.shop_id == shop_id)
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        p, s_name = row
        on_hand = await InventoryService.get_stock_on_hand(db, shop_id, p.id)
        incoming = await InventoryService.get_incoming_stock(db, shop_id, p.id)

        # Nearest expiry and active lots count
        lots_stmt = select(InventoryLot).where(
            InventoryLot.shop_id == shop_id,
            InventoryLot.product_id == p.id,
            InventoryLot.status == "active",
            InventoryLot.quantity_remaining > 0
        ).order_by(InventoryLot.expiry_date.asc().nullslast())
        lots_res = await db.execute(lots_stmt)
        lots = lots_res.scalars().all()
        active_lots_count = len(lots)
        nearest_expiry = lots[0].expiry_date if lots and lots[0].expiry_date else None

        # 30-day sales count
        since_date = datetime.now(timezone.utc) - timedelta(days=30)
        sales_stmt = (
            select(func.coalesce(func.sum(SaleItem.quantity), 0))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(SaleItem.product_id == p.id, Sale.sold_at >= since_date)
        )
        sales_res = await db.execute(sales_stmt)
        sales_30d = int(sales_res.scalar() or 0)

        p_status = "ok"
        if on_hand == 0:
            p_status = "out_of_stock"
        elif on_hand <= p.reorder_point:
            p_status = "low"
        elif on_hand > p.max_stock:
            p_status = "overstocked"

        return ProductDetailOut(
            id=p.id,
            shop_id=p.shop_id,
            sku=p.sku,
            barcode=p.barcode,
            name=p.name,
            category=p.category,
            unit=p.unit,
            unit_cost=p.unit_cost,
            selling_price=p.selling_price,
            min_stock=p.min_stock,
            max_stock=p.max_stock,
            shelf_life_days=p.shelf_life_days,
            lead_time_days=p.lead_time_days,
            reorder_point=p.reorder_point,
            target_stock=p.target_stock,
            safety_stock=p.safety_stock,
            moq=p.moq,
            case_pack=p.case_pack,
            preferred_supplier_id=p.preferred_supplier_id,
            preferred_supplier_name=s_name,
            is_active=p.is_active,
            notes=p.notes,
            stock_on_hand=on_hand,
            stock_incoming=incoming,
            stock_status=p_status,
            active_lots_count=active_lots_count,
            nearest_expiry_date=nearest_expiry,
            recent_30d_sales=sales_30d,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )

    @staticmethod
    async def update_product(db: AsyncSession, shop_id: str, product_id: str, payload: ProductUpdate) -> Product:
        stmt = select(Product).where(Product.id == product_id, Product.shop_id == shop_id)
        p = (await db.execute(stmt)).scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(p, key, value)

        await db.commit()
        await db.refresh(p)
        return p

    @staticmethod
    async def soft_delete_product(db: AsyncSession, shop_id: str, product_id: str) -> None:
        stmt = select(Product).where(Product.id == product_id, Product.shop_id == shop_id)
        p = (await db.execute(stmt)).scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")

        p.is_active = False
        await db.commit()
