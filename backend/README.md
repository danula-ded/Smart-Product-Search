# Smart Product Search MVP - Backend Foundation (Stage 1)

This is the **first stage** of the Smart Product Search MVP backend development. This stage focuses on establishing a clean backend foundation with API contracts, domain models, and data schemas - without implementing actual search logic or complex features.

## Project Purpose

This MVP system is designed to provide personalized, intelligent product search capabilities. The backend will support:
- User queries for smart product search
- Product catalog management
- Search result personalization
- User feedback collection for continuous improvement

## Current Stage (Stage 1) - Backend Foundation

This stage establishes:
✅ Project structure and infrastructure  
✅ Domain models and entities  
✅ API request/response contracts  
✅ Endpoint signatures (stubs)  
✅ Data validation with Pydantic  
✅ Documentation and testing framework  

## NOT Implemented Yet

❌ Actual product search logic  
❌ NLP/LLM query parsing  
❌ Product catalog ingestion from Excel  
❌ Database persistence layer  
❌ User authentication/authorization  
❌ Frontend application  
❌ Search result ranking algorithms  
❌ Personalization engine  

---

## Quick Start

### Prerequisites
- Python 3.9+
- pip

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the API

From the `backend` directory:

```bash
python app/main.py
```

Or with uvicorn directly:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Running Tests

```bash
pytest tests/ -v
```

Run specific test class:
```bash
pytest tests/test_api.py::TestHealth -v
```

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py              # Application package
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Configuration settings
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py            # API endpoint definitions
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic models for requests/responses
│   │
│   ├── domain/
│   │   ├── __init__.py
│   │   └── models.py            # Domain models (business entities)
│   │
│   ├── services/
│   │   └── __init__.py          # Business logic layer (future)
│   │
│   ├── repositories/
│   │   └── __init__.py          # Data access layer (future)
│   │
│   └── utils/
│       └── __init__.py          # Utility functions (future)
│
├── tests/
│   ├── __init__.py
│   └── test_api.py              # API contract tests
│
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

---

## Domain Models & Entities

Core business entities defined in `app/domain/models.py`:

### Product
Represents an item from the product catalog.

**Searchable Fields** (used for matching user queries):
- `title` - Product name/title
- `manufacturer` - Producer/manufacturer name
- `model` - Product model identifier
- `category_name` - Name of the product category
- `attributes` - Product characteristics/specifications

**Metadata Fields** (for reference and display):
- `id` - Unique product identifier
- `category_id` - Category identifier
- `image_url` - Link to product image
- `country_origin` - Country of origin

### ParsedAttribute
Represents an extracted attribute from a user query.
```python
@dataclass
class ParsedAttribute:
    attribute_name: str      # e.g., "Color", "Size"
    attribute_value: str     # e.g., "Black", "Large"
    confidence: float        # Extraction confidence (0.0-1.0)
```

### ParsedQuery
Result of parsed user search query.
```python
@dataclass
class ParsedQuery:
    raw_query: str
    parsed_attributes: List[ParsedAttribute]
    search_categories: List[str]
    filters: Dict[str, Any]
```
*Note: Actual parsing implementation will be added in Stage 2 (NLP/LLM parsing)*

### SearchResultItem
Single search result with relevance score.
```python
@dataclass
class SearchResultItem:
    product: Product
    relevance_score: float   # 0.0 to 1.0
    match_reasons: List[str] # Why this result matched
```

### SavedResult
User's saved product for later reference.
```python
@dataclass
class SavedResult:
    id: str
    user_id: str
    product_id: str
    product: Product
    saved_at: datetime
    note: Optional[str]      # User's optional note
```

### Feedback
User feedback on search results for system improvement.
```python
@dataclass
class Feedback:
    id: str
    user_id: str
    product_id: str
    search_query: Optional[str]
    rating: Optional[int]         # 1-5 star rating
    is_relevant: Optional[bool]   # Was result relevant?
    comment: Optional[str]
    created_at: datetime
```

### UserEvent
Track user interactions with the system.
```python
@dataclass
class UserEvent:
    id: str
    user_id: str
    event_type: str          # 'search', 'view_product', 'save', 'feedback'
    event_data: Dict[str, Any]
    created_at: datetime
```

---

## API Endpoints

All endpoints currently return stub/empty responses. The actual implementation will follow in the next stages.

### Health Check

**GET** `/health`

Check if the API is running and healthy.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

---

### Search Products

**POST** `/search`

Perform a personalized product search based on user query.

**Request Body:**
```json
{
  "query": "black laptop with 16gb ram",
  "limit": 20,
  "offset": 0,
  "user_id": "user_123",
  "filters": {
    "category": "Electronics"
  }
}
```

**Response (200):**
```json
{
  "results": [],
  "total_count": 0,
  "query": "black laptop with 16gb ram",
  "limit": 20,
  "offset": 0
}
```

**Status:** Returns empty results in Stage 1. Full search logic will be implemented in Stage 2-3.

---

### Get Product Details

**GET** `/products/{product_id}`

Retrieve detailed information about a specific product.

