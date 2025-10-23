# BuyPilot Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Backend Setup (2 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run backend
python app.py
```

Backend will start at **http://localhost:4070**

### 2. Frontend Setup (2 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Run frontend
npm run dev
```

Frontend will start at **http://localhost:3000**

### 3. Test the App (1 minute)

1. Open **http://localhost:3000** in your browser
2. Click **"Create Demo"** button to create a test order
3. You'll see a new order card appear
4. Click **"Purchase"** to execute the purchase
5. Wait a moment, then click **"Forward"** to send to forwarder
6. Watch the status badges update in real-time!

## ✅ What You Get

### Backend Features
- ✅ Flask REST API with CORS
- ✅ Order management endpoints
- ✅ Purchase execution (with idempotency)
- ✅ Forwarder shipping integration
- ✅ Webhook handlers (supplier + forwarder)
- ✅ JWT authentication utilities
- ✅ Structured JSON logging
- ✅ Health check endpoint

### Frontend Features
- ✅ VS Code Dark theme UI
- ✅ Real-time order dashboard
- ✅ Status badges with color coding
- ✅ Purchase & Forward action buttons
- ✅ Toast notifications
- ✅ Auto-refresh every 5 seconds
- ✅ Responsive grid layout
- ✅ Loading states

### Database Schema
- ✅ Products table (with AI scoring)
- ✅ Orders table (with state machine)
- ✅ Buyer info table
- ✅ Audit log table
- ✅ Performance indexes
- ✅ JSONB metadata support

## 📁 Project Structure

```
BuyPilot/
├── backend/           Flask API (Port 4070)
├── frontend/          Next.js App (Port 3000)
├── database/          SQL migrations
├── docs/             Documentation
└── README.md         Main documentation
```

## 🎨 VS Code Dark Theme

The UI features authentic VS Code Dark+ aesthetics:

- **Colors**: `#1e1e1e` background, `#cccccc` text, `#007acc` accents
- **Font**: Consolas monospace
- **Layout**: Top bar, sidebar, status bar (like VS Code)
- **Components**: Minimal borders, subtle shadows

## 🔄 Order Status Flow

```
PENDING → Purchase → SUPPLIER_ORDERING → ORDERED_SUPPLIER
  → Forward → FORWARDER_SENDING → SENT_TO_FORWARDER → DONE
```

## 🧪 Testing Without Database

The current version uses **in-memory storage** for quick testing. Orders are stored in Python dictionaries and will reset when you restart the backend.

To persist data:
1. Set up Supabase (see [deployment.md](docs/deployment.md))
2. Run database migrations
3. Update backend to use real database connection

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version (need 3.11+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```bash
# Check Node version (need 18+)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
Make sure backend is running on port 4070 and frontend on port 3000. The CORS is configured for `http://localhost:3000`.

### Orders not appearing
1. Check browser console for API errors
2. Verify backend is running: `curl http://localhost:4070/health`
3. Check backend logs in terminal

## 📚 Next Steps

1. **Database**: Set up Supabase and run migrations
2. **Deploy**: Deploy to Railway (see [deployment.md](docs/deployment.md))
3. **APIs**: Connect real supplier and forwarder APIs
4. **Auth**: Add user authentication
5. **AI**: Implement product matching with OpenAI

## 🔗 Important Links

- **Main Docs**: [README.md](README.md)
- **Deployment Guide**: [docs/deployment.md](docs/deployment.md)
- **API Spec**: [docs/api-spec.yaml](docs/api-spec.yaml)
- **Database Schema**: [database/README.md](database/README.md)

## 💡 Tips

- The demo order is created with random ID each time
- Backend auto-simulates order completion for testing
- Use browser DevTools to see API calls
- Check backend terminal for structured logs
- Orders auto-refresh every 5 seconds

## 🎉 You're All Set!

Your BuyPilot instance is running locally. Start creating orders and testing the workflow!

Need help? Check the full [README.md](README.md) or [deployment.md](docs/deployment.md).
