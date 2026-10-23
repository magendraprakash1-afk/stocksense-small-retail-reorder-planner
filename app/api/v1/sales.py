import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user
from app.models.base import Shop, User, Sale, SaleItem, Product
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.sales import (
    SaleCreate, SaleOut, SaleItemOut, SalesSummaryOut,
    SalesImportPreviewOut, SalesImportConfirmRequest
)
from app.services.inventory_service import InventoryService
from app.services.sales_import_service import SalesImportService

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.get("", response_model=PaginatedResponse[SaleOut])
async def list_sales(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """List completed sales transactions."""
    filters = [Sale.shop_id == shop.id]
    if start_date:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        filters.append(Sale.sold_at >= dt_start)
    if end_date:
        dt_end = (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)).replace(tzinfo=timezone.utc)
        filters.append(Sale.sold_at < dt_end)

    count_stmt = select(func.count(Sale.id)).where(and_(*filters))
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(Sale)
        .where(and_(*filters))
        .order_by(Sale.sold_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    sales = res.scalars().all()

    sales_out = []
    for s in sales:
        i_stmt = (
            select(SaleItem, Product.name.label("p_name"), Product.sku.label("p_sku"))
            .join(Product, SaleItem.product_id == Product.id)
            .where(SaleItem.sale_id == s.id)
        )
        i_res = await db.execute(i_stmt)
        items = []
        for it, p_name, p_sku in i_res.all():
            items.append(SaleItemOut(
                id=it.id,
                product_id=it.product_id,
                product_name=p_name,
                product_sku=p_sku,
                lot_id=it.lot_id,
                quantity=it.quantity,
                unit_price=it.unit_price,
                unit_cost=it.unit_cost,
                total_price=it.total_price
            ))

        sales_out.append(SaleOut(
            id=s.id,
            shop_id=s.shop_id,
            invoice_number=s.invoice_number,
            customer_name=s.customer_name,
            total_amount=s.total_amount,
            tax_amount=s.tax_amount,
            discount_amount=s.discount_amount,
            payment_method=s.payment_method,
            status=s.status,
            sold_at=s.sold_at,
            items=items
        ))

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedResponse(
        success=True,
        data=sales_out,
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
    )


@router.post("", response_model=ApiResponse[SaleOut], status_code=status.HTTP_201_CREATED)
async def create_sale(
    payload: SaleCreate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a point-of-sale transaction with FEFO physical inventory deduction."""
    now = payload.sold_at or datetime.now(timezone.utc)
    inv_num = f"INV-{now.strftime('%Y%m%d%H%M%S')}"

    sale = Sale(
        shop_id=shop.id,
        invoice_number=inv_num,
        customer_name=payload.customer_name,
        payment_method=payload.payment_method,
        discount_amount=payload.discount_amount,
        tax_amount=payload.tax_amount,
        status="completed",
        sold_at=now,
        created_by_user_id=current_user.id
    )
    db.add(sale)
    await db.flush()

    total_amount = 0.0
    sale_items_out = []

    for it in payload.items:
        prod_res = await db.execute(select(Product).where(Product.id == it.product_id, Product.shop_id == shop.id))
        prod = prod_res.scalar_one_or_none()
        if not prod:
            continue

        item_total = round(it.quantity * it.unit_price, 2)
        total_amount += item_total

        # FEFO stock deduction
        deductions = await InventoryService.deduct_stock_fefo(
            db=db,
            shop_id=shop.id,
            product_id=prod.id,
            quantity=it.quantity,
            reference_type="sale",
            reference_id=inv_num,
            reason=f"POS Sale {inv_num}",
            user_id=current_user.id
        )
        assigned_lot_id = deductions[0][0] if deductions and deductions[0][0] != "unassigned" else None

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=prod.id,
            lot_id=assigned_lot_id,
            quantity=it.quantity,
            unit_price=it.unit_price,
            unit_cost=prod.unit_cost,
            total_price=item_total
        )
        db.add(sale_item)
        await db.flush()

        sale_items_out.append(SaleItemOut(
            id=sale_item.id,
            product_id=prod.id,
            product_name=prod.name,
            product_sku=prod.sku,
            lot_id=assigned_lot_id,
            quantity=it.quantity,
            unit_price=it.unit_price,
            unit_cost=prod.unit_cost,
            total_price=item_total
        ))

    sale.total_amount = round(total_amount - payload.discount_amount + payload.tax_amount, 2)
    await db.commit()
    await db.refresh(sale)

    return ApiResponse(
        success=True,
        data=SaleOut(
            id=sale.id,
            shop_id=sale.shop_id,
            invoice_number=sale.invoice_number,
            customer_name=sale.customer_name,
            total_amount=sale.total_amount,
            tax_amount=sale.tax_amount,
            discount_amount=sale.discount_amount,
            payment_method=sale.payment_method,
            status=sale.status,
            sold_at=sale.sold_at,
            items=sale_items_out
        ),
        message="Sale recorded successfully."
    )


@router.post("/import/preview", response_model=ApiResponse[SalesImportPreviewOut])
async def preview_csv_import(
    file: UploadFile = File(...),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Upload sales CSV file to validate headers, dates, and preview rows."""
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1")

    preview = await SalesImportService.preview_csv(db, shop.id, content_str)
    return ApiResponse(success=True, data=preview)


@router.post("/import/confirm", response_model=ApiResponse[dict])
async def confirm_csv_import(
    payload: SalesImportConfirmRequest,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Commit pre-validated sales CSV rows into the store database."""
    res = await SalesImportService.confirm_import(
        db=db,
        shop_id=shop.id,
        payload=payload,
        user_id=current_user.id
    )
    return ApiResponse(success=True, data=res, message=f"Successfully imported {res['sales_imported']} sales transactions.")
