#!/usr/bin/env python3
"""
Test RapidAPI Taobao Connector
Tests the new dual-endpoint implementation
"""
import os
import sys
import logging

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from connectors.taobao_rapidapi import get_taobao_rapidapi

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def test_product_import():
    """Test importing a real Taobao product"""
    # Test URL from user's screenshots
    test_url = "https://item.taobao.com/item.htm?id=681298346857"

    logger.info("=" * 60)
    logger.info("Testing RapidAPI Taobao Connector")
    logger.info("=" * 60)

    # Get connector
    connector = get_taobao_rapidapi()

    # Test 1: Parse URL
    logger.info("\n📌 Test 1: URL Parsing")
    product_id = connector.parse_product_url(test_url)

    if product_id:
        logger.info(f"✅ Product ID: {product_id}")
    else:
        logger.error("❌ Failed to parse URL")
        return False

    # Test 2: Fetch product info
    logger.info("\n📌 Test 2: Fetch Product Info")
    product_info = connector.get_product_info(product_id)

    if not product_info:
        logger.error("❌ Failed to fetch product info")
        return False

    # Display results
    logger.info("\n" + "=" * 60)
    logger.info("📦 Product Information")
    logger.info("=" * 60)

    logger.info(f"ID: {product_info.get('taobao_item_id')}")
    logger.info(f"Title: {product_info.get('title', '')[:80]}...")
    logger.info(f"Price: ¥{product_info.get('price', 0)}")
    logger.info(f"Stock: {product_info.get('num', 0)}")
    logger.info(f"Images: {len(product_info.get('images', []))} images")

    # Check images format
    if product_info.get('images'):
        first_image = product_info['images'][0]
        logger.info(f"First image URL: {first_image[:80]}...")
        if first_image.startswith('https://'):
            logger.info("✅ Image URL format is correct (HTTPS)")
        else:
            logger.warning("⚠️ Image URL format issue")

    # Check options
    if product_info.get('options'):
        logger.info(f"\n🎨 Product Options: {len(product_info['options'])} groups")
        for i, option in enumerate(product_info['options'][:3]):  # Show first 3
            logger.info(f"  Option {i+1}: {option.get('name')} ({len(option.get('values', []))} values)")
            for value in option.get('values', [])[:3]:  # Show first 3 values
                logger.info(f"    - {value.get('name')}")

    logger.info("\n" + "=" * 60)
    logger.info("✅ All tests passed!")
    logger.info("=" * 60)

    return True


if __name__ == '__main__':
    try:
        success = test_product_import()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"❌ Test failed with exception: {str(e)}", exc_info=True)
        sys.exit(1)
