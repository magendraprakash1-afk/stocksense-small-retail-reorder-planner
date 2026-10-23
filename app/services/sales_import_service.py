import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.base import Product, Sale, SaleItem
from app.schemas.sales import SalesImportPreviewOut, SalesImportConfirmRequest
from app.services.inventory_service import InventoryService


DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%Y/%m/%d"
]


def parse_date_flexibly(date_str: str) -> Optional[datetime]:
    clean_str = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(clean_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class SalesImportService:
    @staticmethod
    def normalize_headers(fieldnames: List[str]) -> Dict[str, str]:
        """Map heterogeneous CSV column names to standard keys."""
        mapping = {}
        for f in fieldnames:
            key = f.strip().lower().replace(" ", "_").replace("-", "")
            if key in ["date", "sale_date", "sold_at", "transaction_date"]:
                mapping["date"] = f
            elif key in ["sku", "product_sku", "item_code", "product_code", "code"]:
                mapping["sku"] = f
            elif key in ["name", "product_name", "item_name", "description", "item"]:
                mapping["name"] = f
            elif key in ["quantity", "qty", "units", "quantity_sold", "units_sold"]:
                mapping["quantity"] = f
            elif key in ["price", "unit_price", "rate", "selling_price"]:
                mapping["price"] = f
            elif key in ["customer", "customer_name", "client"]:
                mapping["customer"] = f
            elif key in ["invoice", "invoice_number", "order_id", "transaction_id", "receipt"]:
                mapping["invoice"] = f
        return mapping

    @classmethod
    async def preview_csv(cls, db: AsyncSession, shop_id: str, csv_content: str) -> SalesImportPreviewOut:
        # Load existing shop products for SKU matching
        p_stmt = select(Product.sku, Product.name, Product.selling_price).where(Product.shop_id == shop_id)
        p_res = await db.execute(p_stmt)
        existing_products = {row[0].strip().upper(): {"name": row[1], "price": row[2]} for row in p_res.all()}

        stream = io.StringIO(csv_content.strip())
        # Sniff delimiter
        sample = csv_content[:2048]
        delimiter = ";" if ";" in sample and sample.count(";") > sample.count(",") else ","
        reader = csv.DictReader(stream, delimiter=delimiter)

        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="Empty or invalid CSV file.")

        header_map = cls.normalize_headers(reader.fieldnames)
        if "date" not in header_map or "sku" not in header_map or "quantity" not in header_map:
            raise HTTPException(
                status_code=400,
                detail=f"CSV missing mandatory columns. Must contain Date, SKU/Product Code, and Quantity. Found: {list(reader.fieldnames)}"
            )

        total_rows = 0
        valid_rows = []
        invalid_rows = []
        unmatched_skus = set()
        dates_seen = []
        errors = []

        for idx, row in enumerate(reader, start=1):
            total_rows += 1
            raw_date = row.get(header_map["date"], "")
            raw_sku = row.get(header_map["sku"], "").strip()
            raw_qty = row.get(header_map["quantity"], "")
            raw_name = row.get(header_map.get("name", ""), "").strip()
            raw_price = row.get(header_map.get("price", ""), "")
            raw_cust = row.get(header_map.get("customer", ""), "").strip() or "Walk-in Customer"
            raw_inv = row.get(header_map.get("invoice", ""), "").strip()

            parsed_dt = parse_date_flexibly(raw_date)
            if not parsed_dt:
                invalid_rows.append(idx)
                if len(errors) < 10:
                    errors.append(f"Row {idx}: Invalid date format '{raw_date}'.")
                continue

            try:
                qty = int(float(raw_qty))
                if qty <= 0:
                    invalid_rows.append(idx)
                    if len(errors) < 10:
                        errors.append(f"Row {idx}: Quantity must be positive, got '{raw_qty}'.")
                    continue
            except (ValueError, TypeError):
                invalid_rows.append(idx)
                if len(errors) < 10:
                    errors.append(f"Row {idx}: Non-numeric quantity '{raw_qty}'.")
                continue

            if not raw_sku:
                invalid_rows.append(idx)
                if len(errors) < 10:
                    errors.append(f"Row {idx}: Missing SKU.")
                continue

            norm_sku = raw_sku.upper()
            dates_seen.append(parsed_dt)

            # Check if SKU matches
            matched_prod = existing_products.get(norm_sku)
            unit_price = 0.0
            if raw_price:
                try:
                    unit_price = float(raw_price.replace("$", "").replace(",", "").strip())
                except ValueError:
                    unit_price = matched_prod["price"] if matched_prod else 0.0
            elif matched_prod:
                unit_price = matched_prod["price"]

            if not matched_prod:
                unmatched_skus.add(raw_sku)

            valid_rows.append({
                "row_num": idx,
                "date": parsed_dt.strftime("%Y-%m-%d"),
                "sku": raw_sku,
                "product_name": matched_prod["name"] if matched_prod else (raw_name or raw_sku),
                "quantity": qty,
                "unit_price": unit_price,
                "customer": raw_cust,
                "invoice": raw_inv or f"IMP-{parsed_dt.strftime('%Y%m%d')}-{idx}"
            })

        date_start = min(dates_seen).strftime("%Y-%m-%d") if dates_seen else None
        date_end = max(dates_seen).strftime("%Y-%m-%d") if dates_seen else None

        return SalesImportPreviewOut(
            total_rows=total_rows,
            valid_rows_count=len(valid_rows),
            invalid_rows_count=len(invalid_rows),
            unmatched_skus=sorted(list(unmatched_skus)),
            date_range_start=date_start,
            date_range_end=date_end,
            sample_valid_rows=valid_rows[:15],
            errors=errors
        )

    @classmethod
    async def confirm_import(
        cls,
        db: AsyncSession,
        shop_id: str,
        payload: SalesImportConfirmRequest,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Commit validated sales rows into database."""
        # 1. Fetch existing products
        p_stmt = select(Product).where(Product.shop_id == shop_id)
        p_res = await db.execute(p_stmt)
        products_by_sku = {p.sku.upper(): p for p in p_res.scalars().all()}

        # 2. Auto-create missing products if allowed
        created_products_count = 0
        if payload.auto_create_missing_products:
            needed_skus = {row["sku"].upper(): row for row in payload.rows if row["sku"].upper() not in products_by_sku}
            for norm_sku, row in needed_skus.items():
                price = float(row.get("unit_price") or 10.0)
                cost = round(price * payload.default_cost_ratio, 2)
                new_p = Product(
                    shop_id=shop_id,
                    sku=row["sku"],
                    name=row.get("product_name") or row["sku"],
                    category="Imported",
                    unit="unit",
                    unit_cost=cost,
                    selling_price=price,
                    min_stock=5,
                    max_stock=50,
                    reorder_point=10,
                    target_stock=25,
                    safety_stock=5,
                    lead_time_days=3,
                    is_active=True
                )
                db.add(new_p)
                await db.flush()
                products_by_sku[norm_sku] = new_p
                created_products_count += 1

        # 3. Group by invoice to create clean transactions
        invoices: Dict[str, List[dict]] = {}
        for r in payload.rows:
            inv_key = r.get("invoice") or f"IMP-{r.get('date')}"
            invoices.setdefault(inv_key, []).append(r)

        sales_created = 0
        items_created = 0

        for inv_key, items_list in invoices.items():
            first_row = items_list[0]
            sold_dt = parse_date_flexibly(first_row.get("date", "")) or datetime.now(timezone.utc)
            cust_name = first_row.get("customer", "Walk-in Customer")

            sale = Sale(
                shop_id=shop_id,
                invoice_number=inv_key,
                customer_name=cust_name,
                payment_method="cash",
                status="completed",
                sold_at=sold_dt,
                created_by_user_id=user_id,
            )
            db.add(sale)
            await db.flush()

            sale_total = 0.0
            for item in items_list:
                prod = products_by_sku.get(item["sku"].upper())
                if not prod:
                    continue  # skip if product doesn't exist and auto-create wasn't checked

                qty = int(item["quantity"])
                unit_price = float(item.get("unit_price") or prod.selling_price)
                unit_cost = prod.unit_cost
                total_price = round(qty * unit_price, 2)
                sale_total += total_price

                # Optional physical inventory deduction
                lot_id = None
                if payload.deduct_inventory:
                    deductions = await InventoryService.deduct_stock_fefo(
                        db=db,
                        shop_id=shop_id,
                        product_id=prod.id,
                        quantity=qty,
                        reference_type="sale_import",
                        reference_id=sale.id,
                        reason=f"Historical CSV Import {inv_key}",
                        user_id=user_id
                    )
                    if deductions and deductions[0][0] != "unassigned":
                        lot_id = deductions[0][0]

                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=prod.id,
                    lot_id=lot_id,
                    quantity=qty,
                    unit_price=unit_price,
                    unit_cost=unit_cost,
                    total_price=total_price,
                )
                db.add(sale_item)
                items_created += 1

            sale.total_amount = round(sale_total, 2)
            sales_created += 1

        await db.commit()

        return {
            "success": True,
            "sales_imported": sales_created,
            "items_imported": items_created,
            "new_products_created": created_products_count,
            "inventory_deducted": payload.deduct_inventory
        }
