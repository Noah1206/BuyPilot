"""Test tool category suggestions"""
import requests
import json

url = "http://98.94.199.189:8080/api/v1/smartstore/suggest-category"

test_products = [
    "충전드릴 20V 전동드릴 세트",
    "전동드라이버 무선 임팩트 드라이버",
    "각도절단기 그라인더 4인치",
    "원형톱 전기톱 목공용",
]

for title in test_products:
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {title}")
    print(f"{'='*60}")

    payload = {"product_data": {"title": title}}
    response = requests.post(url, json=payload)

    if response.status_code == 200:
        data = response.json()
        suggestions = data.get('data', {}).get('suggestions', [])

        if suggestions:
            for i, sug in enumerate(suggestions[:3], 1):
                print(f"{i}. {sug['category_path']} ({sug['confidence']}%)")
                print(f"   이유: {sug['reason'][:80]}...")
        else:
            print("❌ No suggestions")
    else:
        print(f"❌ Error: {response.status_code}")