**Parameters:**
- `product_id` (path) - The product ID

**Response (200):**
```json
{
  "id": "prod_001",
  "title": "Laptop ProBook",
  "manufacturer": "HP",
  "model": "ProBook 450",
  "category_id": "cat_001",
  "category_name": "Electronics",
  "image_url": "https://example.com/image.jpg",
  "country_origin": "USA",
  "attributes": [
    {"name": "RAM", "value": "16GB"},
    {"name": "Storage", "value": "512GB SSD"}
  ],
  "created_at": "2024-01-01T00:00:00"
}
```

**Status:** Returns stub response in Stage 1. Will integrate with product repository in Stage 2.

---

### Save Product

**POST** `/saved-results`

Save a product to the user's saved results list.

**Request Body:**
```json
{
  "user_id": "user_123",
  "product_id": "prod_001",
  "note": "Check this model later"
}
```

**Response (200):**
```json
{
  "success": true,
  "saved_result": null
}
```

**Status:** No persistence in Stage 1. Database integration in Stage 2.

---

### Get Saved Results

**GET** `/saved-results?user_id={user_id}`

Retrieve all products saved by a user.

**Query Parameters:**
- `user_id` - User ID (required)
- `limit` - Max results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response (200):**
```json
{
  "results": [],
  "total_count": 0
}
```

**Status:** Returns empty list in Stage 1. Database integration in Stage 2.

---

### Submit Feedback

**POST** `/feedback`

Submit feedback on search results or products.

**Request Body:**
```json
{
  "user_id": "user_123",
  "product_id": "prod_001",
  "search_query": "black laptop",
  "rating": 5,
  "is_relevant": true,
  "comment": "Great product and matches my search"
}
```

**Response (200):**
```json
{
  "success": true,
  "feedback_id": null
}
```

**Status:** No persistence in Stage 1. Will be used for feedback collection and system improvement in Stage 2+.

---

## Data Mapping: Catalog Fields

The product catalog provides the following fields. This section documents how they map to our domain model:

### Product Catalog Fields → Domain Model Mapping

| Catalog Field | Domain Model Field | Usage Type | Purpose |
|---|---|---|---|
| id | `Product.id` | Metadata | Unique product identifier |
| название сте | `Product.title` | Searchable | Product name for search matching |
| ссылка на картинку сте | `Product.image_url` | Metadata | Display in product details |
| модель | `Product.model` | Searchable | Model identification and search |
| страна происхождения | `Product.country_origin` | Metadata | Product origin information |
| производитель | `Product.manufacturer` | Searchable | Manufacturer matching in search |
| id категории | `Product.category_id` | Metadata | Category reference |
| название категории | `Product.category_name` | Searchable | Category filtering and search |
| характеристики | `Product.attributes` | Searchable | Detailed specs for matching |

### Fields Used for Different Purposes

**Search Matching** (searchable in queries):
- `title` - Free-form title search
- `manufacturer` - Brand/manufacturer matching
- `model` - Model identification
- `category_name` - Category filtering
- `attributes` - Characteristics/specs matching

**Metadata/Display** (not used for search):
- `id` - Reference identification
- `category_id` - Internal category reference
- `image_url` - Product image display
- `country_origin` - Origin information

---

## API Request/Response Contracts

All Pydantic schemas are defined in `app/schemas/schemas.py` with full validation and documentation.

Key features:
- Type hints for all fields
- Description and examples in schema
- Validation rules (min/max length, range, etc.)
- Optional vs required fields clearly marked
- JSON schema generation for API docs

---

## Tests

Minimal test suite in `tests/test_api.py`:

**Health Check Tests:**
- `test_health_endpoint_exists` - Verify health endpoint returns 200
- `test_health_response_schema` - Verify response structure
- `test_health_returns_version` - Verify version is returned

**Search Contract Tests:**
- `test_search_endpoint_exists` - Verify endpoint exists
- `test_search_response_schema` - Verify response structure
- `test_search_with_minimal_query` - Minimal request validation
- `test_search_respects_pagination_params` - Pagination handling
- `test_search_with_user_id` - Optional user_id parameter
- `test_search_with_filters` - Optional filters parameter

**Product Details Tests:**
- `test_get_product_exists` - Endpoint availability
- `test_get_product_response_schema` - Response structure validation
- `test_get_product_attributes_structure` - Attributes format

**Saved Results Tests:**
- `test_post_save_result_exists` - Save endpoint
- `test_post_save_result_response_schema` - Response format
- `test_get_saved_results_exists` - Get endpoint
- `test_get_saved_results_response_schema` - List format

**Feedback Tests:**
- `test_feedback_endpoint_exists` - Endpoint availability
- `test_feedback_response_schema` - Response format
- `test_feedback_with_rating` - Rating field handling
- `test_feedback_with_comment` - Comment field handling

Run all tests:
```bash
pytest tests/ -v
```

---

## Stage 1: What's Included ✅

