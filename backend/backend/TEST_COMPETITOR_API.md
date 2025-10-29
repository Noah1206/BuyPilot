# Competitor Analysis API Test

## Test 1: Analyze Competitor (Step 1)

```bash
curl -X POST https://buypilot-production.up.railway.app/api/v1/discovery/analyze-competitor \
  -H "Content-Type: application/json" \
  -d '{
    "seller_url": "https://smartstore.naver.com/wg0057/best?cp=1",
    "max_products": 10,
    "min_sales": 1000
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "seller_id": "wg0057",
    "total_products": 120,
    "filtered_products": 8,
    "products": [...]
  }
}
```

## Test 2: Check if endpoint exists

```bash
curl -X POST https://buypilot-production.up.railway.app/api/v1/discovery/analyze-competitor \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v 2>&1 | grep -A 10 "HTTP/"
```

## Test 3: Check backend logs

Railway CLI:
```bash
railway logs
```

## Common Issues

### Issue 1: Endpoint not found (404)
**Solution**: Backend not deployed yet. Need to commit and push.

### Issue 2: 500 Internal Server Error
**Solution**: Missing dependencies or Selenium setup issue.

### Issue 3: Timeout
**Solution**: Selenium Chrome driver not configured on Railway.

### Issue 4: CORS Error
**Solution**: Check ALLOWED_ORIGINS environment variable.
