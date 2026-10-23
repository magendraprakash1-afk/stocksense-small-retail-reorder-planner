"""
StockSense Management - Seed Database Script
Populates the store with realistic retail data, suppliers, products,
inventory lots with shelf-life tracking, and 60 days of daily sales history.
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.core.database import init_db, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.base import (
    User, Shop, ShopMember, Supplier, Product,
    InventoryLot, InventoryMovement, Sale, SaleItem,
    PurchaseOrder, PurchaseOrderItem
)


DEMO_SUPPLIERS = [
    {
        "name": "Dairy Fresh Logistics",
        "code": "SUP-DFL",
        "contact_name": "Marcus Vance",
        "email": "marcus@dairyfresh.com",
        "phone": "+1-555-0192",
        "lead_time_days": 2,
        "min_order_value": 150.0,
        "payment_terms": "Net 15",
        "rating": 4.8
    },
    {
        "name": "Bakers Guild Distribution",
        "code": "SUP-BGD",
        "contact_name": "Elena Rostova",
        "email": "orders@bakersguild.com",
        "phone": "+1-555-0284",
        "lead_time_days": 1,
        "min_order_value": 80.0,
        "payment_terms": "Net 7",
        "rating": 4.9
    },
    {
        "name": "Global Beverage Co",
        "code": "SUP-GBC",
        "contact_name": "David Sterling",
        "email": "sales@globalbev.com",
        "phone": "+1-555-0371",
        "lead_time_days": 5,
        "min_order_value": 300.0,
        "payment_terms": "Net 30",
        "rating": 4.6
    },
    {
        "name": "Harvest Direct Produce",
        "code": "SUP-HDP",
        "contact_name": "Anita Patel",
        "email": "supply@harvestdirect.org",
        "phone": "+1-555-0459",
        "lead_time_days": 3,
        "min_order_value": 100.0,
        "payment_terms": "Net 14",
        "rating": 4.7
    }
]

DEMO_PRODUCTS = [
    {
        "sku": "DAI-MLK-001",
        "name": "Fresh Whole Milk 1 Gallon",
        "category": "Dairy",
        "unit": "jug",
        "unit_cost": 2.40,
        "selling_price": 3.99,
        "min_stock": 10,
        "max_stock": 60,
        "shelf_life_days": 7,
        "lead_time_days": 2,
        "reorder_point": 18,
        "target_stock": 45,
        "safety_stock": 8,
        "moq": 12,
        "case_pack": 6,
        "supplier_idx": 0,
        "initial_stock": 14,  # low stock
        "days_to_expiry": 4
    },
    {
        "sku": "DAI-YOG-002",
        "name": "Greek Yogurt Plain 32oz",
        "category": "Dairy",
        "unit": "tub",
        "unit_cost": 3.10,
        "selling_price": 5.49,
        "min_stock": 8,
        "max_stock": 40,
        "shelf_life_days": 14,
        "lead_time_days": 2,
        "reorder_point": 14,
        "target_stock": 35,
        "safety_stock": 6,
        "moq": 8,
        "case_pack": 4,
        "supplier_idx": 0,
        "initial_stock": 25,
        "days_to_expiry": 10
    },
    {
        "sku": "DAI-EGG-003",
        "name": "Free-Range Large Eggs 12pk",
        "category": "Dairy",
        "unit": "carton",
        "unit_cost": 2.80,
        "selling_price": 4.89,
        "min_stock": 12,
        "max_stock": 70,
        "shelf_life_days": 21,
        "lead_time_days": 2,
        "reorder_point": 20,
        "target_stock": 55,
        "safety_stock": 8,
        "moq": 15,
        "case_pack": 15,
        "supplier_idx": 0,
        "initial_stock": 8,  # Critical low stock!
        "days_to_expiry": 15
    },
    {
        "sku": "BAK-SRD-001",
        "name": "Organic Artisan Sourdough",
        "category": "Bakery",
        "unit": "loaf",
        "unit_cost": 2.60,
        "selling_price": 4.99,
        "min_stock": 6,
        "max_stock": 35,
        "shelf_life_days": 5,
        "lead_time_days": 1,
        "reorder_point": 10,
        "target_stock": 25,
        "safety_stock": 4,
        "moq": 10,
        "case_pack": 5,
        "supplier_idx": 1,
        "initial_stock": 5,  # Needs reorder
        "days_to_expiry": 2  # Expiring soon!
    },
    {
        "sku": "BAK-CRN-002",
        "name": "Butter Croissant 4-Pack",
        "category": "Bakery",
        "unit": "pack",
        "unit_cost": 3.00,
        "selling_price": 5.99,
        "min_stock": 5,
        "max_stock": 30,
        "shelf_life_days": 4,
        "lead_time_days": 1,
        "reorder_point": 8,
        "target_stock": 20,
        "safety_stock": 3,
        "moq": 6,
        "case_pack": 6,
        "supplier_idx": 1,
        "initial_stock": 12,
        "days_to_expiry": 3
    },
    {
        "sku": "BEV-COF-001",
        "name": "Medium Roast Ground Coffee 12oz",
        "category": "Beverages",
        "unit": "bag",
        "unit_cost": 6.50,
        "selling_price": 11.99,
        "min_stock": 10,
        "max_stock": 50,
        "shelf_life_days": 180,
        "lead_time_days": 5,
        "reorder_point": 15,
        "target_stock": 40,
        "safety_stock": 6,
        "moq": 10,
        "case_pack": 10,
        "supplier_idx": 2,
        "initial_stock": 28,
        "days_to_expiry": 140
    },
    {
        "sku": "BEV-WAT-002",
        "name": "Sparkling Mineral Water 750ml",
        "category": "Beverages",
        "unit": "bottle",
        "unit_cost": 1.20,
        "selling_price": 2.79,
        "min_stock": 24,
        "max_stock": 120,
        "shelf_life_days": 365,
        "lead_time_days": 5,
        "reorder_point": 36,
        "target_stock": 96,
        "safety_stock": 12,
        "moq": 24,
        "case_pack": 12,
        "supplier_idx": 2,
        "initial_stock": 42,
        "days_to_expiry": 300
    },
    {
        "sku": "PRD-APP-001",
        "name": "Honeycrisp Apples 3lb Bag",
        "category": "Produce",
        "unit": "bag",
        "unit_cost": 3.20,
        "selling_price": 5.99,
        "min_stock": 8,
        "max_stock": 45,
        "shelf_life_days": 14,
        "lead_time_days": 3,
        "reorder_point": 14,
        "target_stock": 35,
        "safety_stock": 5,
        "moq": 10,
        "case_pack": 5,
        "supplier_idx": 3,
        "initial_stock": 22,
        "days_to_expiry": 8
    },
    {
        "sku": "PRD-BAN-002",
        "name": "Organic Cavendish Bananas",
        "category": "Produce",
        "unit": "bunch",
        "unit_cost": 0.90,
        "selling_price": 1.89,
        "min_stock": 15,
        "max_stock": 80,
        "shelf_life_days": 6,
        "lead_time_days": 3,
        "reorder_point": 25,
        "target_stock": 60,
        "safety_stock": 10,
        "moq": 20,
        "case_pack": 10,
        "supplier_idx": 3,
        "initial_stock": 18,  # Low stock
        "days_to_expiry": 3
    },
    {
        "sku": "SNK-CHP-001",
        "name": "Sea Salt Kettle Cooked Chips 8oz",
        "category": "Snacks",
        "unit": "bag",
        "unit_cost": 1.90,
        "selling_price": 3.79,
        "min_stock": 12,
        "max_stock": 60,
        "shelf_life_days": 90,
        "lead_time_days": 4,
        "reorder_point": 20,
        "target_stock": 50,
        "safety_stock": 8,
        "moq": 12,
        "case_pack": 12,
        "supplier_idx": 2,
        "initial_stock": 34,
        "days_to_expiry": 75
    }
]


async def seed():
    print("[*] Starting StockSense database seeding...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(User).where(User.email == "admin@stocksense.io"))
        if res.scalar_one_or_none():
            print("[+] Database already seeded. Skipping.")
            return

        # 1. Create Default User
        admin_user = User(
            name="Alex Mercer (Store Owner)",
            email="admin@stocksense.io",
            password_hash=get_password_hash("password123"),
            role="owner",
            is_active=True
        )
        db.add(admin_user)
        await db.flush()

        # 2. Create Default Shop
        shop = Shop(
            name="Metro Retail Mart",
            currency="USD",
            timezone="America/New_York",
            owner_id=admin_user.id,
            address="452 Lexington Ave, New York, NY 10017",
            phone="+1 (212) 555-0188"
        )
        db.add(shop)
        await db.flush()

        membership = ShopMember(
            shop_id=shop.id,
            user_id=admin_user.id,
            role="owner"
        )
        db.add(membership)
        await db.flush()

        # 3. Create Suppliers
        created_suppliers = []
        for s_data in DEMO_SUPPLIERS:
            supplier = Supplier(
                shop_id=shop.id,
                name=s_data["name"],
                code=s_data["code"],
                contact_name=s_data["contact_name"],
                email=s_data["email"],
                phone=s_data["phone"],
                lead_time_days=s_data["lead_time_days"],
                min_order_value=s_data["min_order_value"],
                payment_terms=s_data["payment_terms"],
                rating=s_data["rating"],
                is_active=True
            )
            db.add(supplier)
            created_suppliers.append(supplier)
        await db.flush()

        # 4. Create Products & Initial Inventory Lots
        created_products = []
        now = datetime.now(timezone.utc)

        for p_data in DEMO_PRODUCTS:
            supp = created_suppliers[p_data["supplier_idx"]]
            prod = Product(
                shop_id=shop.id,
                sku=p_data["sku"],
                name=p_data["name"],
                category=p_data["category"],
                unit=p_data["unit"],
                unit_cost=p_data["unit_cost"],
                selling_price=p_data["selling_price"],
                min_stock=p_data["min_stock"],
                max_stock=p_data["max_stock"],
                shelf_life_days=p_data["shelf_life_days"],
                lead_time_days=p_data["lead_time_days"],
                reorder_point=p_data["reorder_point"],
                target_stock=p_data["target_stock"],
                safety_stock=p_data["safety_stock"],
                moq=p_data["moq"],
                case_pack=p_data["case_pack"],
                preferred_supplier_id=supp.id,
                is_active=True
            )
            db.add(prod)
            await db.flush()
            created_products.append(prod)

            # Create initial inventory lot
            qty = p_data["initial_stock"]
            exp_date = now + timedelta(days=p_data["days_to_expiry"])
            lot = InventoryLot(
                shop_id=shop.id,
                product_id=prod.id,
                lot_number=f"LOT-INIT-{prod.sku[:3]}-{random.randint(100, 999)}",
                quantity_received=qty + 10,
                quantity_remaining=qty,
                unit_cost=prod.unit_cost,
                received_at=now - timedelta(days=3),
                expiry_date=exp_date,
                status="active"
            )
            db.add(lot)
            await db.flush()

            movement = InventoryMovement(
                shop_id=shop.id,
                product_id=prod.id,
                lot_id=lot.id,
                movement_type="initial_stock",
                quantity_delta=qty,
                quantity_before=0,
                quantity_after=qty,
                unit_cost=prod.unit_cost,
                reference_type="manual_init",
                reason="Store inventory setup",
                created_by_user_id=admin_user.id,
            )
            db.add(movement)

        # 5. Generate 60 Days of Realistic Sales History with Seasonality
        print("[*] Generating 60 days of historical sales data with weekend seasonality...")
        random.seed(42)  # Deterministic seed for reproducible testing

        for day_offset in range(60, 0, -1):
            sale_date = now - timedelta(days=day_offset)
            dow = sale_date.weekday()
            # Weekend boost (Friday=4, Saturday=5, Sunday=6)
            weekend_factor = 1.45 if dow in [4, 5, 6] else 1.0

            # 8 to 15 transactions per day
            num_tx = int(random.randint(8, 14) * weekend_factor)
            for tx_idx in range(num_tx):
                # Pick 1-3 random items per basket
                basket_size = random.choice([1, 1, 2, 2, 3])
                selected_prods = random.sample(created_products, basket_size)

                inv_num = f"INV-{sale_date.strftime('%Y%m%d')}-{tx_idx+1:03d}"
                sale = Sale(
                    shop_id=shop.id,
                    invoice_number=inv_num,
                    customer_name="Walk-in Customer",
                    payment_method=random.choice(["cash", "card", "card", "upi"]),
                    status="completed",
                    sold_at=sale_date + timedelta(hours=random.randint(9, 20), minutes=random.randint(0, 59)),
                    created_by_user_id=admin_user.id
                )
                db.add(sale)
                await db.flush()

                sale_total = 0.0
                for sp in selected_prods:
                    # Daily demand simulation
                    qty = random.choices([1, 2, 3, 4], weights=[0.55, 0.30, 0.10, 0.05])[0]
                    item_total = round(qty * sp.selling_price, 2)
                    sale_total += item_total

                    item = SaleItem(
                        sale_id=sale.id,
                        product_id=sp.id,
                        quantity=qty,
                        unit_price=sp.selling_price,
                        unit_cost=sp.unit_cost,
                        total_price=item_total
                    )
                    db.add(item)

                sale.total_amount = round(sale_total, 2)

        # 6. Create sample Purchase Order
        po = PurchaseOrder(
            shop_id=shop.id,
            supplier_id=created_suppliers[0].id,
            order_number=f"PO-{now.strftime('%Y%m%d')}-001",
            status="submitted",
            total_amount=184.80,
            ordered_at=now - timedelta(days=1),
            expected_delivery_date=now + timedelta(days=1),
            notes="Weekly replenishment for fresh milk and eggs",
            created_by_user_id=admin_user.id
        )
        db.add(po)
        await db.flush()

        po_item1 = PurchaseOrderItem(
            po_id=po.id,
            product_id=created_products[0].id,  # Milk
            quantity_ordered=36,
            quantity_received=0,
            unit_cost=2.40,
            total_cost=86.40
        )
        po_item2 = PurchaseOrderItem(
            po_id=po.id,
            product_id=created_products[2].id,  # Eggs
            quantity_ordered=35,
            quantity_received=0,
            unit_cost=2.80,
            total_cost=98.00
        )
        db.add(po_item1)
        db.add(po_item2)

        await db.commit()
        print("[+] Database successfully seeded!")
        print("  - Owner: admin@stocksense.io / password123")
        print(f"  - Shop: Metro Retail Mart ({shop.id})")
        print(f"  - Suppliers: {len(created_suppliers)}")
        print(f"  - Products: {len(created_products)}")
        print("  - 60 days of historical sales and inventory lots generated.")


if __name__ == "__main__":
    asyncio.run(seed())
