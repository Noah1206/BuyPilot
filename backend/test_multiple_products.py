#!/usr/bin/env python3
"""
Test multiple product IDs to find working ones
"""
import os
import sys
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_product(product_id):
    """Test a single product ID"""

    api_key = os.getenv('RAPIDAPI_KEY')
    url = "https://taobao-api.p.rapidapi.com/taobao_detail"

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "taobao-api.p.rapidapi.com"
    }

    params = {
        "num_iid": product_id
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)

        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            status = result.get('status', {})
            item = result.get('item', {})

            if status.get('msg') == 'error':
                logger.warning(f"❌ {product_id}: {status.get('sub_code')}")
                return False
            elif item:
                title = item.get('title', '')[:40]
                price = item.get('price', 0)
                logger.info(f"✅ {product_id}: {title}... (¥{price})")
                return True
            else:
                logger.warning(f"⚠️ {product_id}: No item data")
                return False
        else:
            logger.error(f"❌ {product_id}: Status {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"❌ {product_id}: {str(e)}")
        return False

if __name__ == '__main__':
    # Test multiple product IDs
    test_ids = [
        "681298346857",  # Known working from earlier test
        "984628563418",  # From user's failed import
        "522859691390",  # Random Taobao product
        "677844430809",  # Random Taobao product
    ]

    logger.info("=" * 60)
    logger.info("Testing Multiple Product IDs")
    logger.info("=" * 60)

    results = {}
    for product_id in test_ids:
        results[product_id] = test_product(product_id)

    logger.info("\n" + "=" * 60)
    logger.info("Results Summary")
    logger.info("=" * 60)

    working = [pid for pid, success in results.items() if success]
    failed = [pid for pid, success in results.items() if not success]

    logger.info(f"✅ Working: {len(working)}/{len(test_ids)}")
    logger.info(f"❌ Failed: {len(failed)}/{len(test_ids)}")

    if working:
        logger.info(f"\n✅ Use these product IDs for testing:")
        for pid in working:
            logger.info(f"  - https://item.taobao.com/item.htm?id={pid}")
