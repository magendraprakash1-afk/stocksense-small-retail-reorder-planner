from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ShopOut, ShopCreate
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetailOut
from app.schemas.inventory import (
    StockAdjustmentCreate, InventoryLotOut, InventoryMovementOut,
    ExpiryAlertOut, InventorySummaryOut
)
from app.schemas.sales import (
    SaleCreate, SaleItemCreate, SaleOut, SaleSummaryOut,
    SalesImportPreviewOut, SalesImportConfirmRequest
)
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierOut, ProductSupplierLinkCreate
)
from app.schemas.purchase_order import (
    POCreate, POItemCreate, POOut, POReceiveRequest
)
from app.schemas.forecast import (
    ForecastOut, ForecastGenerateRequest, ForecastDailyPoint
)
from app.schemas.reorder import (
    ReorderPlanOut, ReorderPlanItemOut, ReorderGenerateRequest
)
from app.schemas.dashboard import (
    DashboardSummaryOut, DashboardAlertItem, DashboardKPIs
)

__all__ = [
    "ApiResponse",
    "PaginatedResponse",
    "PaginationMeta",
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "UserOut",
    "ShopOut",
    "ShopCreate",
    "ProductCreate",
    "ProductUpdate",
    "ProductOut",
    "ProductDetailOut",
    "StockAdjustmentCreate",
    "InventoryLotOut",
    "InventoryMovementOut",
    "ExpiryAlertOut",
    "InventorySummaryOut",
    "SaleCreate",
    "SaleItemCreate",
    "SaleOut",
    "SaleSummaryOut",
    "SalesImportPreviewOut",
    "SalesImportConfirmRequest",
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierOut",
    "ProductSupplierLinkCreate",
    "POCreate",
    "POItemCreate",
    "POOut",
    "POReceiveRequest",
    "ForecastOut",
    "ForecastGenerateRequest",
    "ForecastDailyPoint",
    "ReorderPlanOut",
    "ReorderPlanItemOut",
    "ReorderGenerateRequest",
    "DashboardSummaryOut",
    "DashboardAlertItem",
    "DashboardKPIs",
]
