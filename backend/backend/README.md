# BuyPilot

AI-powered semi-automated purchase and forwarding system with Railway + Supabase.

## 🎯 Overview

BuyPilot automates the entire order fulfillment process from supplier ordering to forwarder shipping, requiring only **two approval buttons**:
1. **Purchase Execution** - Approve supplier order
2. **Forward Shipping** - Approve forwarder shipment

### Key Features
- 🤖 AI-driven product matching and evaluation
- 🔄 Automated state machine workflow
- 🛡️ Idempotency-safe API operations
- 📊 Real-time order tracking
- 🎨 VS Code Dark theme UI

## 🏗️ Architecture

```
Frontend (Next.js)  →  Backend (Flask)  →  Database (Supabase PostgreSQL)
                              ↓
                    External APIs (Supplier, Forwarder)
```

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Flask 3.0 + APScheduler
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Railway
- **AI**: OpenAI API (for product matching)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Railway account (optional, for deployment)

### Backend Setup

1. **Install dependencies**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Run backend**
```bash
python app.py
# Server runs on http://localhost:4070
```

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
```

3. **Run frontend**
```bash
npm run dev
# App runs on http://localhost:3000
```

### Database Setup

1. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy database URL

2. **Run migrations**
   - Open Supabase SQL Editor
   - Run `database/migrations/001_initial_schema.sql`
   - Run `database/migrations/002_indexes.sql`

## 📁 Project Structure

```
BuyPilot/
├── backend/                # Flask API
│   ├── app.py             # Main application
│   ├── routes/            # API endpoints
│   │   ├── orders.py      # Order management
│   │   ├── purchase.py    # Purchase execution
│   │   ├── forward.py     # Forwarder shipping
│   │   └── webhooks.py    # External webhooks
│   ├── utils/             # Utilities
│   │   ├── auth.py        # JWT authentication
│   │   ├── logger.py      # Structured logging
│   │   └── idempotency.py # Idempotency handling
│   └── requirements.txt   # Python dependencies
│
├── frontend/              # Next.js app
│   ├── app/              # App router
│   │   ├── layout.tsx    # Root layout (VS Code theme)
│   │   ├── page.tsx      # Dashboard
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── OrderCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ActionButtons.tsx
│   └── lib/
│       └── api.ts        # API client
│
├── database/             # Database migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_indexes.sql
│   └── README.md
│
├── docs/                 # Documentation
└── railway.json          # Railway deployment config
```

## 🔄 Order Flow

```
PENDING
  ↓ [User clicks "Purchase"]
SUPPLIER_ORDERING
  ↓ [Supplier confirms]
ORDERED_SUPPLIER
  ↓ [User clicks "Forward"]
FORWARDER_SENDING
  ↓ [Forwarder accepts]
SENT_TO_FORWARDER
  ↓ [Delivery confirmed]
DONE
```

## 🎨 UI Design

The frontend uses **Visual Studio Code Dark+ theme** aesthetics:
- Background: `#1e1e1e`, `#252526`, `#2d2d30`
- Text: `#cccccc`, `#858585`
- Accents: Blue `#007acc`, Green `#4ec9b0`, Red `#f48771`
- Typography: Consolas, monospace
- Minimal borders and subtle shadows

## 🔌 API Endpoints

### Orders
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/events/order-created` - Create order

### Actions
- `POST /api/v1/orders/:id/actions/execute-purchase` - Execute purchase
- `POST /api/v1/orders/:id/actions/send-to-forwarder` - Send to forwarder

### Webhooks
- `POST /api/v1/webhooks/supplier` - Supplier callbacks
- `POST /api/v1/webhooks/forwarder` - Forwarder callbacks

All write operations require `Idempotency-Key` header.

## 🚢 Deployment

### Railway Deployment

1. **Backend**
```bash
cd backend
railway login
railway init
railway up
```

2. **Frontend**
```bash
cd frontend
railway init
railway up
```

3. **Environment Variables**
   - Set in Railway dashboard
   - Backend: `SUPABASE_DB_URL`, `JWT_SECRET`, API keys
   - Frontend: `NEXT_PUBLIC_API_URL`

### Supabase Configuration
- Enable connection pooling
- Set appropriate resource limits
- Configure backups

## 🧪 Testing

### Create Demo Order
Use the "Create Demo" button in the UI, or via API:

```bash
curl -X POST http://localhost:4070/api/v1/events/order-created \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "smartstore",
    "platform_order_ref": "TEST-001",
    "items": [{"product_source_url": "https://example.com/product", "qty": 1, "price": 29.99}],
    "buyer": {"name": "홍길동", "phone": "010-1234-5678", "address1": "서울시 강남구", "zip": "06234", "country": "KR"}
  }'
```

## 📊 Monitoring

- Structured JSON logs with order_id/job_id tagging
- Railway built-in monitoring
- Supabase database metrics

## 🔒 Security

- JWT authentication for admin users
- Idempotency keys prevent duplicate operations
- HMAC signature verification for webhooks
- Input validation and sanitization
- Environment-based secrets management

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙋 Support

For issues and questions:
- Open GitHub issue
- Check documentation in `/docs`
- Review database schema in `/database/README.md`

---

**Built with ❤️ using Railway + Supabase**
# BuyPilot
# Force deploy
