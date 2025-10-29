# BuyPilot Backend Setup Guide

## Prerequisites
- Python 3.9+
- PostgreSQL database (Supabase, Railway, or local)
- OpenAI API key

## Installation Steps

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `SUPABASE_DB_URL`: Your PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key (for AI discovery)
- `JWT_SECRET`: Generate a secure random string
- Other API keys as needed

### 4. Database Setup

#### Option A: Using Supabase
1. Go to Supabase SQL Editor
2. Run migrations in order:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_add_taobao_fields.sql`
   - `database/migrations/003_background_jobs.sql`
   - `database/migrations/004_product_candidates.sql`

#### Option B: Using psql (Railway, local PostgreSQL)
```bash
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql
psql $DATABASE_URL -f database/migrations/002_add_taobao_fields.sql
psql $DATABASE_URL -f database/migrations/003_background_jobs.sql
psql $DATABASE_URL -f database/migrations/004_product_candidates.sql
```

### 5. Run the Application
```bash
python app.py
```

Server starts at `http://localhost:5000`

## AI Discovery System

### Architecture
```
AI Keyword Analysis (GPT-4)
    ↓
Taobao Product Search
    ↓
AI Product Scoring (GPT-3.5)
    ↓
User Approval
    ↓
Auto-register to Smartstore
```

### API Endpoints

#### Start AI Discovery
```bash
POST /api/v1/discovery/start
Content-Type: application/json

{
  "category": "fashion",
  "keyword_count": 5,
  "products_per_keyword": 10,
  "min_score": 70
}
```

#### Discover by Specific Keyword
```bash
POST /api/v1/discovery/keyword
Content-Type: application/json

{
  "keyword": "여름 원피스",
  "max_products": 20,
  "min_score": 70
}
```

#### List Product Candidates
```bash
GET /api/v1/candidates?status=scored&min_score=70&limit=50&offset=0
```

#### Get Candidate Details
```bash
GET /api/v1/candidates/{candidate_id}
```

#### Approve Candidate
```bash
POST /api/v1/candidates/{candidate_id}/approve
Content-Type: application/json

{
  "reviewed_by": "admin"
}
```

#### Reject Candidate
```bash
POST /api/v1/candidates/{candidate_id}/reject
Content-Type: application/json

{
  "reviewed_by": "admin",
  "rejection_reason": "품질이 낮음"
}
```

### Testing AI Discovery

#### 1. Start Discovery (Mock Mode)
Since Taobao API may not be configured, the system will use mock data:

```bash
curl -X POST http://localhost:5000/api/v1/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "category": "fashion",
    "keyword_count": 3,
    "products_per_keyword": 5,
    "min_score": 70
  }'
```

Response:
```json
{
  "ok": true,
  "data": {
    "category": "fashion",
    "keywords_analyzed": 3,
    "products_found": 15,
    "products_scored": 15,
    "products_saved": 12,
    "candidates": [...]
  }
}
```

#### 2. View Candidates
```bash
curl http://localhost:5000/api/v1/candidates?status=scored&min_score=70
```

#### 3. Approve a Candidate
```bash
curl -X POST http://localhost:5000/api/v1/candidates/{candidate_id}/approve \
  -H "Content-Type: application/json" \
  -d '{"reviewed_by": "admin"}'
```

## AI Components

### 1. Keyword Analyzer (`ai/keyword_analyzer.py`)
- Uses GPT-4 to analyze trending keywords
- Considers season, category, and market trends
- Fallback to curated keywords if API fails

### 2. Product Finder (`ai/product_finder.py`)
- Searches Taobao products by keyword
- Filters by price range, rating, and stock
- Mock data available for testing

### 3. Product Scorer (`ai/product_scorer.py`)
- **Sales Prediction** (35%): GPT-3.5 analyzes market potential
- **Price Competitiveness** (25%): CNY → KRW conversion with margin calculation
- **Quality Score** (25%): Rating, stock, seller reputation
- **Image Quality** (15%): Image count and availability

### 4. Discovery Service (`ai/discovery_service.py`)
- Orchestrates complete workflow
- Manages database persistence
- Handles errors and fallbacks

## Cost Estimation

### OpenAI API Costs (for 1000 products/month)
- **GPT-4** (keyword analysis): ~$10/month
- **GPT-3.5-turbo** (sales prediction): ~$20/month
- **Total**: ~$30/month for AI features

## Troubleshooting

### Issue: "top-api not found"
**Fixed**: The `top-api` package has been removed from requirements.txt. The system uses direct HTTP requests instead.

### Issue: "OPENAI_API_KEY not set"
**Solution**: Add your OpenAI API key to `.env` file

### Issue: "Database connection failed"
**Solution**: Check your `SUPABASE_DB_URL` in `.env` file

### Issue: "No products found"
**Expected**: If Taobao API is not configured, the system will generate mock products for testing. This is normal during development.

## Next Steps

1. ✅ Run migrations
2. ✅ Configure `.env` file
3. ✅ Test AI discovery endpoints
4. 🔄 Build frontend approval UI
5. 🔄 Configure actual Taobao API
6. 🔄 Implement Smartstore auto-registration
7. 🔄 Add image optimization service
8. 🔄 Add content translation service

## Database Options

The system works with any PostgreSQL database:

- **Supabase** (current): Managed PostgreSQL with good free tier
- **Railway**: Easy deployment with PostgreSQL addon
- **Neon**: Serverless PostgreSQL
- **Local PostgreSQL**: For development
- **Amazon RDS**: For production scale

To switch databases, just update `SUPABASE_DB_URL` in `.env` with your new PostgreSQL connection string.