- ✅ Clean, organized backend project structure
- ✅ FastAPI application with CORS middleware
- ✅ All endpoint signatures with proper decorators
- ✅ Pydantic models for request/response validation
- ✅ Domain models representing core business entities
- ✅ Comprehensive API documentation (Swagger/ReDoc)
- ✅ Type hints throughout the codebase
- ✅ Minimal test suite for API contracts
- ✅ Error handling structure (ready for implementation)
- ✅ README with API documentation and data mapping

---

## Stage 1: What's NOT Included ❌

### Coming in Stage 2 (Data & Persistence):
- Database schema and setup
- Product repository implementation
- User/saved results persistence
- Feedback storage
- Product catalog ingestion from Excel
- Database migration scripts

### Coming in Stage 3 (Search Logic):
- Query parsing and preprocessing
- Search ranking algorithms
- Relevance scoring
- Basic keyword matching

### Coming in Stage 4 (ML/LLM Integration):
- NLP query parsing
- LLM-based semantic understanding
- Advanced attribute extraction
- Query intent classification

### Coming in Stage 5 (Personalization):
- User profile creation and management
- Personalization engine
- User event tracking and analytics
- Recommendation algorithms
- A/B testing framework

### Future Stages:
- Frontend application
- Advanced filtering and faceted search
- User authentication/authorization
- API rate limiting and throttling
- Caching layer
- Full-text search optimization
- Analytics dashboard
- Admin panel

---

## Architecture Notes

### Layer Organization

The project follows a clean architecture pattern:

1. **API Layer** (`app/api/`) - Request handling and response formatting
2. **Schema Layer** (`app/schemas/`) - Request/response validation
3. **Domain Layer** (`app/domain/`) - Core business entities and logic
4. **Service Layer** (`app/services/`) - Business logic (to be implemented)
5. **Repository Layer** (`app/repositories/`) - Data access (to be implemented)
6. **Utils Layer** (`app/utils/`) - Helper functions and utilities

### Design Principles

- **No dead code** - All files have clear purpose
- **Single responsibility** - Each module has one reason to change
- **Type safety** - Full type hints for better IDE support and fewer runtime errors
- **Extensibility** - Structure allows easy addition of new features
- **Testability** - Clear interfaces for mocking and testing

---

## Dependencies (Stage 1)

| Package | Version | Purpose |
|---|---|---|
| fastapi | 0.104.1 | Web framework |
| uvicorn | 0.24.0 | ASGI server |
| pydantic | 2.4.2 | Data validation |
| pytest | 7.4.3 | Testing framework |
| pytest-asyncio | 0.21.1 | Async test support |
| httpx | 0.25.1 | HTTP client for tests |
| python-dotenv | 1.0.0 | Environment variables |

All dependencies are lightweight and focused on backend foundation.

---

## Next Steps (Stage 2+)

1. **Database Setup**
   - Choose database (PostgreSQL recommended for production)
   - Create schema based on domain models
   - Implement repository layer

2. **Product Ingestion**
   - Implement Excel parser
   - Create product loading scripts
   - Add data validation

3. **User Management**
   - Implement user authentication
   - Add user profile management
   - Track user events

4. **Search Implementation**
   - Implement basic keyword search
   - Add relevance scoring
   - Create query parser

5. **Feedback System**
   - Store and analyze user feedback
   - Generate improvement metrics

---

## Local Development

### Environment Setup

Create `.env` file in the `backend` directory if needed (optional for Stage 1):

```env
DEBUG=True
API_PORT=8000
```

### Code Style & Quality

The project is set up for:
- Type hints (enforced via IDE)
- Clear naming conventions
- Docstring documentation
- Logical code organization

### Adding New Endpoints

1. Define Pydantic schemas in `app/schemas/schemas.py`
2. Create route handler in `app/api/routes.py`
3. Add tests to `tests/test_api.py`
4. Document in this README

---

## API Documentation Access

Once the server is running:

- **Swagger UI** (Interactive): `http://localhost:8000/docs`
- **ReDoc** (Read-only): `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python app/main.py

# Run with auto-reload
uvicorn app.main:app --reload

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/test_api.py::TestHealth::test_health_endpoint_exists -v

# Generate test coverage
pytest tests/ --cov=app --cov-report=html
```

---

## Troubleshooting

### Import errors
Make sure you're running commands from the `backend` directory and that the virtual environment is activated.

### Port already in use
Change port: `python app/main.py --port 8001`

### Tests failing
Ensure pytest and dependencies are installed: `pip install -r requirements.txt`

---

## Project Timeline Context

- **Stage 1** (Current): Backend foundation ✅
- **Stage 2**: Database & persistence
- **Stage 3**: Basic search implementation  
- **Stage 4**: LLM/NLP integration
- **Stage 5**: Personalization engine
- **Future**: Frontend, advanced features

---

## License

This project is internal MVP development.

---

## Contact & Questions

For questions about this backend foundation stage or architecture decisions, refer to the documentation above or review the code comments.

**Key files to review:**
- `app/domain/models.py` - Core business entities
- `app/schemas/schemas.py` - API contracts
- `app/api/routes.py` - Endpoint definitions
- `tests/test_api.py` - API contract verification
