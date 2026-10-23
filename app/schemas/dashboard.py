from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    total_products: int
    total_inventory_value: float
    total_stock_units: int
    low_stock_count: int
    out_of_stock_count: int
    expiring_soon_count: int
    pending_reorders_count: int
    today_sales_revenue: float
    today_orders_count: float
    recent_7d_revenue: float


class DashboardAlertItem(BaseModel):
    id: str
    type: str  # stockout, low_stock, expiring, delayed_po
    severity: str  # critical, warning, info
    title: str
    message: str
    product_id: Optional[str] = None
    supplier_id: Optional[str] = None
    timestamp: datetime


class DashboardSummaryOut(BaseModel):
    kpis: DashboardKPIs
    alerts: List[DashboardAlertItem]
    top_selling_products: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    sales_trend_7d: List[Dict[str, Any]]
