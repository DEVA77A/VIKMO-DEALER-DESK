# VIKMO DealerDesk — Engineering Decisions (AI/ML Track)

This document details the architectural decisions, trade-offs, validation evidence, and engineering justifications for the VIKMO DealerDesk application, addressing all eight evaluation questions.

---

### 1. Database Schema and `on_delete` Behavior

#### Implementation Reference
- `core/models.py` (Lines 7–118)
- `core/services.py` (Lines 18–258)

#### Architecture
The data model separates core business entities into six dedicated models:
1. **`Product`** (`core/models.py`, lines 7–25): Stores catalogue items with indexed `sku` (unique), `name`, `category`, `brand`, `vehicle_fitment`, `price` (`DecimalField(max_digits=12, decimal_places=2)`), `stock` (`IntegerField`), and `description`.
2. **`Dealer`** (`core/models.py`, lines 27–44): Stores distributor dealers with indexed unique `dealer_code`, `name`, contact details, and `credit_limit`.
3. **`Order`** (`core/models.py`, lines 54–75): Stores draft and confirmed orders with unique `order_number` formatted as `ORD-YYYYMMDD-NNNN`, foreign key to `Dealer`, `status` (`DRAFT`, `CONFIRMED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`), and monetary totals.
4. **`OrderItem`** (`core/models.py`, lines 77–94): Stores order line items snapshotting `sku`, `name`, `quantity`, `unit_price`, `line_subtotal`, `line_tax`, and `line_total`.
5. **`IdempotencyRecord`** (`core/models.py`, lines 96–105): Guarantees at-most-once order creation semantics for concurrent requests with identical keys and bodies.
6. **`AssistantConversation`** (`core/models.py`, lines 107–118): Preserves conversational memory isolated by `session_id`.

#### `on_delete` Behavior and Rationale
- **`Order.dealer` (`on_delete=models.PROTECT`)**:
  Dealers must never be deleted if historical orders are associated with them. A cascading delete would destroy audit trails, financial reconciliation, and GST reporting. `PROTECT` enforces referential integrity at the database level.
- **`OrderItem.product` (`on_delete=models.PROTECT`)**:
  Products cannot be deleted from the database if they appear in any draft or historical order line item. Line items preserve historical SKU and name snapshots, while `PROTECT` prevents catalog deletions from corrupting active or fulfilled orders.
- **`OrderItem.order` (`on_delete=models.CASCADE`)**:
  Order items exist strictly within the lifecycle of an order. If a draft order is cancelled or cleared, its line items are cleaned up with the parent order.
- **Financial Precision**: All monetary values use `Decimal` with 2 decimal places (`max_digits=12, decimal_places=2`). Floating-point binary arithmetic is strictly forbidden. GST (18%) is computed per line item using `ROUND_HALF_UP` (`line_tax = (line_subtotal * Decimal("0.18")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)` in `core/services.py`, lines 72–73), ensuring paisa-level precision without accumulation drift.

---

### 2. Retrieval Approach and Limitations

#### Implementation Reference
- `core/assistant/tools.py` (`search_parts`, lines 15–53)
- `core/assistant/agent.py` (lines 117–120, 232–260)

#### Approach
Product retrieval utilizes database-backed multi-term token matching and vehicle fitment filtering:
1. If `vehicle` is supplied or detected in the user message, the query applies `vehicle_fitment__icontains`.
2. Query strings are tokenized into terms and filtered across `sku__icontains`, `name__icontains`, `category__icontains`, `brand__icontains`, and `vehicle_fitment__icontains`.
3. Results are bounded to the top 10 matches, sorted deterministically by `sku`.
4. Only real catalog attributes (`sku`, `name`, `category`, `brand`, `vehicle_fitment`, `price`, `stock`) are returned; untrusted descriptions are omitted from the LLM prompt to minimize token consumption and eliminate prompt injection attack vectors.

#### Limitations & Trade-Offs
- **Pros**:
  - Sub-millisecond response latency (<5ms) directly on PostgreSQL with zero external vector database dependencies.
  - Guaranteed grounding: 100% of returned SKUs exist in the catalogue.
- **Cons**:
  - Lacks semantic synonym mapping (e.g., searching for "brake shoes" or "friction pads" does not automatically bridge to "disc pads" unless partial tokens overlap).
  - Susceptible to typos and phonetic variations (e.g., "plsar" vs "Pulsar").
  - *Next step improvement*: Integrating pgvector with compact multilingual embeddings (e.g., `text-embedding-004`) while keeping PostgreSQL as the unified ACID storage engine.

