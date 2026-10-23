from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user
from app.models.base import Shop, User
from app.schemas.common import ApiResponse
from app.schemas.purchase_order import POCreate, POOut, POReceiveRequest
from app.services.purchase_order_service import PurchaseOrderService

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("", response_model=ApiResponse[List[POOut]])
async def list_orders(
    status: Optional[str] = Query(None),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """List purchase orders with line items and delivery status."""
    orders = await PurchaseOrderService.list_orders(db, shop.id, status_filter=status)
    return ApiResponse(success=True, data=orders)


@router.post("", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: POCreate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new purchase order for a supplier."""
    po = await PurchaseOrderService.create_order(
        db=db,
        shop_id=shop.id,
        payload=payload,
        user_id=current_user.id
    )
    return ApiResponse(
        success=True,
        data={"id": po.id, "order_number": po.order_number, "status": po.status, "total_amount": po.total_amount},
        message="Purchase order generated successfully."
    )


@router.post("/{order_id}/receive", response_model=ApiResponse[dict])
async def receive_order(
    order_id: str,
    payload: POReceiveRequest,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Receive items into physical inventory:
    - Atomically populates inventory lots with lot numbers & expiry dates
    - Creates stock movement audit records
    - Updates PO received status
    """
    po = await PurchaseOrderService.receive_goods(
        db=db,
        shop_id=shop.id,
        po_id=order_id,
        payload=payload,
        user_id=current_user.id
    )
    return ApiResponse(
        success=True,
        data={"id": po.id, "order_number": po.order_number, "status": po.status},
        message=f"Purchase order items successfully received into active inventory."
    )
