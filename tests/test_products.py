import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_products(async_client: AsyncClient):
    # Create product
    payload = {
        "sku": "TEST-SKU-001",
        "name": "Artisan Sourdough Loaf",
        "category": "Bakery",
        "unit": "loaf",
        "unit_cost": 2.50,
        "selling_price": 5.00,
        "min_stock": 5,
        "max_stock": 50,
        "shelf_life_days": 5,
        "lead_time_days": 2,
        "reorder_point": 10,
        "target_stock": 30,
        "safety_stock": 5,
        "initial_stock": 15
    }
    create_res = await async_client.post("/api/v1/products", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()["data"]
    assert created["sku"] == "TEST-SKU-001"
    assert created["stock_on_hand"] == 15

    # List products
    list_res = await async_client.get("/api/v1/products")
    assert list_res.status_code == 200
    products = list_res.json()["data"]
    assert any(p["sku"] == "TEST-SKU-001" for p in products)
