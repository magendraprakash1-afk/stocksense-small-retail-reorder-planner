from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop
from app.models.base import Shop
from app.schemas.common import ApiResponse
from app.schemas.forecast import ForecastOut, ForecastGenerateRequest
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecasts", tags=["Demand Forecasting"])


@router.get("", response_model=ApiResponse[List[ForecastOut]])
async def get_all_forecasts(
    horizon: int = Query(14, ge=1, le=90),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve demand forecasts across all active products."""
    forecasts = await ForecastService.generate_batch_forecasts(db, shop.id, horizon_days=horizon)
    return ApiResponse(success=True, data=forecasts)


@router.get("/product/{product_id}", response_model=ApiResponse[ForecastOut])
async def get_product_forecast(
    product_id: str,
    horizon: int = Query(14, ge=1, le=90),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve detailed demand forecast and stockout projection for a specific product."""
    forecast = await ForecastService.generate_product_forecast(db, shop.id, product_id, horizon_days=horizon)
    return ApiResponse(success=True, data=forecast)


@router.post("/generate", response_model=ApiResponse[List[ForecastOut]])
async def generate_forecasts(
    payload: ForecastGenerateRequest,
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Trigger forecast recalculation with custom horizon and backtest validation."""
    forecasts = await ForecastService.generate_batch_forecasts(
        db=db,
        shop_id=shop.id,
        product_ids=payload.product_ids,
        horizon_days=payload.horizon_days
    )
    return ApiResponse(
        success=True,
        data=forecasts,
        message=f"Generated demand forecasts for {len(forecasts)} products."
    )
