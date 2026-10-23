from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user
from app.models.base import Shop, User, InventoryLot, InventoryMovement, Product
from app.schemas.common import ApiResponse
from app.schemas.inventory import (
    StockAdjustmentCreate, InventoryLotOut, InventoryMovementOut,
    ExpiryAlertOut, InventorySummaryOut
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/summary", response_model=ApiResponse[InventorySummaryOut])
async def get_summary(
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Get high-level inventory metrics: SKUs, on-hand count, total valuation, alerts."""
    summary = await InventoryService.get_inventory_summary(db, shop.id)
    return ApiResponse(success=True, data=summary)


@router.post("/adjustments", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    payload: StockAdjustmentCreate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply manual stock adjustment with auditable ledger trail."""
    movement = await InventoryService.apply_adjustment(
        db=db,
        shop_id=shop.id,
        adjustment=payload,
        user_id=current_user.id
    )
    new_stock = await InventoryService.get_stock_on_hand(db, shop.id, payload.product_id)
    return ApiResponse(
        success=True,
        data={
            "product_id": payload.product_id,
            "new_stock_on_hand": new_stock,
            "movement_id": movement.id
        },
        message="Inventory adjustment recorded successfully."
    )


@router.get("/lots", response_model=ApiResponse[List[InventoryLotOut]])
async def list_lots(
    product_id: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve inventory lots with expiry tracking."""
    stmt = (
        select(InventoryLot, Product.name.label("p_name"), Product.sku.label("p_sku"))
        .join(Product, InventoryLot.product_id == Product.id)
        .where(InventoryLot.shop_id == shop.id)
    )
    if product_id:
        stmt = stmt.where(InventoryLot.product_id == product_id)
    if status and status != "all":
        stmt = stmt.where(InventoryLot.status == status)
    
    stmt = stmt.order_by(InventoryLot.expiry_date.asc().nullslast(), InventoryLot.received_at.desc())
    res = await db.execute(stmt)
    rows = res.all()

    lots_out = []
    for lot, p_name, p_sku in rows:
        lots_out.append(InventoryLotOut(
            id=lot.id,
            shop_id=lot.shop_id,
            product_id=lot.product_id,
            product_name=p_name,
            product_sku=p_sku,
            lot_number=lot.lot_number,
            quantity_received=lot.quantity_received,
            quantity_remaining=lot.quantity_remaining,
            unit_cost=lot.unit_cost,
            received_at=lot.received_at,
            expiry_date=lot.expiry_date,
            status=lot.status
        ))
    return ApiResponse(success=True, data=lots_out)


@router.get("/movements", response_model=ApiResponse[List[InventoryMovementOut]])
async def list_movements(
    product_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve immutable audit ledger of stock movements."""
    stmt = (
        select(InventoryMovement, Product.name.label("p_name"), Product.sku.label("p_sku"))
        .join(Product, InventoryMovement.product_id == Product.id)
        .where(InventoryMovement.shop_id == shop.id)
    )
    if product_id:
        stmt = stmt.where(InventoryMovement.product_id == product_id)

    stmt = stmt.order_by(InventoryMovement.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    rows = res.all()

    movements_out = []
    for m, p_name, p_sku in rows:
        movements_out.append(InventoryMovementOut(
            id=m.id,
            shop_id=m.shop_id,
            product_id=m.product_id,
            product_name=p_name,
            product_sku=p_sku,
            lot_id=m.lot_id,
            movement_type=m.movement_type,
            quantity_delta=m.quantity_delta,
            quantity_before=m.quantity_before,
            quantity_after=m.quantity_after,
            unit_cost=m.unit_cost,
            reference_type=m.reference_type,
            reference_id=m.reference_id,
            reason=m.reason,
            created_at=m.created_at
        ))
    return ApiResponse(success=True, data=movements_out)


@router.get("/expiry-alerts", response_model=ApiResponse[List[ExpiryAlertOut]])
async def get_expiry_alerts(
    days: int = Query(30, ge=1, le=180),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Identify stock lots expiring within specified window."""
    alerts = await InventoryService.get_expiry_alerts(db, shop.id, days_threshold=days)
    return ApiResponse(success=True, data=alerts)
