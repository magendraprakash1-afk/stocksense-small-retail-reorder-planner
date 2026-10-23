from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class StockAdjustmentCreate(BaseModel):
    product_id: str
    adjustment_type: str = Field(..., description="manual_in, manual_out, waste_expired, damage, return")
    quantity: int = Field(..., gt=0, description="Absolute quantity to adjust")
    direction: str = Field("increase", description="increase or decrease")
    lot_id: Optional[str] = None
    reason: Optional[str] = "Physical count adjustment"


class InventoryLotOut(BaseModel):
    id: str
    shop_id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    lot_number: str
    quantity_received: int
    quantity_remaining: int
    unit_cost: float
    received_at: datetime
    expiry_date: Optional[datetime] = None
    status: str
    days_to_expiry: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryMovementOut(BaseModel):
    id: str
    shop_id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    lot_id: Optional[str] = None
    movement_type: str
    quantity_delta: int
    quantity_before: int
    quantity_after: int
    unit_cost: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpiryAlertOut(BaseModel):
    product_id: str
    product_name: str
    sku: str
    lot_id: str
    lot_number: str
    quantity_remaining: int
    expiry_date: datetime
    days_to_expiry: int
    status: str  # critical (< 7d), warning (< 30d), expired (< 0d)
    potential_loss: float


class InventorySummaryOut(BaseModel):
    total_sku_count: int
    total_quantity_on_hand: int
    total_inventory_valuation: float
    low_stock_count: int
    out_of_stock_count: int
    expiring_soon_count: int  # within 30 days
    expired_count: int
