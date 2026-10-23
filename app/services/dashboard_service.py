from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.base import Product, Sale, SaleItem, InventoryLot, PurchaseOrder, ReorderPlan
from app.schemas.dashboard import DashboardSummaryOut, DashboardKPIs, DashboardAlertItem
from app.services.inventory_service import InventoryService


class DashboardService:
    @staticmethod
    async def get_dashboard_summary(db: AsyncSession, shop_id: str) -> DashboardSummaryOut:
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
        seven_days_ago = now - timedelta(days=7)

        # 1. Total products
        p_res = await db.execute(select(func.count(Product.id)).where(Product.shop_id == shop_id, Product.is_active == True))
        total_products = p_res.scalar() or 0

        # 2. Inventory stats
        inv_summary = await InventoryService.get_inventory_summary(db, shop_id)

        # 3. Pending reorders count
        po_res = await db.execute(
            select(func.count(PurchaseOrder.id)).where(
                PurchaseOrder.shop_id == shop_id,
                PurchaseOrder.status.in_(["draft", "submitted", "partially_received"])
            )
        )
        pending_reorders = po_res.scalar() or 0

        # 4. Sales today
        today_sales_res = await db.execute(
            select(
                func.coalesce(func.sum(Sale.total_amount), 0.0),
                func.count(Sale.id)
            ).where(Sale.shop_id == shop_id, Sale.sold_at >= today_start, Sale.status == "completed")
        )
        today_rev, today_orders = today_sales_res.first() or (0.0, 0)

        # 5. 7d revenue
        rev_7d_res = await db.execute(
            select(func.coalesce(func.sum(Sale.total_amount), 0.0)).where(
                Sale.shop_id == shop_id,
                Sale.sold_at >= seven_days_ago,
                Sale.status == "completed"
            )
        )
        rev_7d = rev_7d_res.scalar() or 0.0

        kpis = DashboardKPIs(
            total_products=total_products,
            total_inventory_value=inv_summary.total_inventory_valuation,
            total_stock_units=inv_summary.total_quantity_on_hand,
            low_stock_count=inv_summary.low_stock_count,
            out_of_stock_count=inv_summary.out_of_stock_count,
            expiring_soon_count=inv_summary.expiring_soon_count,
            pending_reorders_count=pending_reorders,
            today_sales_revenue=round(float(today_rev), 2),
            today_orders_count=float(today_orders),
            recent_7d_revenue=round(float(rev_7d), 2),
        )

        # Alerts
        alerts: List[DashboardAlertItem] = []
        # Expiry alerts
        expiry_alerts = await InventoryService.get_expiry_alerts(db, shop_id, days_threshold=14)
        for ea in expiry_alerts[:5]:
            severity = "critical" if ea.days_to_expiry <= 3 else "warning"
            alerts.append(DashboardAlertItem(
                id=f"exp-{ea.lot_id}",
                type="expiring",
                severity=severity,
                title=f"Expiring Lot: {ea.product_name}",
                message=f"{ea.quantity_remaining} units in lot {ea.lot_number} expire in {ea.days_to_expiry} days.",
                product_id=ea.product_id,
                timestamp=now
            ))

        # Out-of-stock & low-stock products
        prod_stmt = select(Product).where(Product.shop_id == shop_id, Product.is_active == True)
        prods = (await db.execute(prod_stmt)).scalars().all()
        for p in prods:
            stock = await InventoryService.get_stock_on_hand(db, shop_id, p.id)
            if stock == 0:
                alerts.append(DashboardAlertItem(
                    id=f"stockout-{p.id}",
                    type="stockout",
                    severity="critical",
                    title=f"Stockout Alert: {p.name}",
                    message=f"0 units on hand! Reorder point is {p.reorder_point}.",
                    product_id=p.id,
                    timestamp=now
                ))
            elif stock <= p.reorder_point and len(alerts) < 10:
                alerts.append(DashboardAlertItem(
                    id=f"low-{p.id}",
                    type="low_stock",
                    severity="warning",
                    title=f"Low Stock: {p.name}",
                    message=f"Only {stock} units left on hand (Reorder threshold: {p.reorder_point}).",
                    product_id=p.id,
                    timestamp=now
                ))

        # Top selling products (last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        top_stmt = (
            select(Product.name, Product.sku, func.sum(SaleItem.quantity).label("units_sold"), func.sum(SaleItem.total_price).label("revenue"))
            .join(SaleItem, Product.id == SaleItem.product_id)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.shop_id == shop_id, Sale.sold_at >= thirty_days_ago, Sale.status == "completed")
            .group_by(Product.id, Product.name, Product.sku)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(5)
        )
        top_rows = (await db.execute(top_stmt)).all()
        top_selling = [{"name": r[0], "sku": r[1], "units_sold": int(r[2]), "revenue": round(float(r[3]), 2)} for r in top_rows]

        # Category distribution
        cat_stmt = (
            select(Product.category, func.count(Product.id))
            .where(Product.shop_id == shop_id, Product.is_active == True)
            .group_by(Product.category)
        )
        cat_rows = (await db.execute(cat_stmt)).all()
        category_dist = [{"category": r[0], "count": int(r[1])} for r in cat_rows]

        # Sales trend (last 7 days)
        trend_stmt = (
            select(func.date(Sale.sold_at).label("sale_date"), func.sum(Sale.total_amount).label("daily_total"))
            .where(Sale.shop_id == shop_id, Sale.sold_at >= seven_days_ago, Sale.status == "completed")
            .group_by(func.date(Sale.sold_at))
            .order_by(func.date(Sale.sold_at).asc())
        )
        trend_rows = (await db.execute(trend_stmt)).all()
        trend_dict = {str(r[0]): round(float(r[1]), 2) for r in trend_rows}

        sales_trend_7d = []
        for i in range(7):
            d = (now - timedelta(days=6 - i)).date().strftime("%Y-%m-%d")
            sales_trend_7d.append({"date": d, "revenue": trend_dict.get(d, 0.0)})

        return DashboardSummaryOut(
            kpis=kpis,
            alerts=alerts[:8],
            top_selling_products=top_selling,
            category_distribution=category_dist,
            sales_trend_7d=sales_trend_7d
        )
