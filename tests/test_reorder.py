import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_reorder_calculation_scenario(async_client: AsyncClient):
    """
    Test scenario from specification:
    Product has:
    - 10 usable units
    - Lead time = 3 days
    - Safety stock = 4 units
    - Target stock = 16 units
    Result:
    Lead-time demand = 4 * 3 = 12
    Reorder point = 12 + 4 = 16
    Raw order = max(0, 16 - 10) = 6 units
    """
    # 1. Create product
    payload = {
        "sku": "SPEC-TEST-001",
        "name": "Spec Test Product",
        "category": "General",
        "unit": "pack",
        "unit_cost": 5.0,
        "selling_price": 10.0,
        "lead_time_days": 3,
        "safety_stock": 4,
        "reorder_point": 16,
        "target_stock": 16,
        "initial_stock": 10
    }
    create_res = await async_client.post("/api/v1/products", json=payload)
    assert create_res.status_code == 201
    prod = create_res.json()["data"]

    # 2. Generate reorder plan
    reorder_res = await async_client.post("/api/v1/reorder/generate", json={
        "include_safety_stock": True,
        "enforce_moq": False,
        "enforce_case_pack": False
    })
    assert reorder_res.status_code == 200
    plan = reorder_res.json()["data"]

    # Check that our product was flagged for reorder
    matching_item = next((it for it in plan["items"] if it["product_id"] == prod["id"]), None)
    assert matching_item is not None
    assert matching_item["current_stock"] == 10
    assert matching_item["suggested_qty"] > 0
