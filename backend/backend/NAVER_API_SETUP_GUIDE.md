# Naver Shopping API Setup Guide

## Current Issue

Getting 401 authentication error:
```
{"errorMessage":"Scope Status Invalid : Authentication failed.","errorCode":"024"}
```

This error typically means the Shopping API service needs to be enabled in Naver Developer Console.

## Solution: Enable Shopping API

### Step 1: Go to Naver Developer Console
1. Visit: https://developers.naver.com/apps/#/list
2. Find your application (the one with Client ID: `5qz1M21A__tRdVWpiqSB`)
3. Click on the application name to open settings

### Step 2: Enable "Shopping" API
1. Look for **"서비스 API"** (Service API) section
2. Find **"쇼핑"** (Shopping) in the list
3. **Enable/Activate** the Shopping API checkbox
4. Click **"수정"** (Modify) or **"저장"** (Save) at the bottom

### Step 3: Verify Settings
Make sure these are enabled:
- ✅ **쇼핑** (Shopping)
- Check if there are any usage limits or restrictions

### Step 4: Wait for Activation
- Sometimes it takes a few minutes for the API to be activated
- Try again after 5-10 minutes

---

## Alternative: Create New Application

If the above doesn't work, create a brand new application:

### Step 1: Create New App
1. Go to: https://developers.naver.com/apps/#/register
2. Click **"애플리케이션 등록"** (Register Application)

### Step 2: Fill in Details
- **애플리케이션 이름** (App Name): `BuyPilot Discovery`
- **사용 API** (APIs to Use):
  - ✅ **쇼핑** (Shopping)
- **환경 추가** (Add Environment):
  - **WEB 설정**: Add your domain (or http://localhost:3000 for testing)

### Step 3: Submit
- Click **"등록하기"** (Register)
- You'll get new **Client ID** and **Client Secret**

### Step 4: Update .env
Replace in `backend/.env`:
```env
NAVER_CLIENT_ID=<new_client_id>
NAVER_CLIENT_SECRET=<new_client_secret>
```

---

## Testing the API

After enabling, test with this command:

```bash
cd backend
python3 -c "
import requests
from urllib.parse import quote

client_id = 'YOUR_CLIENT_ID'
client_secret = 'YOUR_CLIENT_SECRET'

headers = {
    'X-Naver-Client-Id': client_id,
    'X-Naver-Client-Secret': client_secret
}

params = {
    'query': quote('청바지'),
    'display': 5
}

response = requests.get('https://openapi.naver.com/v1/search/shop.json',
                       headers=headers, params=params)

print(f'Status: {response.status_code}')
print(f'Response: {response.json()}')
"
```

Expected result: `Status: 200` with product list

---

## Common Issues

### Issue 1: "024 - Authentication failed"
**Cause**: Shopping API not enabled
**Solution**: Enable Shopping API in console (Step 2 above)

### Issue 2: "403 - Forbidden"
**Cause**: Domain not whitelisted
**Solution**: Add your domain in Web settings

### Issue 3: "429 - Rate limit"
**Cause**: Too many requests
**Solution**: Wait a few minutes, limit is 25,000/day

### Issue 4: Still not working
**Cause**: Old API version or deprecated endpoint
**Solution**: Check Naver API documentation for latest endpoint

---

## API Documentation

Official Naver Shopping Search API docs:
- Korean: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
- API Endpoint: `https://openapi.naver.com/v1/search/shop.json`
- Rate Limit: 25,000 requests/day
- Free tier available

---

## Next Steps After Setup

Once API is working:

1. ✅ API credentials are set in `.env`
2. ✅ Backend code is ready (`naver_shopping_api.py`)
3. ✅ Discovery endpoint is updated (`/discovery/analyze-competitor`)
4. 🔄 **Need to update frontend UI** (keyword input instead of URL)
5. 🔄 **Deploy to Railway** with new env vars

---

## Contact

If you continue having issues:
1. Check Naver Developer Console email for any verification requirements
2. Look for any pending approvals or restrictions
3. Try creating a completely new application
4. Check if there are any region restrictions (Korea only?)

---

**Date**: 2025-10-25
**Status**: Waiting for API activation
