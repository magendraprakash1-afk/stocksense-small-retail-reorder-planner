from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ForecastDailyPoint(BaseModel):
    date: str
    predicted: float
    lower: float
    upper: float


class ForecastOut(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category: str
    forecast_date: str
    horizon_days: int
    daily_forecasts: List[ForecastDailyPoint]
    total_forecasted_units: float
    avg_daily_demand: float
    lead_time_days: int
    lead_time_demand: float
    model_name: str
    model_version: str
    training_days_used: int
    metrics: Dict[str, Any] = {}
    stockout_predicted_date: Optional[str] = None
    days_until_stockout: Optional[float] = None


class ForecastGenerateRequest(BaseModel):
    product_ids: Optional[List[str]] = None
    horizon_days: int = Field(default=14, ge=1, le=90)
    include_backtest: bool = True
