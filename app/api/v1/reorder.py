from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_shop, get_current_user
from app.models.base import Shop, User, ReorderPlan, ReorderPlanItem, Product, Supplier
from app.schemas.common import ApiResponse
from app.schemas.reorder import ReorderPlanOut, ReorderPlanItemOut, ReorderGenerateRequest
from app.services.reorder_service import ReorderService

router = APIRouter(prefix="/reorder", tags=["Reorder Engine"])


@router.post("/generate", response_model=ApiResponse[ReorderPlanOut])
async def generate_plan(
    payload: ReorderGenerateRequest,
    shop: Shop = Depends(get_current_shop),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an intelligent reorder recommendation plan based on supplier lead times,
    safety stock, MOQ, case packs, and shelf-life protection.
    """
    plan = await ReorderService.generate_reorder_plan(
        db=db,
        shop_id=shop.id,
        request=payload,
        user_id=current_user.id
    )
    return ApiResponse(
        success=True,
        data=plan,
        message=f"Generated reorder plan with {len(plan.items)} recommended items."
    )


@router.get("/latest", response_model=ApiResponse[Optional[ReorderPlanOut]])
async def get_latest_plan(
    shop: Shop = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the latest saved reorder plan snapshot."""
    stmt = (
        select(ReorderPlan)
        .where(ReorderPlan.shop_id == shop.id)
        .order_by(ReorderPlan.generated_at.desc())
    )
    plan = (await db.execute(stmt)).scalars().first()
    if not plan:
        # If no saved plan, generate fresh plan with default settings
        default_req = ReorderGenerateRequest()
        fresh_plan = await ReorderService.generate_reorder_plan(db, shop.id, default_req)
        return ApiResponse(success=True, data=fresh_plan)

    # Fetch items
    i_stmt = (
        select(
            ReorderPlanItem,
            Product.name.label("p_name"),
            Product.sku.label("p_sku"),
            Product.category.label("p_cat"),
            Supplier.name.label("s_name")
        )
        .join(Product, ReorderPlanItem.product_id == Product.id)
        .outerjoin(Supplier, ReorderPlanItem.supplier_id == Supplier.id)
        .where(ReorderPlanItem.plan_id == plan.id)
        .order_by(ReorderPlanItem.priority_score.desc())
    )
    res = await db.execute(i_stmt)
    items_out = []
    for it, p_name, p_sku, p_cat, s_name in res.all():
        items_out.append(ReorderPlanItemOut(
            id=it.id,
            product_id=it.product_id,
            product_name=p_name,
            sku=p_sku,
            category=p_cat,
            supplier_id=it.supplier_id,
            supplier_name=s_name,
            current_stock=it.current_stock,
            incoming_stock=it.incoming_stock,
            lead_time_days=it.lead_time_days,
            avg_daily_demand=round(it.lead_time_demand / max(1, it.lead_time_days), 2),
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
            reason=it.reason or "",
            shelf_life_limit_applied=it.shelf_life_limit_applied
        ))

    return ApiResponse(
        success=True,
        data=ReorderPlanOut(
            id=plan.id,
            shop_id=plan.shop_id,
            status=plan.status,
            total_estimated_cost=plan.total_estimated_cost,
            total_items_count=plan.total_items_count,
            budget_limit=plan.budget_limit,
            notes=plan.notes,
            generated_at=plan.generated_at,
            items=items_out
        )
    )
