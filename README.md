# VIKMO DealerDesk — AI-Native Spare Parts Commerce Platform

**Track:** AI / ML INTERN  
**Author / Candidate:** Devanand  
**Repository:** [GitHub Repository Placeholder: https://github.com/your-username/vikmo-dealerdesk]  
**Walkthrough Video:** [Video Link Placeholder: https://youtu.be/placeholder-walkthrough]  

---

## 1. Project Overview & Objective

VIKMO DealerDesk is a production-grade, AI-native commerce and inventory management platform designed for two-wheeler and automobile spare-parts distributors across India. 

The platform provides:
- **Core Catalogue & Dealer Management**: 600 catalogue products and 25 distributors.
- **Inventory & Live Stock Updates**: Real-time warehouse stock tracking and manual count corrections.
- **Order Engine**: Validated draft order creation, idempotency key guarantees, and complete status lifecycle management (`DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `DELIVERED` / `CANCELLED`).
- **AI Dealer Assistant**: Grounded GenAI conversational assistant powered by Google Gemini (`gemini-2.5-flash`), supporting multi-turn tool calling (`search_parts`, `check_stock`, `create_draft_order`), prompt-injection hardening, and session memory isolation.
- **Demand Forecasting (ML)**: 4-week future demand forecasting for 40 designated SKUs, accounting for promotional calendar spikes, moving Diwali festival seasonality, and intermittent demand.
- **Automated Reorder Suggestions**: Dynamic safety stock, lead time demand, and reorder point calculations based on live warehouse inventory.
- **Supplier Synchronisation (Optional Feature)**: Resilient external catalogue synchronization with cursor pagination, exponential backoff, rate limiting (HTTP 429), and atomic database updates.

---

## 2. Technology Stack & Requirements

| Component | Technology |
|---|---|
| **Language** | Python 3.11+ (Tested on Python 3.12.13) |
| **Web Framework** | Django 5.2 / Django REST Framework 3.15+ |
| **Database** | PostgreSQL 16 (strict requirement; no SQLite) |
| **PostgreSQL Driver**| `psycopg` (v3) binary |
| **LLM Provider** | Google Gemini (`google-genai` SDK, model `gemini-2.5-flash`) |
| **Machine Learning**| `pandas`, `numpy`, `scikit-learn` |
| **HTTP Client** | `requests` |

---

## 3. Environment Variables Configuration

The application reads configuration strictly from environment variables (or `.env` in local development). A sample `.env.example` is committed to the repository:

```ini
# Database (PostgreSQL required)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dealerdesk

# Supplier API Mock
SUPPLIER_API_URL=http://127.0.0.1:8099
SUPPLIER_API_KEY=dev-supplier-key

# Secret key
DJANGO_SECRET_KEY=dev-only-secret-key-vikmo-dealerdesk

# LLM Provider Key (Google Gemini)
GEMINI_API_KEY=your-gemini-api-key-here
```

> **Security Note:** `.env` is ignored by Git. Never commit production secrets.

---

## 4. Setup, Installation & Running

### Step 1: Create Virtual Environment and Install Dependencies
```bash
python -m venv .venv
# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

### Step 2: Configure PostgreSQL Database
Ensure PostgreSQL is running and create the `dealerdesk` database:
```sql
CREATE DATABASE dealerdesk;
```

### Step 3: Run Database Migrations
```bash
python manage.py migrate --noinput
```

### Step 4: Seed Initial Data
Loads 600 catalogue items and 25 dealers idempotently from `data/`:
```bash
python manage.py seed_data
```
*(Running `seed_data` twice is verified to produce 0 duplicates.)*

### Step 5: Start the Server
```bash
python manage.py runserver 0.0.0.0:8000 --noreload
```

Verify health:
```bash
curl http://localhost:8000/api/health/
# Response: {"status": "ok"}
```

---

## 5. API Endpoints Specification

### 5.1 Products & Inventory
- `GET /api/products/`: Paginated product catalogue (default 20, max 100). Supports `search` (sku, name, brand), `category`, and `vehicle` fitment filters.
- `POST /api/products/`: Create new product (initializes stock to 0; duplicate SKU returns `409 DUPLICATE`).
- `GET /api/products/{sku}/`: Retrieve product details.
- `PATCH /api/products/{sku}/`: Partial update (price, description, etc.; SKU is immutable).
- `PUT /api/inventory/{sku}/`: Set exact available quantity (`{"quantity": 25, "reason": "..."}`).

### 5.2 Dealers
- `GET /api/dealers/`: Paginated dealer list.
- `POST /api/dealers/`: Create dealer (`dealer_code` and `name` required; duplicate returns `409 DUPLICATE`).
- `GET /api/dealers/{id}/`: Retrieve dealer details.

### 5.3 Orders
- `POST /api/orders/`: Create a `DRAFT` order (`{"dealer_id": 7, "items": [{"sku": "BRK-1044", "quantity": 3}]}`). Supports `Idempotency-Key` header.
- `GET /api/orders/`: Paginated list of orders (filterable by `dealer_id` and `status`).
- `GET /api/orders/{order_number}/`: Retrieve order details.
- `PUT /api/orders/{order_number}/`: Replace items of a `DRAFT` order (locked if not in draft status).
- `POST /api/orders/{order_number}/confirm/`: Transition `DRAFT` $\rightarrow$ `CONFIRMED`. Atomically verifies and deducts stock.
- `POST /api/orders/{order_number}/dispatch/`: Transition `CONFIRMED` $\rightarrow$ `DISPATCHED`.
- `POST /api/orders/{order_number}/deliver/`: Transition `DISPATCHED` $\rightarrow$ `DELIVERED`.
- `POST /api/orders/{order_number}/cancel/`: Cancels `DRAFT` or `CONFIRMED` orders (restores deducted stock exactly once).

### 5.4 AI Dealer Assistant
- `POST /api/assistant/chat/`:
  - Request: `{"session_id": "abc-123", "dealer_id": 7, "message": "Do you have brake pads for a Pulsar 150?"}`
  - Response: `{"reply": "...", "cited_skus": ["BRK-1044"], "tool_calls": [...], "actions": [...]}`
  - Available tools: `search_parts`, `check_stock`, `create_draft_order`.

### 5.5 Machine Learning & Reorder Suggestions
- `GET /api/forecast/{sku}/`: Returns 4-week demand forecast matching `ml/forecast.csv`.
- `GET /api/reorder-suggestions/`: Returns live reorder recommendations across all 40 forecast SKUs.

### 5.6 Optional Features
- `POST /api/sync/supplier/`: Runs full supplier sync against external API with pagination, retries, and duplicate resolution.

---

## 6. AI Assistant: Tools, Provider & Guardrails

- **LLM Provider**: Google Gemini via official `google-genai` SDK (`gemini-2.5-flash`).
- **Function Calling**: Real function-calling execution loop with server-side validation.
- **Prompt Injection Defense**:
  - Catalogue text and descriptions are treated as inert, untrusted DATA, never as executable instructions.
  - Server-side parameter enforcement: `dealer_id` is locked to the session and cannot be manipulated by the model.
  - Permission boundaries: The assistant is restricted to `create_draft_order` and cannot confirm orders or adjust inventory.
  - Ambiguous intent handling: The assistant asks clarifying questions when order quantities or SKUs are unspecified.

---

## 7. Machine Learning Forecasting & Reorder Logic

### 7.1 Forecast File
The forecast file is committed at `ml/forecast.csv`:
- Format: `sku,week_start,forecast_units`
- Target Weeks: `2026-09-28`, `2026-10-05`, `2026-10-12`, `2026-10-19`
- Dimension: Exactly 160 rows ($40\text{ SKUs} \times 4\text{ weeks}$).
- Values: Non-negative demand predictions.

### 7.2 Validation & Model Comparison
Models were evaluated using expanding-window temporal validation on historical cutoffs:

| Model | MAE | WAPE | RMSE |
|---|---|---|---|
| **Naive (Last Observed)** | 10.28 | 0.300 | 16.47 |
| **Moving Average (4-wk)** | 8.47 | 0.247 | 13.89 |
| **Seasonal Naive (Lag 52)** | 11.47 | 0.334 | 18.20 |
| **Selected Model (Ours)** | **7.61** | **0.222** | **12.04** |

### 7.3 Reorder Formula
For each forecast SKU:
1. $L = \text{lead\_time\_weeks}$ (from `data/lead_times.csv`).
2. $\text{lead\_time\_demand} = \sum_{w=1}^L \text{forecast\_units}_w$.
3. $\sigma = \text{sample standard deviation with } (n - 1) \text{ denominator over most recent 12 weeks of sales}$.
4. $\text{safety\_stock} = \lceil 1.65 \times \sigma \times \sqrt{L} \rceil$.
5. $\text{reorder\_point} = \text{lead\_time\_demand} + \text{safety\_stock}$.
6. $\text{reorder\_qty} = \max(0, \lceil \text{reorder\_point} - \text{current\_stock} \rceil)$ using **live** available stock.

---

## 8. Verification & Testing

### Run Automated Test Suite (27 tests)
```bash
python manage.py test core
```

### Run Official Smoke Test
```bash
# AI/ML Track Smoke Test (10/10 PASS)
python smoke_test.py --base-url http://localhost:8000 --track aiml

# Full Smoke Test Across All Modules (12/12 PASS)
python smoke_test.py --base-url http://localhost:8000 --all
```

---

## 9. Implementation Status & Optional Features

- [x] Products API (List, Search, Pagination, Detail, Create, Patch)
- [x] Inventory API (PUT quantity, negative rejection, live stock reflection)
- [x] Dealers API (List, Create, Detail, Duplicate 409)
- [x] Orders API (DRAFT create, calculate 18% GST with ROUND_HALF_UP, ORD-YYYYMMDD-NNNN unique numbers)
- [x] Standardized Error Handling (`{"error": {"code", "message", "details"}}`)
- [x] AI Dealer Assistant (Gemini SDK, real tool-calling loop, grounding, session isolation, injection defense)
- [x] ML Demand Forecasting (`ml/forecast.csv`, 160 rows, 4 weeks, temporal validation)
- [x] Forecast & Reorder Endpoints (`GET /api/forecast/{sku}/`, `GET /api/reorder-suggestions/`)
- [x] **[OPTIONAL]** Order Engine Lifecycle (`CONFIRMED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`, atomic stock lock)
- [x] **[OPTIONAL]** Supplier Sync (`POST /api/sync/supplier/` with cursor pagination, 429 Retry-After, duplicate resolution)

---

## 10. Technical Decisions & Notes

For full technical rationale and interview preparation, refer to:
- [`DECISIONS.md`](file:///c:/VIKMO%20DealerDesk%20Assignment/DECISIONS.md) — Answers to all 8 evaluation questions with exact line numbers.
- [`ENGINEERING_NOTES.md`](file:///c:/VIKMO%20DealerDesk%20Assignment/ENGINEERING_NOTES.md) — Architecture notes and interview defence guide.
