from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.base import Supplier, Product, PurchaseOrder, ProductSupplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut


class SupplierService:
    @staticmethod
    async def list_suppliers(
        db: AsyncSession,
        shop_id: str,
        search: Optional[str] = None
    ) -> List[SupplierOut]:
        filters = [Supplier.shop_id == shop_id, Supplier.is_active == True]
        if search:
            filters.append(Supplier.name.ilike(f"%{search}%"))

        stmt = select(Supplier).where(and_(*filters)).order_by(Supplier.name.asc())
        res = await db.execute(stmt)
        suppliers = res.scalars().all()

        out_list = []
        for s in suppliers:
            # Count products supplied
            prod_count_stmt = select(func.count(Product.id)).where(Product.preferred_supplier_id == s.id)
            p_count = (await db.execute(prod_count_stmt)).scalar() or 0

            # Count active POs
            po_count_stmt = select(func.count(PurchaseOrder.id)).where(
                PurchaseOrder.supplier_id == s.id,
                PurchaseOrder.status.in_(["draft", "submitted", "partially_received"])
            )
            po_count = (await db.execute(po_count_stmt)).scalar() or 0

            out_list.append(SupplierOut(
                id=s.id,
                shop_id=s.shop_id,
                name=s.name,
                code=s.code,
                contact_name=s.contact_name,
                email=s.email,
                phone=s.phone,
                address=s.address,
                lead_time_days=s.lead_time_days,
                min_order_value=s.min_order_value,
                payment_terms=s.payment_terms,
                rating=s.rating,
                is_active=s.is_active,
                products_count=p_count,
                active_po_count=po_count,
                created_at=s.created_at,
                updated_at=s.updated_at
            ))
        return out_list

    @staticmethod
    async def create_supplier(db: AsyncSession, shop_id: str, payload: SupplierCreate) -> Supplier:
        supplier = Supplier(
            shop_id=shop_id,
            name=payload.name,
            code=payload.code,
            contact_name=payload.contact_name,
            email=str(payload.email) if payload.email else None,
            phone=payload.phone,
            address=payload.address,
            lead_time_days=payload.lead_time_days,
            min_order_value=payload.min_order_value,
            payment_terms=payload.payment_terms,
            rating=payload.rating,
            is_active=True
        )
        db.add(supplier)
        await db.commit()
        await db.refresh(supplier)
        return supplier

    @staticmethod
    async def update_supplier(db: AsyncSession, shop_id: str, supplier_id: str, payload: SupplierUpdate) -> Supplier:
        stmt = select(Supplier).where(Supplier.id == supplier_id, Supplier.shop_id == shop_id)
        supplier = (await db.execute(stmt)).scalar_one_or_none()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")

        update_dict = payload.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            setattr(supplier, k, v)

        await db.commit()
        await db.refresh(supplier)
        return supplier
