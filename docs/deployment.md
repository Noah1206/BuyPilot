# BuyPilot Deployment Guide

Complete deployment guide for Railway + Supabase infrastructure.

## Prerequisites

- [Railway account](https://railway.app)
- [Supabase account](https://supabase.com)
- GitHub account (optional, for CI/CD)
- Domain name (optional)

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in details:
   - **Name**: buypilot-db
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to Railway region
4. Wait for project creation (~2 minutes)

### 2. Get Database Connection String

1. Go to **Project Settings** → **Database**
2. Copy **Connection string** (URI format)
3. Save for later:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. Run Migrations

1. Go to **SQL Editor** in Supabase
2. Create new query
3. Copy contents of `database/migrations/001_initial_schema.sql`
4. Click **Run**
5. Repeat for `002_indexes.sql`

### 4. Verify Tables

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Should show: products, orders, buyer_info, audit_log
```

## 🚂 Backend Deployment (Railway)

### 1. Create Railway Project

```bash
cd backend
railway login
railway init
# Choose "Create new project"
# Name: buypilot-backend
```

### 2. Configure Environment Variables

In Railway dashboard, add these variables:

```bash
# Database
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Supplier API
SUPPLIER_API_KEY=your-supplier-api-key
SUPPLIER_API_URL=https://api.supplier.com

# Forwarder API
FORWARDER_API_KEY=your-forwarder-api-key
FORWARDER_API_URL=https://api.forwarder.com

# CORS
ALLOWED_ORIGINS=https://your-frontend.railway.app

# Flask
FLASK_ENV=production
FLASK_DEBUG=False
PORT=8000
```

### 3. Deploy Backend

```bash
railway up
# Railway will detect Python and install dependencies
# Check logs: railway logs
```

### 4. Get Backend URL

1. Go to Railway dashboard
2. Click on backend service
3. Go to **Settings** → **Networking**
4. Click **Generate Domain**
5. Save URL: `https://buypilot-backend-production.up.railway.app`

### 5. Test Backend

```bash
curl https://your-backend.railway.app/health
# Should return: {"ok": true, "status": "healthy"}
```

## 🎨 Frontend Deployment (Railway)

### 1. Create Frontend Service

```bash
cd frontend
railway init
# Choose same project as backend
# Create new service
# Name: buypilot-frontend
```

### 2. Configure Environment Variables

In Railway dashboard (frontend service):

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 3. Deploy Frontend

```bash
railway up
# Railway will detect Next.js and build
```

### 4. Generate Domain

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. You'll get: `https://buypilot-frontend-production.up.railway.app`

### 5. Update Backend CORS

Go back to backend environment variables and update:
```bash
ALLOWED_ORIGINS=https://your-frontend.railway.app,http://localhost:3000
```

Redeploy backend:
```bash
cd backend
railway up --detach
```

## 🔗 Connect Everything

### Update Frontend API URL

If you generated domain after initial deploy:

1. Update frontend env var in Railway
2. Redeploy frontend:
   ```bash
   cd frontend
   railway up --detach
   ```

### Test Integration

1. Open frontend URL
2. Click "Create Demo"
3. Verify order appears
4. Test Purchase and Forward buttons

## 🔒 Security Checklist

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Use production API keys (not sandbox)
- [ ] Enable Supabase backups
- [ ] Set up Railway notifications
- [ ] Configure Supabase connection pooling
- [ ] Add rate limiting (future)
- [ ] Set up SSL (Railway auto-provides)

## 📊 Monitoring

### Railway Metrics

- CPU usage
- Memory usage
- Request count
- Error rate

Access via **Metrics** tab in Railway dashboard.

### Supabase Monitoring

- Database size
- Active connections
- Query performance
- Logs

Access via **Database** → **Reports** in Supabase.

### Logs

**Backend logs:**
```bash
cd backend
railway logs
```

**Frontend logs:**
```bash
cd frontend
railway logs
```

**Filter by time:**
```bash
railway logs --since 1h
```

## 🚨 Troubleshooting

### Backend won't start

1. Check environment variables are set
2. Verify `SUPABASE_DB_URL` is correct
3. Check logs: `railway logs`
4. Test database connection

### Frontend can't reach backend

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS settings in backend
3. Test backend health endpoint
4. Check browser console for errors

### Database connection errors

1. Verify Supabase project is running
2. Check connection string format
3. Whitelist Railway IP (if restricted)
4. Test connection with `psql`

### Orders not processing

1. Check backend logs for errors
2. Verify supplier/forwarder API keys
3. Test idempotency key generation
4. Check audit_log table for failures

## 🔄 Updates and Rollbacks

### Deploy Updates

**Backend:**
```bash
cd backend
git add .
git commit -m "Update backend"
railway up
```

**Frontend:**
```bash
cd frontend
git add .
git commit -m "Update frontend"
railway up
```

### Rollback

Railway keeps deployment history:

1. Go to **Deployments** tab
2. Find previous successful deployment
3. Click **Redeploy**

## 📈 Scaling

### Railway Pro Plan

- More resources per service
- Higher connection limits
- Better performance

### Database Optimization

**Connection pooling:**
```sql
-- In Supabase settings
Max connections: 100
Pool size: 15
```

**Indexes:**
Already included in `002_indexes.sql`

### Caching

Add Redis for:
- Idempotency cache
- API response cache
- Session storage

## 🌐 Custom Domain (Optional)

### Frontend Custom Domain

1. Go to Railway dashboard (frontend)
2. Click **Settings** → **Networking**
3. Click **Add Custom Domain**
4. Enter domain: `app.yourdomain.com`
5. Add CNAME record in your DNS:
   ```
   CNAME: app.yourdomain.com → your-frontend.railway.app
   ```

### Backend Custom Domain

1. Repeat for backend service
2. Use: `api.yourdomain.com`
3. Update frontend `NEXT_PUBLIC_API_URL`

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] Database migrations run
- [ ] Backend deployed to Railway
- [ ] Backend environment variables set
- [ ] Backend health check passes
- [ ] Frontend deployed to Railway
- [ ] Frontend environment variables set
- [ ] Frontend can reach backend
- [ ] Demo order creation works
- [ ] Purchase action works
- [ ] Forward action works
- [ ] Logs are accessible
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Team notified of URLs

## 🎉 Success!

Your BuyPilot instance is now live:

- **Frontend**: https://your-frontend.railway.app
- **Backend**: https://your-backend.railway.app
- **Database**: Supabase managed PostgreSQL

Next steps:
- Set up real supplier/forwarder API integrations
- Add authentication for users
- Configure production monitoring
- Set up CI/CD with GitHub Actions
