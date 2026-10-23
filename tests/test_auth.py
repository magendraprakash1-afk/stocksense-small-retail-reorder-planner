import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_register_and_login(async_client: AsyncClient):
    # Register new user
    reg_payload = {
        "name": "Jane Doe",
        "email": "jane@retailer.com",
        "password": "securepassword123",
        "shop_name": "Jane's Corner Grocery",
        "currency": "USD"
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert "access_token" in reg_data["data"]

    # Login
    login_payload = {
        "email": "jane@retailer.com",
        "password": "securepassword123"
    }
    login_res = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "access_token" in login_data["data"]
