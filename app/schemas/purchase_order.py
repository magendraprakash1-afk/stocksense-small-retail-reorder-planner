from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class POItemCreate(BaseModel):
    product_id: str
    quantity_ordered: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)


class POCreate(BaseModel):
    supplier_id: str
    items: List[POItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None


class POItemOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity_ordered: int
    quantity_received: int
    unit_cost: float
    total_cost: float

    model_config = ConfigDict(from_attributes=True)


class POOut(BaseModel):
    id: str
    shop_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    order_number: str
    status: str
    total_amount: float
    notes: Optional[str]
    ordered_at: datetime
    expected_delivery_date: Optional[datetime]
    actual_delivery_date: Optional[datetime]
    items: List[POItemOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class POReceiveItem(BaseModel):
    item_id: str
    quantity_received: int = Field(..., gt=0)
    expiry_date: Optional[datetime] = None
    lot_number: Optional[str] = None


class POReceiveRequest(BaseModel):
    items: List[POReceiveItem] = Field(..., min_length=1)
    notes: Optional[str] = "Goods received into stock"
