from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    category: str = "General"
    barcode: Optional[str] = None
    unit: str = "unit"
    unit_cost: float = Field(default=0.0, ge=0)
    selling_price: float = Field(default=0.0, ge=0)
    min_stock: int = Field(default=5, ge=0)
    max_stock: int = Field(default=100, ge=0)
    shelf_life_days: Optional[int] = Field(default=None, ge=1)
    lead_time_days: int = Field(default=3, ge=1)
    reorder_point: int = Field(default=10, ge=0)
    target_stock: int = Field(default=30, ge=0)
    safety_stock: int = Field(default=5, ge=0)
    moq: int = Field(default=1, ge=1)
    case_pack: int = Field(default=1, ge=1)
    preferred_supplier_id: Optional[str] = None
    notes: Optional[str] = None


class ProductCreate(ProductBase):
    initial_stock: Optional[int] = Field(default=0, ge=0)
    initial_expiry_date: Optional[datetime] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = Field(default=None, ge=0)
    selling_price: Optional[float] = Field(default=None, ge=0)
    min_stock: Optional[int] = Field(default=None, ge=0)
    max_stock: Optional[int] = Field(default=None, ge=0)
    shelf_life_days: Optional[int] = None
    lead_time_days: Optional[int] = Field(default=None, ge=1)
    reorder_point: Optional[int] = Field(default=None, ge=0)
    target_stock: Optional[int] = Field(default=None, ge=0)
    safety_stock: Optional[int] = Field(default=None, ge=0)
    moq: Optional[int] = Field(default=None, ge=1)
    case_pack: Optional[int] = Field(default=None, ge=1)
    preferred_supplier_id: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ProductOut(ProductBase):
    id: str
    shop_id: str
    is_active: bool
    stock_on_hand: int = 0
    stock_incoming: int = 0
    stock_status: str = "ok"  # ok, low, out_of_stock, overstocked
    preferred_supplier_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDetailOut(ProductOut):
    active_lots_count: int = 0
    nearest_expiry_date: Optional[datetime] = None
    recent_30d_sales: int = 0
