# VIKMO DealerDesk

**AI-Powered Automotive Spare-Parts Inventory and Demand Forecasting Platform**

**Track:** AI / ML Track  
**Submission Repository:** [https://github.com/DEVA77A/VIKMO-DEALER-DESK](https://github.com/DEVA77A/VIKMO-DEALER-DESK)  
**Demonstration Video:** [Watch the VIKMO DealerDesk Demo](https://youtu.be/Ry_5Y6CIHoI)  

---

## 1. Project Overview

VIKMO DealerDesk is an enterprise-grade commerce, inventory intelligence, and demand forecasting platform purpose-built for two-wheeler and commercial automotive spare-parts distributor networks across India.

### The Problem
Automotive spare-parts distribution in India faces distinct operational challenges:
- **Catalogue Scale & Fitment Ambiguity:** Technicians and counter staff frequently request parts using vehicle models rather than exact Part SKUs (e.g., "brake pads for a Pulsar 150"), leading to misorders.
- **Intermittent & Lumpy Demand:** Slow-moving replacement components (e.g., specific ignition coils or electrical switches) experience long periods of zero sales punctuated by sporadic orders, rendering traditional moving averages ineffective.
- **Festival & Promotional Volatility:** Moving lunar holidays—principally Diwali—alongside regional distributor promotional campaigns introduce multi-fold demand surges that compound risks of severe stockouts or overstocked capital.
- **Inventory Grounding & Hallucination Risk:** Conversational AI assistants in commerce cannot afford to hallucinate prices or promise unverified warehouse stock to dealers.

### The Solution
VIKMO DealerDesk integrates three core capabilities into a cohesive platform:
1. **ACID-Compliant Inventory & Order Core:** High-integrity Django/PostgreSQL backend tracking 600 catalogue items, 25 distributor dealers, multi-line draft order creation with 18% GST precision, and atomic stock reservation.
2. **Database-Grounded AI Assistant:** Conversational agent featuring genuine multi-turn tool calling (`search_parts`, `check_stock`, `create_draft_order`), resilient multi-provider failover (Google Gemini $\rightarrow$ Groq $\rightarrow$ Deterministic Engine), session memory isolation, and prompt-injection hardening.
3. **Hybrid Demand Forecasting & Replenishment Pipeline:** Time-series forecasting combining `HistGradientBoostingRegressor` for established fast-moving parts, the Syntetos-Boylan Approximation (SBA) for intermittent parts, and empirical Bayesian shrinkage for promotional/festival surges, generating the committed 160-row `ml/forecast.csv` and driving dynamic reorder recommendations.

---

## 2. Core Features

All documented features are verified against the actual repository implementation:

- **Catalogue & Fitment Management:** 600 spare parts indexed by SKU, part name, category, brand, and vehicle model fitment (`GET /api/products/`, `POST /api/products/`, `GET /api/products/{sku}/`, `PATCH /api/products/{sku}/`).
- **Live Inventory Tracking:** Real-time stock counts with verified audit-trail adjustments (`PUT /api/inventory/{sku}/`).
- **Authorized Dealer Management:** 25 regional distribution centres with city, phone, email, GSTIN, and credit limits (`GET /api/dealers/`, `POST /api/dealers/`).
- **Order Engine Lifecycle:** Complete status lifecycle (`DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `DELIVERED` / `CANCELLED`) with atomic stock deduction on confirmation and stock restoration on cancellation.
- **Idempotent Order Creation:** Header-based idempotency guarantees (`Idempotency-Key`) preventing double-billing on network retries.
- **Financial Precision:** Currency fields use Python `Decimal` with `ROUND_HALF_UP` on 18% GST line calculations to eliminate floating-point drift.
- **AI Dealer Assistant:** Genuine tool calling against PostgreSQL database records; never invents prices or stock figures.
- **Multi-Provider LLM Resilience:** Three-tier failover orchestrator automatically routing queries to Google Gemini (primary), Groq (secondary), or a deterministic grounded database engine (tertiary).
- **Four-Week Horizon Demand Forecasting:** 40 designated critical SKUs forecasted across `2026-09-28`, `2026-10-05`, `2026-10-12`, and `2026-10-19`.
- **Dynamic Reorder Recommendations:** Calculates lead time demand, safety stock ($\lceil 1.65 \times \sigma \times \sqrt{L} \rceil$), reorder points, and recommended reorder quantities using live warehouse inventory (`GET /api/reorder-suggestions/`).
- **Supplier Feed Synchronization:** External mock catalog synchronization with cursor pagination, rate-limit retry (`Retry-After`), and duplicate SKU conflict handling (`POST /api/sync/supplier/`).
- **Operations Frontend Portal:** Responsive React 19 web application with operations dashboard, interactive catalogue, orders workbench, assistant interface, and Recharts demand visualizations.

---

## 3. Technology Stack

| Layer | Component | Version / Specification |
|---|---|---|
| **Backend Runtime** | Python | 3.11+ (Validated on Python 3.12.13) |
| **Web Framework** | Django | 5.2.x |
| **REST API** | Django REST Framework | 3.15.x |
| **Database** | PostgreSQL | 16 (Strict requirement; SQLite prohibited) |
| **Database Driver** | `psycopg` (v3 binary) | 3.2.x |
| **Database URL Parsing**| `dj-database-url` | 2.3.x |
| **Primary LLM** | Google Gemini | Official `google-genai` SDK (`gemini-3.5-flash-lite`, with fallback rotation) |
| **Secondary LLM** | Groq | Official `groq` SDK (`qwen/qwen3.8-27b`, `llama-3.3-70b-versatile`) |
| **Machine Learning** | `scikit-learn` | 1.6.x (`HistGradientBoostingRegressor`) |
| **Data & Math** | `pandas`, `numpy` | `pandas` 2.2.x, `numpy` 2.2.x |
| **Frontend Framework** | React | 19.2.8 |
| **Build Tool / Bundler** | Vite | 8.3.x |
| **Frontend Styling** | Tailwind CSS | 4.3.3 |
| **Routing** | React Router DOM | 7.18.4 |
| **Charts & Visuals** | Recharts, Lucide React | Recharts 3.10.1, Lucide React 1.55.0 |
| **Testing** | Django Test Runner | 59 unit/integration tests; `smoke_test.py` (10/10 PASS) |

---

## 4. Architecture

DealerDesk decouples client interactions, core business services, conversational AI orchestration, and machine learning pipelines into distinct layers backed by PostgreSQL ACID transactions:

```mermaid
flowchart TD
    subgraph Client["Client Tier"]
        UI["React 19 SPA (Vite + Tailwind)"]
        CLI["smoke_test.py / External HTTP"]
    end

    subgraph API["Django REST Framework API (:8000)"]
        Health["/api/health/"]
        ProductsAPI["/api/products/ & /api/inventory/"]
        OrdersAPI["/api/orders/ (Lifecycle & Idempotency)"]
        ForecastAPI["/api/forecast/ & /api/reorder-suggestions/"]
        AssistantAPI["/api/assistant/chat/"]
        SyncAPI["/api/sync/supplier/"]
    end

    subgraph AI["AI Assistant Orchestrator"]
        Orchestrator["MultiProviderOrchestrator"]
        Gemini["GeminiProvider (google-genai)"]
        Groq["GroqProvider (groq SDK)"]
        DetEngine["DeterministicEngine (Grounded DB)"]
        ToolReg["AssistantToolRegistry"]
    end

    subgraph ML["Forecasting Pipeline"]
        HybridPipe["HybridForecastPipeline"]
        HGBR["HistGradientBoostingRegressor"]
        SBA["Syntetos-Boylan Approx (Croston)"]
        PromoShrink["Bayesian Promotional Shrinkage"]
        DiwaliMap["Diwali Festival Distance Model"]
        ForecastCSV["ml/forecast.csv (160 Rows)"]
    end

    subgraph DB["PostgreSQL 16 Storage Engine"]
        T_Products[("products")]
        T_Dealers[("dealers")]
        T_Orders[("orders & order_items")]
        T_Idemp[("idempotency_records")]
        T_Chat[("assistant_conversations")]
    end

    UI --> API
    CLI --> API
    
    AssistantAPI --> Orchestrator
    Orchestrator --> Gemini
    Gemini -.Failover.-> Groq
    Groq -.Failover.-> DetEngine
    
    Gemini --> ToolReg
    Groq --> ToolReg
    DetEngine --> ToolReg
    
    ToolReg --> ProductsAPI
    ToolReg --> OrdersAPI
    
    ProductsAPI --> DB
    OrdersAPI --> DB
    
    ForecastAPI --> ForecastCSV
    ForecastAPI --> DB
    HybridPipe --> HGBR & SBA & PromoShrink & DiwaliMap
    HybridPipe --> ForecastCSV
```

---

## 5. Repository Structure

```
VIKMO DealerDesk Assignment/
├── .env.example                     # Environment template without credentials
├── .gitignore                       # Git ignore rules (.env, .venv, node_modules, etc.)
├── API_CONTRACT.md                  # Assessment API contract specification
├── DECISIONS.md                     # Engineering decisions & line-by-line evidence
├── DEMO_SCRIPT.md                   # 5-minute walkthrough presentation script
├── ENGINEERING_NOTES.md             # Architecture defense and interview notes
├── README.md                        # Master project documentation
├── manage.py                        # Django management entry point
├── requirements.txt                 # Python dependencies
├── smoke_test.py                    # Official evaluation smoke test runner
├── data/                            # Original benchmark datasets (unchanged)
│   ├── catalogue.csv                # 600 catalogue products
│   ├── dealers.csv                  # 25 authorized dealers
│   ├── lead_times.csv               # 40 target SKUs with lead time weeks
│   ├── promo_calendar.csv           # Historical and future promotional schedules
│   └── sales_history.csv           # 104 weeks of SKU sales data
├── ml/
│   └── forecast.csv                 # Generated 160-row production forecast output
├── core/                            # Main Django application
│   ├── apps.py                      # Django app configuration
│   ├── exceptions.py                # Standardized error responses (error.code/details)
│   ├── middleware.py                # CORS handling middleware
│   ├── ml_views.py                  # Forecast detail & reorder suggestions endpoints
│   ├── models.py                    # Product, Dealer, Order, OrderItem, Idempotency, Chat
│   ├── pagination.py                # StandardResultsSetPagination (page_size=20, max=100)
│   ├── serializers.py               # DRF serializers with MoneyField formatting
│   ├── services.py                  # Order lifecycle, totals calculation, stock logic
│   ├── supplier_sync.py             # External catalogue sync client with retries
│   ├── supplier_views.py            # POST /api/sync/supplier/ view
│   ├── urls.py                      # Core API URL routing
│   ├── views.py                     # Products, inventory, dealers, orders, health views
│   ├── assistant/                   # AI Assistant package
│   │   ├── agent.py                 # AssistantEngine & SKU citation extractor
│   │   ├── analytics.py             # Forecast & reorder tool query helpers
│   │   ├── providers.py             # Gemini, Groq, Deterministic & MultiProviderOrchestrator
│   │   ├── tools.py                 # AssistantToolRegistry (search_parts, check_stock, etc.)
│   │   └── views.py                 # POST /api/assistant/chat/ endpoint
│   ├── management/commands/
│   │   └── seed_data.py             # Idempotent CSV seeding command
│   ├── migrations/
│   │   └── 0001_initial.py          # Initial PostgreSQL database migrations
│   └── tests/                       # Automated test suite (59 tests)
│       ├── test_assistant.py        # 31 assistant, tool-calling & provider tests
│       ├── test_backend_core.py     # 10 catalogue, inventory, dealer & order tests
│       ├── test_forecasting.py      # 14 pipeline, SBA, shrinkage & reorder tests
│       └── test_supplier_sync.py    # 4 cursor pagination & retry tests
├── dealerdesk/                      # Django project configuration
│   ├── settings.py                  # Database, middleware, LLM & DRF settings
│   ├── urls.py                      # Root URL routing
│   └── wsgi.py                      # WSGI application entrypoint
├── forecasting/                     # ML Forecasting pipeline
│   ├── evaluate.py                  # 4-cutoff expanding-window temporal validation
│   ├── models.py                    # SBA (Croston), HGBR, Bayesian shrinkage & pipeline
│   ├── predict.py                   # Forecast generation script for ml/forecast.csv
│   └── train.py                     # Train, validate and output pipeline runner
├── frontend/                        # React 19 + Vite 8 SPA portal
│   ├── index.html                   # HTML entrypoint
│   ├── package.json                 # Node dependencies and scripts
│   ├── vite.config.js               # Vite config with backend API proxy
│   └── src/
│       ├── App.jsx                  # Main application routes
│       ├── index.css                # Tailwind CSS v4 styling
│       ├── components/              # Shared Layout, Badge, Skeleton, EmptyState
│       ├── pages/                   # Dashboard, Products, Dealers, Orders, Assistant, Forecast
│       └── services/api.js          # Decoupled REST client service
└── supplier_mock/
    └── mock_supplier.py             # Local mock supplier server for sync testing
```

---

## 6. Prerequisites

Ensure your host environment meets these requirements prior to setup:
- **Operating System:** Linux (Ubuntu 22.04+ recommended), macOS, or Windows 10/11 with PowerShell.
- **Python:** Version 3.11 or newer (Python 3.12 verified).
- **PostgreSQL:** Version 14, 15, or 16 running locally or via hosted providers (e.g., Neon, Supabase).
- **Node.js & npm:** Node.js 18.x or 20.x with npm 9+ (only required if running the optional frontend).
- **LLM API Key:** Google Gemini API Key (`GEMINI_API_KEY`) and/or Groq API Key (`GROQ_API_KEY`).

---

## 7. Installation and Setup

Follow these steps to set up the project from a clean repository clone:

### Step 1: Clone Repository
```bash
git clone https://github.com/DEVA77A/VIKMO-DEALER-DESK.git
cd VIKMO-DEALER-DESK
```

### Step 2: Create and Activate Python Virtual Environment
**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**On Linux / macOS (Bash):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure PostgreSQL Database
Create a fresh PostgreSQL database (e.g. `dealerdesk`):
```sql
CREATE DATABASE dealerdesk;
```

### Step 5: Configure Environment Variables
Copy `.env.example` to `.env` and provide your database connection string and API keys:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS (Bash):**
```bash
cp .env.example .env
```

Edit `.env` with your values (see Section 8 for complete variable details).

### Step 6: Apply Database Migrations
```bash
python manage.py migrate --noinput
```

### Step 7: Seed Initial Benchmark Data
Populate the 600 catalogue parts and 25 authorized dealers from `data/`:
```bash
python manage.py seed_data
```
*(Running this command multiple times is verified to be completely idempotent, producing 0 duplicate records.)*

---

## 8. Environment Variables

The application reads configuration from environment variables (and optionally `.env` via `python-dotenv`). 

| Variable | Required / Optional | Default Value | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Required** | None | PostgreSQL connection URI, e.g. `postgres://postgres:postgres@localhost:5432/dealerdesk`. |
| `DJANGO_SECRET_KEY` | Optional | `dev-only-insecure-key` | Django cryptographic signing key. Must be overridden in production. |
| `DJANGO_DEBUG` | Optional | `1` | Enables Django debug mode (`1` for development, `0` for production). |
| `GEMINI_API_KEY` | Optional / Recommended | `""` | Google Gemini API key for primary AI assistant conversational tool calling. |
| `GEMINI_MODEL` | Optional | `gemini-3.5-flash-lite` | Primary Gemini model identifier. |
| `GEMINI_MODEL_PREFERENCES` | Optional | `gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.8-flash,gemini-3.1-flash-lite` | Comma-delimited list of models to rotate across on 404/503 errors. |
| `GROQ_API_KEY` | Optional | `""` | Groq API key for secondary LLM failover. |
| `GROQ_MODEL` | Optional | `qwen/qwen3.8-27b` | Primary Groq model identifier (e.g., `qwen/qwen3.8-27b` or `llama-3.3-70b-versatile`). |
| `GROQ_MODEL_PREFERENCES` | Optional | `qwen/qwen3.8-27b,openai/gpt-oss-120b,llama-3.3-70b-versatile` | Fallback model list for Groq provider. |
| `GROQ_ENABLED` | Optional | `true` | Boolean flag toggling Groq provider availability (`true` or `false`). |
| `SUPPLIER_API_URL` | Optional | `http://127.0.0.1:8099` | Base URL of the external supplier sync API endpoint. |
| `SUPPLIER_API_KEY` | Optional | `""` | Bearer/header authentication key sent as `X-Api-Key` during supplier sync. |
| `OPENAI_API_KEY` | Optional | `""` | Placeholder key for optional future alternative LLM providers. |
| `ANTHROPIC_API_KEY` | Optional | `""` | Placeholder key for optional future alternative LLM providers. |

> **Security Guarantee:** Real credentials are never committed. `.env` is ignored by Git in `.gitignore`.

---

## 9. Database Seeding & Idempotency

Database initialization relies on `python manage.py seed_data`:
- **Catalogue Loading:** Parses `data/catalogue.csv` and executes `update_or_create(sku=sku, defaults=...)` inside an atomic transaction.
- **Dealers Loading:** Parses `data/dealers.csv` and executes `update_or_create(dealer_code=dealer_code, defaults=...)`.
- **Duplicate Prevention:** Re-running `python manage.py seed_data` updates matching records in-place without altering primary keys or generating duplicate SKUs or dealers.
- **Development Reset Procedure:**
  To reset local test data cleanly:
  ```bash
  python manage.py flush --no-input
  python manage.py migrate --noinput
  python manage.py seed_data
  ```

---

## 10. Running the Application

### 10.1 Running the Backend Server
Start the Django development server on port 8000:
```bash
python manage.py runserver 0.0.0.0:8000 --noreload
```

Verify backend health:
```bash
curl http://localhost:8000/api/health/
# Response: {"status": "ok"}
```

### 10.2 Running the Frontend Application (Optional)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173/`. Vite automatically proxies `/api/*` HTTP requests to the Django backend on `http://127.0.0.1:8000`.

---

## 11. AI Assistant

The assistant is accessible via `POST /api/assistant/chat/` and provides a production-grade conversational experience grounded in live PostgreSQL data.

### 11.1 Tool-Calling Loop & Available Tools
The assistant is registered with three server-executed tools:
1. `search_parts(query: str, vehicle: str = None)`:
   Searches parts across SKU, name, category, brand, and vehicle fitment. Applies automotive vocabulary typo corrections (e.g. "scliencer" $\rightarrow$ "silencer") and relevance ranking. Omits untrusted descriptions to prevent prompt injection.
2. `check_stock(sku: str)`:
   Fetches current real-time stock and price from `Product.objects.filter(sku__iexact=sku)`.
3. `create_draft_order(items: list[dict])`:
   Creates an official `DRAFT` order for the authenticated session's dealer. Dealer ID is server-locked; prices are fetched strictly from the database at execution time.

### 11.2 Multi-Provider Failover Architecture
The assistant uses a 3-tier resilient failover policy (`MultiProviderOrchestrator` in `core/assistant/providers.py`):
1. **Tier 1 (Google Gemini):** Primary provider using the `google-genai` SDK with strict JSON function declaration. Detects HTTP 429 quota exhaustion and model 404/503 errors.
2. **Tier 2 (Groq):** Secondary provider executing OpenAI-compatible function calling via the official `groq` SDK when Gemini is throttled or unconfigured.
3. **Tier 3 (Deterministic Grounded Engine):** Intent-aware database fallback engine ensuring 100% operational uptime when internet access or API quotas fail, synthesizing replies for parts searches, stock inquiries, reorder alerts, and draft order creation.

### 11.3 Safety Guardrails & Limitations
- **Permission Boundaries:** The assistant can **only** create `DRAFT` orders. It cannot confirm orders, deduct inventory, dispatch shipments, or alter catalogue prices.
- **Session Isolation:** Conversation turns are isolated by `session_id` in `AssistantConversation`.
- **Grounding & SKU Validation:** Any SKU mentioned in assistant replies is cross-checked against `Product.objects.filter(sku__in=candidates)` in `extract_cited_skus`. Unverified SKUs are stripped from `cited_skus`.
- **Known Limitations:** Retrieval relies on database multi-term matching and domain typo dictionaries; it lacks dense vector semantic understanding for abstract colloquial slang.

---

## 12. Machine Learning Demand Forecasting

The demand forecasting subsystem predicts weekly sales 4 weeks into the future across 40 designated automotive spare parts.

### 12.1 Forecasting Architecture (`HybridForecastPipeline`)
The production model in `forecasting/models.py` uses an adaptive hybrid strategy:
1. **Established Fast-Moving SKUs ($\ge 12$ weeks of history, continuous sales):**
   Trained with `HistGradientBoostingRegressor` using strictly shifted lag features ($t-1, t-2, t-4, t-8$), rolling statistics ($[t-4, t-1], [t-8, t-1]$), cumulative statistics, and known forward calendar features (`promo_flag`, `weeks_to_diwali`, `is_festive`, `week_of_year`, `sku_cat`). Predictions are generated recursively across the 4-week horizon.
2. **Intermittent / Slow-Moving SKUs (`zero_ratio > 0.4` or `mean_demand < 2.0`):**
   Forecasted using the **Syntetos-Boylan Approximation (SBA)** with smoothing parameter $\alpha = 0.1$. SBA applies a bias correction factor $(1 - \frac{\alpha}{2})$ to Croston's method, preventing systematic over-forecasting of rare demand.
3. **Short-History / New SKUs ($< 12$ weeks history, e.g. `BRK-1105`, `CHN-1006`):**
   Calculates regularized non-promotional baseline sales multiplied by an empirical promotional prior, preventing runaway variance.

### 12.2 Domain Adjustments
- **Moving Diwali Festival Seasonality:** Historical sales are indexed by dynamic astronomical distance to Diwali (`weeks_to_diwali`), learning festive pre-Diwali demand lifts from 2024 and 2025 without fixed-calendar day bias.
- **Empirical Bayesian Promotional Shrinkage:** Promotional uplift ratios are shrunk towards an empirical non-festive global prior ($R_{\text{prior}} \approx 1.85, k=3.0$), clipped strictly to $[1.2, 2.5]$. Anti-compounding dampeners prevent runaway multiplicative spikes when promotional campaigns overlap with Diwali.

### 12.3 Temporal Cross-Validation Results
Validation was conducted using chronological expanding-window splits across 4 historical cutoffs without lookahead data leakage:

| Model | Cutoff 2026-08-24 (WAPE) | Cutoff 2026-07-27 (WAPE) | Cutoff 2026-06-29 (WAPE) | Cutoff 2026-06-01 (WAPE) | **Mean WAPE** | **Mean MAE** | **Mean RMSE** |
|---|---|---|---|---|---|---|---|
| **Naive (Last Observed)** | 0.300 | 0.306 | 0.442 | 0.361 | **0.352** | 12.24 | 19.07 |
| **Moving Average (4-wk)** | 0.247 | 0.259 | 0.308 | 0.302 | **0.279** | 9.71 | 15.06 |
| **Seasonal Naive (Lag 52)**| 0.334 | 0.318 | 0.313 | 0.386 | **0.338** | 11.78 | 18.09 |
| **Original Rule-Based** | 0.222 | 0.231 | 0.269 | 0.249 | **0.243** | 8.45 | 11.95 |
| **HistGradientBoosting (ML)**| 0.214 | 0.197 | 0.244 | 0.186 | **0.210** | 7.30 | 10.36 |
| **Hybrid (ML + SBA) [Ours]**| **0.211** | **0.197** | **0.244** | **0.186** | **0.209** | **7.27** | **10.35** |

### 12.4 Forecast Artifact
The generated forecast is committed at `ml/forecast.csv`:
- **Format:** `sku,week_start,forecast_units`
- **Rows:** Exactly 160 rows ($40\text{ SKUs} \times 4\text{ target weeks}$).
- **Target Weeks:** `2026-09-28`, `2026-10-05`, `2026-10-12`, `2026-10-19`.
- **Integrity:** Strictly non-negative, finite numbers.

---

## 13. API Overview

All endpoints conform to [`API_CONTRACT.md`](file:///c:/VIKMO%20DealerDesk%20Assignment/API_CONTRACT.md):

| Category | Method & URL | Description |
|---|---|---|
| **Health** | `GET /api/health/` | System liveness probe returning `200 {"status": "ok"}`. |
| **Products** | `GET /api/products/` | Paginated product list. Query params: `search`, `category`, `vehicle`, `page`, `page_size`. |
| | `POST /api/products/` | Create new product (initial stock 0). Returns `409 DUPLICATE` if SKU exists. |
| | `GET /api/products/{sku}/` | Retrieve product details by SKU. |
| | `PATCH /api/products/{sku}/` | Partial update for price, description, etc. (SKU is immutable). |
| **Inventory** | `PUT /api/inventory/{sku}/` | Set live stock count: `{"quantity": 50, "reason": "..."}`. Returns `200`. |
| **Dealers** | `GET /api/dealers/` | Paginated list of authorized distributors. |
| | `POST /api/dealers/` | Register new distributor. Returns `409 DUPLICATE` on existing `dealer_code`. |
| | `GET /api/dealers/{id}/` | Retrieve dealer details by ID. |
| **Orders** | `POST /api/orders/` | Create a `DRAFT` order. Supports `Idempotency-Key` header. |
| | `GET /api/orders/` | Paginated list of orders filterable by `dealer_id` and `status`. |
| | `GET /api/orders/{order_number}/` | Retrieve complete order details with calculated tax and line items. |
| | `PUT /api/orders/{order_number}/` | Replace items of a `DRAFT` order. Returns `409 ORDER_LOCKED` if not in draft. |
| | `POST /api/orders/{order_number}/confirm/` | Atomically locks and deducts stock; transitions to `CONFIRMED`. |
| | `POST /api/orders/{order_number}/dispatch/`| Transitions `CONFIRMED` $\rightarrow$ `DISPATCHED`. |
| | `POST /api/orders/{order_number}/deliver/` | Transitions `DISPATCHED` $\rightarrow$ `DELIVERED`. |
| | `POST /api/orders/{order_number}/cancel/` | Cancels `DRAFT` or `CONFIRMED` orders (atomically restores stock). |
| **Assistant** | `POST /api/assistant/chat/` | Conversational endpoint with session memory and function calling. |
| **Forecasting** | `GET /api/forecast/{sku}/` | Returns 4-week demand predictions matching `ml/forecast.csv`. |
| | `GET /api/reorder-suggestions/` | Returns real-time replenishment suggestions across all 40 forecast SKUs. |
| **Sync** | `POST /api/sync/supplier/` | Triggers resilient external catalogue sync with cursor pagination and retries. |

---

## 14. Testing and Validation

### 14.1 Run Django Automated Tests (59 Tests)
Execute the complete backend test suite:
```bash
python manage.py test
```
*(Verified: Ran 59 tests in ~19.5s, 0 failures, 0 errors, OK).*

Run component test suites individually:
```bash
# AI Assistant, tools & failover tests (31 tests)
python manage.py test core.tests.test_assistant

# Demand forecasting & SBA validation tests (14 tests)
python manage.py test core.tests.test_forecasting

# Core orders, inventory, catalogue & supplier sync tests (14 tests)
python manage.py test core.tests.test_backend_core core.tests.test_supplier_sync
```

### 14.2 Run AI/ML Track Smoke Test (10/10 PASS)
Ensure the server is running on `http://127.0.0.1:8000`, then execute:
```bash
python smoke_test.py --base-url http://127.0.0.1:8000 --track aiml
```
*(Verified output: `10/10 checks passed`).*

### 14.3 Run Forecasting Temporal Cross-Validation
Run the 4-cutoff expanding-window evaluation:
```bash
python -m forecasting.evaluate
```

Generate or refresh `ml/forecast.csv`:
```bash
python -m forecasting.predict
```

### 14.4 Build Frontend Production Bundle
```bash
cd frontend
npm run build
```
*(Verified: Compiles 2,499 modules into `frontend/dist/` in <6 seconds with 0 errors).*

---

## 15. Optional Features Implemented

The submission implements several features beyond the AI/ML baseline:
1. **Full Order Engine Lifecycle (Part B):** Atomic stock reservation on confirmation, single-stock deduction guarantees under concurrency, idempotency hashing via `Idempotency-Key`, and stock restoration on cancellation.
2. **Resilient Supplier Synchronization (Part C):** Complete external catalogue synchronization client handling cursor pagination, exponential backoff, rate limiting (HTTP 429 `Retry-After`), and duplicate SKU conflict resolution.
3. **Interactive React SaaS Frontend Portal (Part E):** Complete responsive web application with KPI dashboard, product catalogue filters, order lifecycle slide-overs, AI assistant chat, and Recharts demand curve visualizations.

---

## Demo Video

[Watch the VIKMO DealerDesk Demo](https://youtu.be/Ry_5Y6CIHoI)

### Video Walkthrough Contents
The 5-minute video demonstration showcases:
- **Operations Dashboard:** Live inventory KPIs, network health indicator, and urgent reorder alert widgets.
- **AI Dealer Assistant in Action:** Real-time multi-turn conversational tool calling (`search_parts`, `check_stock`, and `create_draft_order`), interactive SKU badge citations, and server-side draft order creation with tax calculation.
- **Demand Forecasting Analytics:** 4-week forward forecast curve visualizations rendered using Recharts across the 40 focus SKUs.
- **Dynamic Reorder Calculations:** Real-time reorder recommendations combining lead time demand, sample variance $\sigma$, safety stock buffers, and live warehouse inventory.

---

## 17. Assumptions and Limitations

1. **Retrieval Mechanism:** Product search utilizes database token matching, vehicle fitment filters, and domain typo dictionaries (`difflib`). It does not currently use dense embedding vector indexes (e.g. `pgvector`).
2. **Promotional Prior on Sparse Data:** Promotional uplift calculation assumes an empirical non-festive baseline prior of $1.85\times$. SKUs with zero promotional history rely on this Bayesian prior.
3. **LLM Provider Availability:** The assistant gracefully falls back to Groq and the deterministic engine if Gemini API quotas are exhausted; however, optimal conversational nuance requires at least one active LLM API key.
4. **Single Warehouse Context:** Stock tracking assumes a unified central warehouse across South India without multi-depot routing.
5. **Authentication Scope:** In accordance with the assessment contract, API endpoints operate without user authentication tokens.

---

## 18. License

No license has been specified for this assessment repository.
