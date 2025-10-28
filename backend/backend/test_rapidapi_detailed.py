#!/usr/bin/env python3
"""
Detailed RapidAPI test to diagnose 403 error
"""
import os
import sys
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_rapidapi_direct():
    """Test RapidAPI with direct HTTP request"""

    api_key = os.getenv('RAPIDAPI_KEY')

    if not api_key:
        logger.error("❌ RAPIDAPI_KEY not found in .env")
        return False

    logger.info(f"✅ API Key loaded: {api_key[:10]}...{api_key[-10:]}")

    # Test URL from user's import
    product_id = "984628563418"

    url = "https://taobao-api.p.rapidapi.com/taobao_detail"

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "taobao-api.p.rapidapi.com"
    }

    params = {
        "num_iid": product_id
    }

    logger.info(f"🔍 Testing RapidAPI with product ID: {product_id}")
    logger.info(f"URL: {url}")
    logger.info(f"Headers: {headers}")
    logger.info(f"Params: {params}")

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)

        logger.info(f"Status Code: {response.status_code}")
        logger.info(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            logger.info("✅ Success!")
            logger.info(f"Response keys: {data.keys()}")

            result = data.get('result', {})
            item = result.get('item', {})

            if item:
                logger.info(f"Title: {item.get('title', '')[:50]}...")
                logger.info(f"Price info: {item.get('skus', {})}")
            else:
                logger.warning("⚠️ No item data in response")
                logger.info(f"Full response: {data}")

        elif response.status_code == 403:
            logger.error("❌ 403 Forbidden")
            logger.info(f"Response: {response.text}")

            # Check if it's a subscription issue
            if "subscribe" in response.text.lower():
                logger.error("💡 You need to subscribe to this endpoint on RapidAPI")
                logger.info("Visit: https://rapidapi.com/taobao-data-service-taobao-data-service-default/api/taobao-api")

        elif response.status_code == 429:
            logger.error("❌ Rate limit exceeded")
            logger.info(f"Response: {response.text}")

        else:
            logger.error(f"❌ Unexpected status: {response.status_code}")
            logger.info(f"Response: {response.text}")

        return response.status_code == 200

    except Exception as e:
        logger.error(f"❌ Request failed: {str(e)}", exc_info=True)
        return False

if __name__ == '__main__':
    success = test_rapidapi_direct()
    sys.exit(0 if success else 1)
