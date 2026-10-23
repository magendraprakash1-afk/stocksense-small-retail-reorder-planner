import pytest
# pyrefly: ignore[missing-import]
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.base import User, Shop, ShopMember

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


import uuid

@pytest_asyncio.fixture
async def test_user_and_shop(db_session: AsyncSession):
    u_suffix = uuid.uuid4().hex[:8]
    user = User(
        name=f"Test Owner {u_suffix}",
        email=f"owner_{u_suffix}@test.com",
        password_hash=get_password_hash("testpass123"),
        role="owner",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    shop = Shop(
        name="Test Store",
        currency="USD",
        timezone="UTC",
        owner_id=user.id
    )
    db_session.add(shop)
    await db_session.flush()

    membership = ShopMember(
        shop_id=shop.id,
        user_id=user.id,
        role="owner"
    )
    db_session.add(membership)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(shop)

    token = create_access_token(subject=user.id, shop_id=shop.id, role=user.role)
    return {"user": user, "shop": shop, "token": token}


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession, test_user_and_shop) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    headers = {
        "Authorization": f"Bearer {test_user_and_shop['token']}",
        "X-Shop-Id": test_user_and_shop["shop"].id
    }
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        yield ac

    app.dependency_overrides.clear()