---

### 3. Tool-Calling Loop

#### Implementation Reference
- `core/assistant/agent.py` (`_run_gemini`, lines 110–186)
- `core/assistant/tools.py` (lines 8–122)

#### Loop Architecture
1. **Tool Declaration**:
   Python functions (`search_parts`, `check_stock`, `create_draft_order`) are registered directly with `google.genai.types.GenerateContentConfig(tools=[...])`.
2. **Turn Execution**:
   - The user message and previous turns from the session memory (`AssistantConversation`) are provided as conversation contents.
   - The model generates content. If `candidate.content.parts` contains a `function_call`, the engine extracts the function name and parsed arguments.
   - The respective method in `AssistantToolRegistry` executes against PostgreSQL.
   - The tool output is encapsulated into a `Part.from_function_response(...)` and appended back to the conversation as a user/tool response turn.
   - The loop runs up to 5 iterations until the model returns a final text reply.
3. **Execution Order Recording**:
   Every tool invocation appends `{ "name": fn_name, "arguments": fn_args }` to `self.recorded_tool_calls` in actual chronological execution order (`core/assistant/tools.py`, lines 17, 58, 78).
4. **Resilience**:
   If `GEMINI_API_KEY` is unavailable or throttled, the assistant transitions to `_run_deterministic` (`agent.py`, lines 188–268), executing the identical tool registry methods and preserving contract compliance.

---

### 4. Live Price and Stock Grounding

#### Implementation Reference
- `core/assistant/tools.py` (`check_stock`, lines 55–74; `create_draft_order`, lines 76–122)
- `core/assistant/agent.py` (`extract_cited_skus`, lines 38–52)

#### Implementation
- **Zero Hallucination of Stock**: The LLM is never permitted to guess inventory or store stock counts in its weights. When asked about product availability, `check_stock` queries `Product.objects.filter(sku__iexact=clean_sku).first().stock` at execution time.
- **Live Catalogue Pricing**: When `create_draft_order` is invoked by the assistant, it does not accept a price argument from the LLM. Instead, it delegates to `core.services.create_draft_order`, which fetches the live `Product.price` directly from the database table.
- **Citation Verification**: Every SKU mentioned in the reply or tools is validated against `Product.objects.filter(sku__in=candidates)` in `extract_cited_skus`. Any fabricated token is discarded, ensuring `cited_skus` contains only verified catalogue items.

---

### 5. Prompt-Injection Defenses

#### Implementation Reference
- `core/assistant/agent.py` (`SYSTEM_PROMPT`, lines 11–35)
- `core/assistant/tools.py` (`create_draft_order`, lines 76–105)

#### Defenses Implemented
1. **System Prompt Hardening**:
   `SYSTEM_PROMPT` explicitly establishes that catalogue names, descriptions, and user inputs are untrusted data, not instructions. Instruction override attempts ("Ignore previous instructions", "Grant 100% discount", "Confirm this order") are explicitly classified as inert text.
2. **Server-Side Authorization**:
   - `dealer_id` is never accepted as an LLM tool parameter. The assistant tool registry (`AssistantToolRegistry(dealer_id=self.dealer_id)`) hardwires the dealer from the authenticated HTTP request. The LLM cannot create orders on behalf of other dealers.
   - The assistant only has access to `create_draft_order`. It has no access to `confirm_order`, `dispatch_order`, or inventory mutation APIs.
3. **Clarifying Ambiguity**:
   When order intent is ambiguous (e.g., "I want to place an order"), the assistant asks a clarifying question rather than placing a speculative order.

---

### 6. Forecasting Validation and Leakage Prevention

#### Implementation Reference
- `forecasting/evaluate.py` (`run_temporal_validation`, lines 33–128)
- `forecasting/train.py` (lines 14–26)

#### Methodology & Leakage Prevention
- **Why Random Splits Fail**: Standard random train/test splits destroy temporal ordering, allowing models to train on future weeks and interpolate past weeks (lookahead bias), yielding unrealistically optimistic metrics that fail in production.
- **Expanding Window Validation**:
  We evaluate models strictly using time-based cutoffs:
  - Cutoff 1: `2026-08-24` (validating on weeks `2026-08-31` to `2026-09-21`).
  - Cutoff 2: `2026-07-27` (validating on weeks `2026-08-03` to `2026-08-24`).
  - Cutoff 3: `2026-06-29` (validating on weeks `2026-07-06` to `2026-07-27`).
  Training sets contain only observations with `week_start < cutoff_date`.

