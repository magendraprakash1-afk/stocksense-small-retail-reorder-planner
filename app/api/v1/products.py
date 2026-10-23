import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user, require_role
from app.models.base import Shop, User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetailOut
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductOut])
async def list_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """List products with search, category filtering, and inventory status."""
    products, total = await ProductService.list_products(
        db=db,
        shop_id=shop.id,
        category=category,
        search=search,
        supplier_id=supplier_id,
        stock_status_filter=status,
        page=page,
        page_size=page_size
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedResponse(
        success=True,
        data=products,
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
    )


@router.post("", response_model=ApiResponse[ProductOut], status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new product with optional initial inventory lot."""
    prod = await ProductService.create_product(db, shop.id, payload)
    detail = await ProductService.get_product_detail(db, shop.id, prod.id)
    return ApiResponse(success=True, data=detail, message="Product created successfully.")


@router.get("/{product_id}", response_model=ApiResponse[ProductDetailOut])
async def get_product(
    product_id: str,
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve detailed product information, active lots, and 30-day velocity."""
    detail = await ProductService.get_product_detail(db, shop.id, product_id)
    return ApiResponse(success=True, data=detail)


@router.patch("/{product_id}", response_model=ApiResponse[ProductDetailOut])
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update product parameters (costs, reorder points, shelf life)."""
    await ProductService.update_product(db, shop.id, product_id, payload)
    detail = await ProductService.get_product_detail(db, shop.id, product_id)
    return ApiResponse(success=True, data=detail, message="Product updated successfully.")


@router.delete("/{product_id}", response_model=ApiResponse[dict])
async def delete_product(
    product_id: str,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db)
):
    """Soft-delete/archive a product."""
    await ProductService.soft_delete_product(db, shop.id, product_id)
    return ApiResponse(success=True, data={"id": product_id}, message="Product archived successfully.")
