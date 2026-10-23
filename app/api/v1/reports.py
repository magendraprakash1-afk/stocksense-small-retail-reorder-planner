from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop
from app.models.base import Shop, Sale, SaleItem, Product, InventoryLot
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/sales", response_model=ApiResponse[Dict[str, Any]])
async def get_sales_report(
    days: int = Query(30, ge=7, le=365),
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Sales analytics aggregated daily with revenue, order count, and gross profit."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(
            func.date(Sale.sold_at).label("sale_date"),
            func.sum(Sale.total_amount).label("revenue"),
            func.count(Sale.id).label("orders"),
            func.sum(SaleItem.quantity).label("units"),
            func.sum(SaleItem.unit_cost * SaleItem.quantity).label("cost")
        )
        .join(SaleItem, Sale.id == SaleItem.sale_id)
        .where(Sale.shop_id == shop.id, Sale.sold_at >= since, Sale.status == "completed")
        .group_by(func.date(Sale.sold_at))
        .order_by(func.date(Sale.sold_at).asc())
    )
    rows = (await db.execute(stmt)).all()

    daily_data = []
    total_rev = 0.0
    total_cost = 0.0
    total_units = 0

    for r in rows:
        rev = float(r[1] or 0.0)
        c = float(r[4] or 0.0)
        u = int(r[3] or 0)
        profit = rev - c
        margin = (profit / rev * 100) if rev > 0 else 0.0

        total_rev += rev
        total_cost += c
        total_units += u

        daily_data.append({
            "date": str(r[0]),
            "revenue": round(rev, 2),
            "orders": int(r[2]),
            "units": u,
            "cost": round(c, 2),
            "gross_profit": round(profit, 2),
            "margin_percent": round(margin, 1)
        })

    net_profit = total_rev - total_cost
    overall_margin = (net_profit / total_rev * 100) if total_rev > 0 else 0.0

    return ApiResponse(
        success=True,
        data={
            "period_days": days,
            "total_revenue": round(total_rev, 2),
            "total_cost": round(total_cost, 2),
            "gross_profit": round(net_profit, 2),
            "overall_margin_percent": round(overall_margin, 1),
            "total_units_sold": total_units,
            "daily_breakdown": daily_data
        }
    )


@router.get("/inventory-valuation", response_model=ApiResponse[Dict[str, Any]])
async def get_valuation_report(
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Inventory valuation grouped by product category."""
    stmt = (
        select(
            Product.category,
            func.count(Product.id.distinct()).label("sku_count"),
            func.coalesce(func.sum(InventoryLot.quantity_remaining), 0).label("units"),
            func.coalesce(func.sum(InventoryLot.quantity_remaining * InventoryLot.unit_cost), 0.0).label("valuation"),
            func.coalesce(func.sum(InventoryLot.quantity_remaining * Product.selling_price), 0.0).label("retail_value")
        )
        .outerjoin(InventoryLot, and_(Product.id == InventoryLot.product_id, InventoryLot.status == "active"))
        .where(Product.shop_id == shop.id, Product.is_active == True)
        .group_by(Product.category)
    )
    rows = (await db.execute(stmt)).all()

    categories = []
    total_val = 0.0
    total_retail = 0.0
    total_units = 0

    for r in rows:
        val = float(r[3] or 0.0)
        ret = float(r[4] or 0.0)
        u = int(r[2] or 0)
        total_val += val
        total_retail += ret
        total_units += u

        categories.append({
            "category": r[0],
            "sku_count": int(r[1]),
            "units_on_hand": u,
            "cost_valuation": round(val, 2),
            "retail_valuation": round(ret, 2),
            "potential_profit": round(ret - val, 2)
        })

    return ApiResponse(
        success=True,
        data={
            "total_cost_valuation": round(total_val, 2),
            "total_retail_valuation": round(total_retail, 2),
            "total_units_on_hand": total_units,
            "categories": categories
        }
    )
