#!/usr/bin/env python3
"""
Test script to diagnose category suggestion endpoint issues on EC2
"""
import requests
import json

# Test EC2 endpoint directly
ec2_url = "http://98.94.199.189:8080/api/v1/smartstore/suggest-category"

test_payload = {
    "product_data": {
        "title": "나이키 에어맥스 운동화 블랙"
    }
}

print("🧪 Testing EC2 category suggestion endpoint...")
print(f"URL: {ec2_url}")
print(f"Payload: {json.dumps(test_payload, ensure_ascii=False)}")
print()

try:
    response = requests.post(
        ec2_url,
        json=test_payload,
        headers={'Content-Type': 'application/json'},
        timeout=30
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print()

    try:
        response_json = response.json()
        print(f"Response JSON:")
        print(json.dumps(response_json, ensure_ascii=False, indent=2))
    except:
        print(f"Response Text:")
        print(response.text)

except requests.exceptions.Timeout:
    print("❌ Request timed out")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
