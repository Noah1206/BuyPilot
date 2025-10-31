#!/usr/bin/env python3
"""
Test Naver SmartStore product registration
Tests the fixed image upload and validation logic
"""
import requests
import json

# EC2 endpoint
EC2_ENDPOINT = "http://98.94.199.189:8080"

# Test product data (use an existing product ID from your database)
test_data = {
    "product_ids": ["test-product-1"],  # Replace with actual product ID
    "settings": {
        "category_id": "50000790",  # Valid category from seller center
        "stock_quantity": 999,
        "origin_area": "0801",  # China
        "brand": "테스트 브랜드",
        "manufacturer": "테스트 제조사"
    }
}

print("🧪 Testing Naver SmartStore Product Registration")
print("=" * 60)
print(f"Endpoint: {EC2_ENDPOINT}/api/v1/smartstore/register-products")
print(f"Request data: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
print()

try:
    response = requests.post(
        f"{EC2_ENDPOINT}/api/v1/smartstore/register-products",
        json=test_data,
        timeout=180  # 3 minutes
    )

    print(f"Status Code: {response.status_code}")
    print()
    print("Response:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))

    if response.status_code == 200:
        result = response.json()
        if result.get('ok'):
            print("\n✅ Registration successful!")
            summary = result.get('data', {}).get('summary', {})
            print(f"Total: {summary.get('total')}")
            print(f"Success: {summary.get('success')}")
            print(f"Failed: {summary.get('failed')}")
        else:
            print("\n❌ Registration failed")
            print(f"Error: {result.get('error')}")
    else:
        print("\n❌ Request failed")

except requests.exceptions.Timeout:
    print("❌ Request timed out (>180s)")
except requests.exceptions.ConnectionError:
    print("❌ Connection error - is the server running?")
except Exception as e:
    print(f"❌ Error: {str(e)}")
