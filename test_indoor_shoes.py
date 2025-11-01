"""Test indoor shoes category suggestion"""
import requests
import json

url = "http://98.94.199.189:8080/api/v1/smartstore/suggest-category"

payload = {
    "product_data": {
        "title": "신상 겨울 넘버긍용 리본 통굽 포근 털실내화 기모 산모화"
    }
}

print(f"🧪 Testing indoor shoes category suggestion...")
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, ensure_ascii=False)}\n")

response = requests.post(url, json=payload)

print(f"Status Code: {response.status_code}")
print(f"\nResponse JSON:")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))
