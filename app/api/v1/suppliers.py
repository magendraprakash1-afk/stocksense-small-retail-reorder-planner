from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user
from app.models.base import Shop, User
from app.schemas.common import ApiResponse
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=ApiResponse[List[SupplierOut]])
async def list_suppliers(
    search: Optional[str] = Query(None),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """List active suppliers with product counts and active PO counts."""
    suppliers = await SupplierService.list_suppliers(db, shop.id, search=search)
    return ApiResponse(success=True, data=suppliers)


@router.post("", response_model=ApiResponse[SupplierOut], status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a new supplier."""
    supplier = await SupplierService.create_supplier(db, shop.id, payload)
    suppliers = await SupplierService.list_suppliers(db, shop.id, search=supplier.name)
    out = suppliers[0] if suppliers else None
    return ApiResponse(success=True, data=out, message="Supplier created successfully.")


@router.patch("/{supplier_id}", response_model=ApiResponse[SupplierOut])
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update supplier contact info, lead time, or payment terms."""
    await SupplierService.update_supplier(db, shop.id, supplier_id, payload)
    suppliers = await SupplierService.list_suppliers(db, shop.id)
    out = next((s for s in suppliers if s.id == supplier_id), None)
    return ApiResponse(success=True, data=out, message="Supplier updated successfully.")
