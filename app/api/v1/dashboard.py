from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop
from app.models.base import Shop
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardSummaryOut
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=ApiResponse[DashboardSummaryOut])
async def get_summary(
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full dashboard summary: KPIs, alerts, top sellers, category distribution, sales trends."""
    data = await DashboardService.get_dashboard_summary(db, shop.id)
    return ApiResponse(success=True, data=data)


@router.get("/alerts", response_model=ApiResponse[list])
async def get_alerts(
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve active critical alerts (stockouts, low stock, imminent expiry)."""
    data = await DashboardService.get_dashboard_summary(db, shop.id)
    return ApiResponse(success=True, data=data.alerts)
