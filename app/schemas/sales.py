from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class SaleItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    lot_id: Optional[str] = None


class SaleCreate(BaseModel):
    items: List[SaleItemCreate] = Field(..., min_length=1)
    customer_name: Optional[str] = "Walk-in Customer"
    payment_method: str = "cash"
    discount_amount: float = Field(default=0.0, ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    sold_at: Optional[datetime] = None


class SaleItemOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    lot_id: Optional[str] = None
    quantity: int
    unit_price: float
    unit_cost: float
    total_price: float

    model_config = ConfigDict(from_attributes=True)


class SaleOut(BaseModel):
    id: str
    shop_id: str
    invoice_number: str
    customer_name: Optional[str]
    total_amount: float
    tax_amount: float
    discount_amount: float
    payment_method: str
    status: str
    sold_at: datetime
    items: List[SaleItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class SalesSummaryOut(BaseModel):
    period: str
    total_revenue: float
    total_transactions: int
    total_units_sold: int
    average_order_value: float
    estimated_gross_profit: float


SaleSummaryOut = SalesSummaryOut


class SalesImportRow(BaseModel):
    date: str
    sku: str
    product_name: Optional[str] = None
    quantity: int
    unit_price: Optional[float] = None
    customer: Optional[str] = None


class SalesImportPreviewOut(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    unmatched_skus: List[str] = []
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    sample_valid_rows: List[dict] = []
    errors: List[str] = []


class SalesImportConfirmRequest(BaseModel):
    rows: List[dict]
    auto_create_missing_products: bool = False
    default_cost_ratio: float = 0.7  # If auto-creating products, default cost is 70% of price
    deduct_inventory: bool = False  # Historical import shouldn't deplete today's physical stock by default
