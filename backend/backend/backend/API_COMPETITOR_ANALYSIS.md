# Competitor Analysis API Reference

Quick reference for Phase 4 competitor analysis endpoints.

## Base URL
```
http://localhost:4070/api/v1
```

## Workflow

```
1. Analyze Competitor → 2. Match Taobao → 3. Calculate Prices → 4. Export Excel
```

---

## 1. Analyze Competitor

Scrape SmartStore seller's best products.

### Endpoint
```http
POST /discovery/analyze-competitor
```

### Request
```json
{
  "seller_url": "https://smartstore.naver.com/wg0057/best?cp=1",
  "max_products": 100,
  "min_sales": 1000
}
```

### Parameters
- `seller_url` (required): SmartStore best products page URL
- `max_products` (optional): Maximum products to analyze (default: 100)
- `min_sales` (optional): Minimum purchase count filter (default: 1000)

### Response
```json
{
  "ok": true,
  "data": {
    "seller_id": "wg0057",
    "total_products": 120,
    "filtered_products": 85,
    "products": [
      {
        "title": "기모 맨투맨 남녀공용 오버핏",
        "price": 29900,
        "image_url": "https://shop-phinf.pstatic.net/...",
        "product_url": "https://smartstore.naver.com/wg0057/products/123456",
        "review_count": 1234,
        "purchase_count": 5678,
        "rating": 4.8,
        "rank": 1,
        "popularity_score": 85.5
      }
    ]
  }
}
```

### cURL Example
```bash
curl -X POST http://localhost:4070/api/v1/discovery/analyze-competitor \
  -H "Content-Type: application/json" \
  -d '{
    "seller_url": "https://smartstore.naver.com/wg0057/best?cp=1",
    "max_products": 100,
    "min_sales": 1000
  }'
```

---

## 2. Match Taobao Batch

Find matching Taobao products for SmartStore items.

### Endpoint
```http
POST /discovery/match-taobao-batch
```

### Request
```json
{
  "products": [
    {
      "title": "기모 맨투맨 남녀공용 오버핏",
      "price": 29900,
      "image_url": "https://..."
    }
  ],
  "max_candidates": 3
}
```

### Parameters
- `products` (required): Array of SmartStore products from step 1
- `max_candidates` (optional): Number of Taobao candidates per product (default: 3)

### Response
```json
{
  "ok": true,
  "data": {
    "total_products": 100,
    "matched_count": 95,
    "failed_count": 5,
    "matches": [
      {
        "smartstore_product": {
          "title": "기모 맨투맨 남녀공용 오버핏",
          "price": 29900,
          "image_url": "https://..."
        },
        "taobao_candidates": [
          {
            "taobao_id": "12345678",
            "title": "加绒卫衣男女情侣宽松",
            "price_cny": 89.0,
            "image_url": "https://...",
            "rating": 4.9,
            "sold_count": 10000,
            "similarity_score": 0.85,
            "taobao_url": "https://item.taobao.com/item.htm?id=12345678"
          }
        ],
        "best_match": {
          "taobao_id": "12345678",
          "similarity_score": 0.85
        }
      }
    ],
    "failed_products": [
      {
        "title": "상품명",
        "error": "No matching Taobao products found"
      }
    ]
  }
}
```

### cURL Example
```bash
curl -X POST http://localhost:4070/api/v1/discovery/match-taobao-batch \
  -H "Content-Type: application/json" \
  -d '{
    "products": [...],
    "max_candidates": 3
  }'
```

---

## 3. Calculate Prices

Auto-calculate selling prices with shipping and margin.

### Endpoint
```http
POST /discovery/calculate-prices
```

### Request
```json
{
  "products": [
    {
      "title": "기모 맨투맨 남녀공용 오버핏",
      "taobao_price_cny": 89.0,
      "taobao_id": "12345678"
    }
  ],
  "target_margin": 0.35
}
```

### Parameters
- `products` (required): Array of products with Taobao prices
- `target_margin` (optional): Target profit margin ratio (default: 0.35 = 35%)

### Response
```json
{
  "ok": true,
  "data": {
    "exchange_rate": 190.5,
    "products": [
      {
        "title": "기모 맨투맨 남녀공용 오버핏",
        "taobao_id": "12345678",
        "taobao_price_cny": 89.0,
        "taobao_price_krw": 16945,
        "exchange_rate": 190.5,
        "shipping_fee": 7000,
        "shipping_details": {
          "weight_used": 0.4,
          "calculation_method": "estimated",
          "estimated": true
        },
        "total_cost": 23945,
        "target_margin": 0.35,
        "selling_price": 36838,
        "selling_price_rounded": 36800,
        "expected_profit": 12855,
        "actual_margin": 0.349
      }
    ]
  }
}
```

