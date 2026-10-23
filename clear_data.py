"""
StockSense Management - Clear Demo Data Script
Wipes all demo products, sales, inventory lots, and purchase orders from the database,
leaving clean shop and user settings.
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.base import (
    Product, InventoryLot, InventoryMovement,
    Sale, SaleItem, PurchaseOrder, PurchaseOrderItem, Supplier
)
from sqlalchemy import delete


async def clear_database():
    async with AsyncSessionLocal() as session:
        print("Clearing demo purchase order items & purchase orders...")
        await session.execute(delete(PurchaseOrderItem))
        await session.execute(delete(PurchaseOrder))

        print("Clearing demo sales items & sales...")
        await session.execute(delete(SaleItem))
        await session.execute(delete(Sale))

        print("Clearing demo inventory movements & lots...")
        await session.execute(delete(InventoryMovement))
        await session.execute(delete(InventoryLot))

        print("Clearing demo products...")
        await session.execute(delete(Product))

        print("Clearing demo suppliers...")
        await session.execute(delete(Supplier))

        await session.commit()
        print("[OK] All demo data removed from database. System is now on a clean slate.")


if __name__ == "__main__":
    asyncio.run(clear_database())
