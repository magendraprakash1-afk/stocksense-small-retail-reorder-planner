from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = Field(default=3, ge=1)
    min_order_value: float = Field(default=0.0, ge=0)
    payment_terms: Optional[str] = "Net 30"
    rating: float = Field(default=5.0, ge=0.0, le=5.0)


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = Field(default=None, ge=1)
    min_order_value: Optional[float] = Field(default=None, ge=0)
    payment_terms: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    is_active: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: str
    shop_id: str
    is_active: bool
    products_count: int = 0
    active_po_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductSupplierLinkCreate(BaseModel):
    supplier_id: str
    supplier_sku: Optional[str] = None
    lead_time_days: int = Field(default=3, ge=1)
    moq: int = Field(default=1, ge=1)
    case_pack: int = Field(default=1, ge=1)
    unit_cost: float = Field(default=0.0, ge=0)
    is_preferred: bool = False