### Selling Price Formula
```
판매가 = (타오바오 가격 × 환율 + 배송비) ÷ (1 - 마진율)
Example: (89 × 190.5 + 7000) ÷ (1 - 0.35) = 36,838원 → 36,800원 (100원 단위)
```

### cURL Example
```bash
curl -X POST http://localhost:4070/api/v1/discovery/calculate-prices \
  -H "Content-Type: application/json" \
  -d '{
    "products": [...],
    "target_margin": 0.35
  }'
```

---

## 4. Export Excel

Generate SmartStore-compatible Excel file.

### Endpoint
```http
POST /discovery/export-excel
```

### Request
```json
{
  "products": [
    {
      "title": "기모 맨투맨 남녀공용 오버핏",
      "taobao_id": "12345678",
      "taobao_price_cny": 89.0,
      "selling_price_rounded": 36800,
      "image_url": "https://...",
      "price_info": {
        "exchange_rate": 190.5,
        "shipping_fee": 7000,
        "expected_profit": 12855
      }
    }
  ]
}
```

### Parameters
- `products` (required): Array of products with calculated prices from step 3

### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename=smartstore_products_YYYYMMDD_HHMMSS.xlsx`
- Binary Excel file download

### Excel Columns
1. 상품명 (Product Name)
2. 판매가 (Selling Price)
3. 대표이미지 (Main Image URL)
4. 추가이미지1-4 (Additional Images)
5. 상품상태 (New/Used)
6. 과세여부 (Tax Status)
7. 원산지 (Origin)
8. 배송방법 (Delivery Method)
9. 배송비 (Shipping Fee)
10. 제조사 (Manufacturer)
11. 브랜드 (Brand)
12. 카테고리 (Category)
13. 상세설명 (Description)
14. 타오바오ID (Taobao ID)
15. 타오바오가격 (Taobao Price)
16. 예상마진 (Expected Profit)
17. 메모 (Notes)

### cURL Example
```bash
curl -X POST http://localhost:4070/api/v1/discovery/export-excel \
  -H "Content-Type: application/json" \
  -d '{
    "products": [...]
  }' \
  --output smartstore_products.xlsx
```

---

## Error Responses

All endpoints return errors in standard format:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "context"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request parameters
- `SCRAPING_ERROR`: SmartStore scraping failed
- `TRANSLATION_ERROR`: Korean→Chinese translation failed
- `SEARCH_ERROR`: Taobao search failed
- `CALCULATION_ERROR`: Price calculation failed
- `GENERATION_ERROR`: Excel generation failed

---

## Rate Limits

- Analyze Competitor: ~2-3 min for 100 products
- Match Taobao: ~5-8 min for 100 products
- Calculate Prices: ~10 sec for 100 products
- Export Excel: ~5 sec for 100 products

**Total workflow**: ~8-12 minutes for 100 products

---

## Frontend Integration Example

```javascript
// 1. Analyze competitor
const analyzeResponse = await fetch('/api/v1/discovery/analyze-competitor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seller_url: 'https://smartstore.naver.com/wg0057/best',
    max_products: 100,
    min_sales: 1000
  })
});
const { data: { products } } = await analyzeResponse.json();

// 2. Match with Taobao
const matchResponse = await fetch('/api/v1/discovery/match-taobao-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products,
    max_candidates: 3
  })
});
const { data: { matches } } = await matchResponse.json();

// 3. Calculate prices
const selectedProducts = matches
  .filter(m => m.best_match)
  .map(m => ({
    title: m.smartstore_product.title,
    taobao_price_cny: m.best_match.price_cny,
    taobao_id: m.best_match.taobao_id
  }));

const priceResponse = await fetch('/api/v1/discovery/calculate-prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products: selectedProducts,
    target_margin: 0.35
  })
});
const { data: { products: pricedProducts } } = await priceResponse.json();

// 4. Download Excel
const excelResponse = await fetch('/api/v1/discovery/export-excel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products: pricedProducts
  })
});
const blob = await excelResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'smartstore_products.xlsx';
a.click();
```

---

## Testing

Use the provided cURL examples or Postman collection to test endpoints individually.

**Test SmartStore URL**: `https://smartstore.naver.com/wg0057/best?cp=1`

---

**Last Updated**: 2025-10-25
**API Version**: 1.0
**Phase**: 4 (Backend Complete)
