from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.sales import router as sales_router
from app.api.v1.forecasts import router as forecasts_router
from app.api.v1.reorder import router as reorder_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.purchase_orders import router as po_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.reports import router as reports_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(inventory_router)
api_router.include_router(sales_router)
api_router.include_router(forecasts_router)
api_router.include_router(reorder_router)
api_router.include_router(suppliers_router)
api_router.include_router(po_router)
api_router.include_router(dashboard_router)
api_router.include_router(reports_router)