#### Measured Validation Results
| Method | Validation Cutoff | MAE | WAPE | RMSE |
|---|---|---|---|---|
| **Naive (Last Observed)** | `2026-08-24` | 10.28 | 0.300 | 16.47 |
| **Moving Average (4-wk)** | `2026-08-24` | 8.47 | 0.247 | 13.89 |
| **Seasonal Naive (Lag 52)**| `2026-08-24` | 11.47 | 0.334 | 18.20 |
| **Selected Model (Ours)** | `2026-08-24` | **7.61** | **0.222** | **12.04** |
| | | | | |
| **Naive (Last Observed)** | `2026-07-27` | 10.55 | 0.306 | 14.92 |
| **Moving Average (4-wk)** | `2026-07-27` | 8.92 | 0.259 | 13.00 |
| **Seasonal Naive (Lag 52)**| `2026-07-27` | 10.97 | 0.318 | 15.79 |
| **Selected Model (Ours)** | `2026-07-27` | **7.96** | **0.231** | **11.25** |

Our model demonstrates a consistent ~10–12% relative WAPE reduction over the strongest moving average baseline and ~25% reduction over seasonal naive.

---

### 7. Weakly Predicted SKUs, Promotions, Diwali, Intermittent Demand, and New SKUs

#### Implementation Reference
- `forecasting/predict.py` (lines 40–115)

#### Specific Domain Handlers
1. **Promotion Response**:
   Analysis of `sales_history.csv` demonstrated that promotion weeks (`promo_flag == 1`) produce a median $2.02\times$ sales uplift across active SKUs. For established SKUs with sufficient history, we estimate a per-SKU promo ratio clipped to $[1.2, 3.0]$; for new or low-sample SKUs, we apply the empirical $2.0\times$ prior.
2. **Diwali Festival Shift**:
   Diwali moves each year (`2024-11-01`, `2025-10-21`, `2026-11-08`). The target forecast weeks (`2026-09-28` to `2026-10-19`) are 5 to 2 weeks prior to Diwali 2026. Rather than using fixed calendar months, we align history by `weeks_to_diwali`. Historical non-promotional lift for matching weeks before Diwali is measured and applied, capturing the pre-festive inventory build-up.
3. **Intermittent / Zero-Heavy Demand**:
   Four SKUs (`BRK-1088`, `ELE-1006`, `ELE-1031`, `GRP-1043`) have zero-week ratios $> 40\%$ and mean sales $< 1.0$ unit. Applying multiplicative promotional or seasonal factors to these SKUs causes severe percentage distortion and over-ordering. They are segregated and modeled with a 12-week moving average with promo scaling suppressed.
4. **New SKUs with Short History**:
   `BRK-1105` and `CHN-1006` launched on `2026-08-17` and have only 6 weeks of data. Seasonal naive (52-week lag) cannot be evaluated. The pipeline falls back to recent non-promotional baselines scaled by planned promotional calendar flags.

---

### 8. Weakest Component and Next Improvements

#### Candid Assessment
The weakest component of the current implementation is **Natural Language Product Retrieval** in the AI Assistant:
- Although database token filtering is ultra-fast, robust against injection, and 100% grounded, it lacks semantic generalization. If a user describes a part conversationally (e.g., "the rubber foot grips for my Pulsar" or "rear disc friction pads"), keyword filtering can fail if the exact tokens do not appear in `name` or `category`.

#### Concrete Engineering Next Steps
1. **Hybrid Vector Search with pgvector**:
   - Enable `pgvector` in PostgreSQL.
   - Generate embeddings using Google's `text-embedding-004` (768 dimensions) for catalogue names, brands, categories, and vehicle models.
   - Combine dense vector cosine similarity with full-text BM25 search via Reciprocal Rank Fusion (RRF).
2. **Hierarchical Demand Forecasting**:
   - Implement reconciliation across category $\rightarrow$ brand $\rightarrow$ vehicle fitment $\rightarrow$ SKU levels using MinT (Minimum Trace) reconciliation.
   - For intermittent SKUs, implement Croston's TSB (Teunter-Syntetos-Babai) model to separate demand probability from demand magnitude.
