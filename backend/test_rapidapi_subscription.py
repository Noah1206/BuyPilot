#!/usr/bin/env python3
"""
Test RapidAPI subscription and available endpoints
"""
import os
import sys
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_endpoint(url, product_id, api_key):
    """Test a specific endpoint"""

    # Extract host from URL
    host = url.replace('https://', '').split('/')[0]

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": host
    }

    params = {
        "num_iid": product_id
    }

    logger.info(f"Testing: {url}")
    logger.info(f"Host: {host}")

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)

        logger.info(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            status = result.get('status', {})
            item = result.get('item', {})

            if status.get('msg') == 'error':
                logger.warning(f"❌ API Error: {status.get('sub_code')}")
                return False
            elif item and item.get('title'):
                title = item.get('title', '')[:50]
                logger.info(f"✅ SUCCESS: {title}...")
                return True
            else:
                logger.warning(f"⚠️ No item data")
                logger.debug(f"Response: {data}")
                return False

        elif response.status_code == 403:
            logger.error(f"❌ 403 Forbidden - Check API key or subscription")
            if "subscribe" in response.text.lower():
                logger.error("💡 Need to subscribe to this endpoint")
            return False

        elif response.status_code == 429:
            logger.error(f"❌ 429 Rate limit exceeded")
            return False

        else:
            logger.error(f"❌ Status {response.status_code}")
            logger.info(f"Response: {response.text[:200]}")
            return False

    except Exception as e:
        logger.error(f"❌ Request failed: {str(e)}")
        return False

def main():
    api_key = os.getenv('RAPIDAPI_KEY')

    if not api_key:
        logger.error("❌ RAPIDAPI_KEY not found in .env")
        return False

    logger.info("=" * 70)
    logger.info("RapidAPI Subscription Test")
    logger.info("=" * 70)
    logger.info(f"API Key: {api_key[:15]}...{api_key[-10:]}")

    # Test with multiple product IDs
    test_products = [
        "681298346857",   # Known working from earlier
        "983942947548",   # From latest failed import
        "984628563418",   # From earlier failed import
    ]

    # Test different possible endpoints
    endpoints = [
        {
            "name": "Taobao API (taobao-api.p.rapidapi.com)",
            "url": "https://taobao-api.p.rapidapi.com/taobao_detail",
            "current": True
        },
        {
            "name": "Taobao Product API (taobao-product-api.p.rapidapi.com)",
            "url": "https://taobao-product-api.p.rapidapi.com/product/detail",
            "current": False
        },
        {
            "name": "Taobao-Tmall Product (taobao-tmall-product-data.p.rapidapi.com)",
            "url": "https://taobao-tmall-product-data.p.rapidapi.com/product/detail",
            "current": False
        }
    ]

    results = {}

    for endpoint in endpoints:
        logger.info("\n" + "=" * 70)
        logger.info(f"Testing: {endpoint['name']}")
        if endpoint['current']:
            logger.info("(Currently used in code)")
        logger.info("=" * 70)

        endpoint_results = []
        for product_id in test_products:
            logger.info(f"\nProduct ID: {product_id}")
            success = test_endpoint(endpoint['url'], product_id, api_key)
            endpoint_results.append(success)

            if success:
                break  # If one works, no need to test more

        results[endpoint['name']] = any(endpoint_results)

    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("RESULTS SUMMARY")
    logger.info("=" * 70)

    working_endpoints = [name for name, success in results.items() if success]

    if working_endpoints:
        logger.info(f"✅ Working endpoints: {len(working_endpoints)}")
        for name in working_endpoints:
            logger.info(f"  ✅ {name}")
    else:
        logger.error("❌ No working endpoints found!")
        logger.info("\n💡 Recommendations:")
        logger.info("1. Check RapidAPI dashboard: https://rapidapi.com/hub")
        logger.info("2. Go to 'My Subscriptions'")
        logger.info("3. Find your Taobao API subscription")
        logger.info("4. Test endpoint directly on RapidAPI")
        logger.info("5. Check if Pro Plan is active")

    logger.info("=" * 70)

    return len(working_endpoints) > 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
