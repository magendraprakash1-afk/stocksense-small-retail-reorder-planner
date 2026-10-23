import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.base import Product, Supplier, ReorderPlan, ReorderPlanItem
from app.schemas.reorder import ReorderGenerateRequest, ReorderPlanOut, ReorderPlanItemOut
from app.services.inventory_service import InventoryService
from app.services.forecast_service import ForecastService, ForecastEngine


class ReorderService:
    @classmethod
    async def generate_reorder_plan(
        cls,
        db: AsyncSession,
        shop_id: str,
        request: ReorderGenerateRequest,
        user_id: Optional[str] = None
    ) -> ReorderPlanOut:
        """
        Executes the 9-Step Reorder Calculation Pipeline:
        1. Net Stock Position = On-Hand + Confirmed Incoming - Expired
        2. Lead-Time Demand = sum(daily forecast over lead_time)
        3. Safety Stock = z * sigma_daily * sqrt(lead_time)
        4. Reorder Point = Lead-Time Demand + Safety Stock
        5. Target Stock = Lead-Time Demand + Safety Stock (+ review period demand)
        6. Raw Order Qty = max(0, Target Stock - Net Stock Position)
        7. Constraints: Case pack, MOQ, Shelf-Life Cap, Budget Allocation
        8. Priority Score & Urgency Ranking
        9. Persist ReorderPlan & ReorderPlanItems
        """
        # Fetch active products & preferred suppliers
        stmt = (
            select(Product, Supplier.name.label("supplier_name"))
            .outerjoin(Supplier, Product.preferred_supplier_id == Supplier.id)
            .where(Product.shop_id == shop_id, Product.is_active == True)
        )
        res = await db.execute(stmt)
        products_with_suppliers = res.all()

        z_score = 1.65 if request.service_level >= 0.95 else 1.28  # 95% or 90% SL
        items_out: List[ReorderPlanItemOut] = []

        for prod, s_name in products_with_suppliers:
            # Step 1: Net Stock Position
            on_hand = await InventoryService.get_stock_on_hand(db, shop_id, prod.id)
            incoming = await InventoryService.get_incoming_stock(db, shop_id, prod.id)
            net_stock = on_hand + incoming

            # Step 2: Historical sales & forecast
            history = await ForecastEngine.get_daily_sales_series(db, shop_id, prod.id, lookback_days=60)
            fit = ForecastEngine.fit_and_predict(history, horizon_days=max(14, prod.lead_time_days * 2))
            avg_daily = max(0.2, fit["avg_daily_demand"])
            sigma_daily = fit["sigma"]

            lead_time = max(1, prod.lead_time_days)
            lead_time_demand = round(avg_daily * lead_time, 2)

            # Step 3: Safety Stock
            if request.include_safety_stock:
                if sigma_daily > 0:
                    calculated_safety = math.ceil(z_score * sigma_daily * math.sqrt(lead_time))
                else:
                    calculated_safety = math.ceil(avg_daily * prod.safety_stock)
                safety_stock = max(prod.safety_stock, calculated_safety)
            else:
                safety_stock = 0

            # Step 4: Reorder Point
            reorder_point = math.ceil(lead_time_demand + safety_stock)

            # Step 5: Target Stock
            # Target stock covers lead time + safety stock + cycle stock (approx 7 days or review period)
            review_cycle_days = 7
            cycle_demand = avg_daily * review_cycle_days
            target_stock = math.ceil(lead_time_demand + safety_stock + cycle_demand)
            if prod.target_stock > target_stock:
                target_stock = prod.target_stock

            # Step 6: Raw Order Qty
            raw_order = max(0, target_stock - net_stock)

            # Check if order is triggered
            is_below_reorder = net_stock <= reorder_point
            if not is_below_reorder and raw_order == 0:
                continue  # stock level is comfortable, no reorder needed

            # Step 7: Apply constraints
            order_qty = raw_order
            shelf_life_capped = False

            # Constraint: Shelf-Life Cap
            # If product has a shelf life, never order more than what can sell before expiry
            if request.shelf_life_protection and prod.shelf_life_days:
                max_sellable_units = math.floor(avg_daily * prod.shelf_life_days * 0.8)
                if order_qty > max_sellable_units:
                    order_qty = max(0, max_sellable_units)
                    shelf_life_capped = True

            # Constraint: MOQ (Minimum Order Quantity)
            if request.enforce_moq and prod.moq > 1 and order_qty > 0:
                if order_qty < prod.moq:
                    order_qty = prod.moq

            # Constraint: Case Pack Size (round up to nearest multiple)
            if request.enforce_case_pack and prod.case_pack > 1 and order_qty > 0:
                remainder = order_qty % prod.case_pack
                if remainder != 0:
                    order_qty += (prod.case_pack - remainder)

            if order_qty <= 0:
                continue

            # Step 8: Priority Score & Urgency
            # Days of stock left
            days_of_stock = round(net_stock / avg_daily, 1) if avg_daily > 0 else 999.0
            stockout_risk_days = max(0.0, round(days_of_stock - lead_time, 1))

            # Margin ratio
            margin = max(0.1, prod.selling_price - prod.unit_cost)
            margin_ratio = min(1.0, margin / (prod.selling_price or 1.0))

            # Priority Score (0 to 100)
            # Higher score = higher urgency
            if net_stock == 0:
                urgency = "critical"
                priority_score = 95.0 + (margin_ratio * 5.0)
                reason = "Out of stock! Immediate stockout occurring."
            elif days_of_stock <= lead_time:
                urgency = "critical"
                priority_score = 85.0 + (10.0 * (1.0 - (days_of_stock / max(1.0, lead_time))))
                reason = f"Stockout predicted before replenishment arrives (Stock left: {days_of_stock}d, Lead time: {lead_time}d)."
            elif net_stock <= reorder_point:
                urgency = "high"
                priority_score = 65.0 + (15.0 * margin_ratio)
                reason = f"Stock ({net_stock}) is below reorder point ({reorder_point})."
            else:
                urgency = "medium"
                priority_score = 40.0 + (10.0 * margin_ratio)
                reason = f"Replenishment advised to meet target inventory ({target_stock})."

            total_item_cost = round(order_qty * prod.unit_cost, 2)

            item = ReorderPlanItemOut(
                product_id=prod.id,
                product_name=prod.name,
                sku=prod.sku,
                category=prod.category,
                supplier_id=prod.preferred_supplier_id,
                supplier_name=s_name,
                current_stock=on_hand,
                incoming_stock=incoming,
                lead_time_days=lead_time,
                avg_daily_demand=round(avg_daily, 2),
                lead_time_demand=lead_time_demand,
                safety_stock=safety_stock,
                reorder_point=reorder_point,
                target_stock=target_stock,
                suggested_qty=order_qty,
                approved_qty=order_qty,
                unit_cost=prod.unit_cost,
                total_cost=total_item_cost,
                priority_score=round(priority_score, 1),
                urgency=urgency,
                stockout_risk_days=stockout_risk_days,
                reason=reason,
                shelf_life_limit_applied=shelf_life_capped
            )
            items_out.append(item)

        # Sort items descending by priority score
        items_out.sort(key=lambda x: x.priority_score, reverse=True)

        # Budget Allocation Constraint (if set)
        if request.budget_limit and request.budget_limit > 0:
            accumulated_budget = 0.0
            for item in items_out:
                if accumulated_budget + item.total_cost <= request.budget_limit:
                    accumulated_budget += item.total_cost
                else:
                    # Partial allocate or zero out
                    remaining_budget = max(0.0, request.budget_limit - accumulated_budget)
                    affordable_units = math.floor(remaining_budget / (item.unit_cost or 1.0))
                    item.approved_qty = affordable_units
                    item.total_cost = round(affordable_units * item.unit_cost, 2)
                    accumulated_budget += item.total_cost

        # Step 9: Persist snapshot into database
        plan_total_cost = sum(i.total_cost for i in items_out)
        plan_rec = ReorderPlan(
            shop_id=shop_id,
            status="draft",
            total_estimated_cost=round(plan_total_cost, 2),
            total_items_count=len(items_out),
            budget_limit=request.budget_limit,
            created_by_user_id=user_id,
            generated_at=datetime.now(timezone.utc)
        )
        db.add(plan_rec)
        await db.flush()

        for it in items_out:
            plan_item = ReorderPlanItem(
                plan_id=plan_rec.id,
                product_id=it.product_id,
                supplier_id=it.supplier_id,
                current_stock=it.current_stock,
                incoming_stock=it.incoming_stock,
                lead_time_days=it.lead_time_days,
                lead_time_demand=it.lead_time_demand,
                safety_stock=it.safety_stock,
                reorder_point=it.reorder_point,
                target_stock=it.target_stock,
                suggested_qty=it.suggested_qty,
                approved_qty=it.approved_qty,
                unit_cost=it.unit_cost,
                total_cost=it.total_cost,
                priority_score=it.priority_score,
                urgency=it.urgency,
                stockout_risk_days=it.stockout_risk_days,
                reason=it.reason,
                shelf_life_limit_applied=it.shelf_life_limit_applied,
            )
            db.add(plan_item)
            it.id = plan_item.id

        await db.commit()

        return ReorderPlanOut(
            id=plan_rec.id,
            shop_id=shop_id,
            status=plan_rec.status,
            total_estimated_cost=plan_rec.total_estimated_cost,
            total_items_count=plan_rec.total_items_count,
            budget_limit=plan_rec.budget_limit,
            notes=plan_rec.notes,
            generated_at=plan_rec.generated_at,
            items=items_out
        )
