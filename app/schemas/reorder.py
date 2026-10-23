from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ReorderPlanItemOut(BaseModel):
    id: Optional[str] = None
    product_id: str
    product_name: str
    sku: str
    category: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    current_stock: int
    incoming_stock: int
    lead_time_days: int
    avg_daily_demand: float
    lead_time_demand: float
    safety_stock: int
    reorder_point: int
    target_stock: int
    suggested_qty: int
    approved_qty: int
    unit_cost: float
    total_cost: float
    priority_score: float
    urgency: str  # critical, high, medium, low
    stockout_risk_days: Optional[float] = None
    reason: str
    shelf_life_limit_applied: bool = False


class ReorderPlanOut(BaseModel):
    id: str
    shop_id: str
    status: str
    total_estimated_cost: float
    total_items_count: int
    budget_limit: Optional[float] = None
    notes: Optional[str] = None
    generated_at: datetime
    items: List[ReorderPlanItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class ReorderGenerateRequest(BaseModel):
    budget_limit: Optional[float] = Field(default=None, ge=0)
    service_level: float = Field(default=0.95, ge=0.5, le=0.99)
    include_safety_stock: bool = True
    enforce_moq: bool = True
    enforce_case_pack: bool = True
    shelf_life_protection: bool = True
