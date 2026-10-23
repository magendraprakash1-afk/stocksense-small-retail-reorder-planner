# StockSense Management - Backend, Database & Forecasting Engine

StockSense Management is an intelligent, production-grade retail inventory forecasting and reorder planning platform designed for small and medium retail shops to eliminate stockouts, minimize perishable food waste, and automate supplier replenishment.

---

## Key Features

- **FastAPI + SQLAlchemy 2.0 Async**: High-throughput async REST API with automatic OpenAPI documentation.
- **Multi-Tenant Architecture**: Strict shop-level isolation (`X-Shop-Id`) supporting multi-store retailers.
- **FEFO Inventory Ledger**: First-Expired-First-Out stock depletion tracking lot numbers, receipt dates, and expiry dates.
- **Adaptive Demand Forecasting**:
  - Automatically selects optimal model by historical depth:
    - `< 7 days`: Naive Baseline
    - `7-28 days`: Simple Moving Average (7-day window)
    - `>= 28 days`: Weighted Moving Average with Day-of-Week Seasonality multipliers
  - **Censored Demand Adjustment**: Corrects for stockout days where true consumer demand was masked.
  - **Outlier Winsorization**: 1.5x IQR outlier filtering prevents promotional spikes from distorting baseline forecasts.
  - **Confidence Intervals**: 95% bounds based on historical residual standard deviation.
- **Intelligent Reorder Engine**:
  - Implements full 9-step inventory replenishment math:
    - Net Stock Position = On-Hand + Confirmed Incoming - Expired
    - Lead-Time Demand = Sum of daily forecast over supplier lead time
    - Safety Stock = z * sigma_daily * sqrt(lead_time)
    - Reorder Point = Lead-Time Demand + Safety Stock
    - Target Stock = Lead-Time Demand + Cycle Stock + Safety Stock
    - Raw Order = max(0, Target Stock - Net Stock)
    - Constraints: Case pack rounding, MOQ enforcement, Shelf-Life Cap, Budget ranking.
- **Sales CSV Import**: Fast, flexible CSV validation with auto-mapping, preview, and atomic commit.
- **Supplier & Purchase Order Lifecycle**: Draft -> Submitted -> Received with atomic stock addition into inventory lots.

---

## Project Architecture

```
app/
|-- core/
|   |-- config.py           # Pydantic Settings & environment config
|   |-- database.py         # SQLAlchemy async engine & session
|   |-- security.py         # Password hashing (bcrypt) & JWT tokens
|   `-- dependencies.py     # Auth, Tenant Shop isolation, and RBAC
|-- models/
|   `-- base.py             # 13 Normalized SQLAlchemy ORM tables
|-- schemas/                # Pydantic request & response models
|-- services/
|   |-- auth_service.py
|   |-- product_service.py
|   |-- inventory_service.py # FEFO stock deduction & lot ledger
|   |-- forecast_service.py  # Adaptive demand forecasting engine
|   |-- reorder_service.py   # 9-step reorder calculation engine
|   |-- sales_import_service.py
|   |-- supplier_service.py
|   |-- purchase_order_service.py
|   `-- dashboard_service.py
|-- api/
|   `-- v1/
|       |-- auth.py
|       |-- products.py
|       |-- inventory.py
|       |-- sales.py
|       |-- forecasts.py
|       |-- reorder.py
|       |-- suppliers.py
|       |-- purchase_orders.py
|       |-- dashboard.py
|       `-- reports.py
`-- main.py                 # FastAPI application entrypoint
```

---

## Quickstart

### Option 1: Local Python (Zero-Config SQLite / PostgreSQL)

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed database with demo data**:
   ```bash
   python seed_data.py
   ```
   *Generates default user (`admin@stocksense.io` / `password123`), store, suppliers, products, and 60 days of sales history.*

4. **Start the API server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - Interactive Swagger API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

---

### Option 2: Docker Compose (Production Setup with PostgreSQL)

1. **Launch containers**:
   ```bash
   docker-compose up -d
   ```

2. **Seed database in container**:
   ```bash
   docker-compose exec backend python seed_data.py
   ```

---

## Running Automated Tests

Run the test suite using pytest:
```bash
pytest tests/ -v
```

---

## Frontend Integration

The frontend (`js/api.js`) comes pre-wired for seamless hybrid operation:
- **Demo Mode**: Operates locally in-browser using `DemoData` without requiring a backend.
- **Backend Mode**: Connects directly to the live FastAPI server at `http://localhost:8000/api/v1`.

To switch modes from the browser console or settings:
```javascript
// Connect to live backend
API.setBaseUrl('http://localhost:8000/api/v1');
API.setDemoMode(false);

// Check backend health
await API.checkBackendHealth(); // returns true if backend is online
```
