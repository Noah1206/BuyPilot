"""Test AI auto-category registration endpoint"""
import requests
import json

url = "http://98.94.199.189:8080/api/v1/smartstore/register-products"

# Test 1: AI auto-category (no category_id provided)
print("=" * 60)
print("Test 1: AI Auto-Category (category_id 없음)")
print("=" * 60)

payload1 = {
    "product_ids": ["test_product_1"],
    "settings": {
        "use_ai_category": True,
        "stock_quantity": 999
    }
}

print(f"Request: {json.dumps(payload1, indent=2, ensure_ascii=False)}\n")

try:
    response1 = requests.post(url, json=payload1, timeout=30)
    print(f"Status: {response1.status_code}")
    print(f"Response:\n{json.dumps(response1.json(), indent=2, ensure_ascii=False)}\n")
except Exception as e:
    print(f"❌ Error: {str(e)}\n")

# Test 2: Manual category (category_id provided)
print("=" * 60)
print("Test 2: Manual Category (category_id 제공)")
print("=" * 60)

payload2 = {
    "product_ids": ["test_product_2"],
    "settings": {
        "category_id": "50000790",  # 슬리퍼
        "use_ai_category": False,
        "stock_quantity": 999
    }
}

print(f"Request: {json.dumps(payload2, indent=2, ensure_ascii=False)}\n")

try:
    response2 = requests.post(url, json=payload2, timeout=30)
    print(f"Status: {response2.status_code}")
    print(f"Response:\n{json.dumps(response2.json(), indent=2, ensure_ascii=False)}\n")
except Exception as e:
    print(f"❌ Error: {str(e)}\n")

# Test 3: AI disabled + no category (should fail gracefully)
print("=" * 60)
print("Test 3: AI 비활성화 + category_id 없음 (에러 예상)")
print("=" * 60)

payload3 = {
    "product_ids": ["test_product_3"],
    "settings": {
        "use_ai_category": False,
        "stock_quantity": 999
    }
}

print(f"Request: {json.dumps(payload3, indent=2, ensure_ascii=False)}\n")

try:
    response3 = requests.post(url, json=payload3, timeout=30)
    print(f"Status: {response3.status_code}")
    print(f"Response:\n{json.dumps(response3.json(), indent=2, ensure_ascii=False)}\n")
except Exception as e:
    print(f"❌ Error: {str(e)}\n")
