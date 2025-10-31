#!/usr/bin/env python3
"""
Test real product registration to Naver SmartStore
Uses actual database product
"""
import sys
import os
sys.path.insert(0, '/home/ec2-user/BuyPilot/backend')

from models import get_db, Product
from connectors.naver_commerce_api import get_naver_commerce_api
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/home/ec2-user/BuyPilot/backend/.env')

print("🧪 Real Naver Product Registration Test")
print("=" * 60)

try:
    # Step 1: Get a product from database
    print("\n1️⃣  Getting product from database...")
    with get_db() as db:
        product = db.query(Product).first()

        if not product:
            print("❌ No products in database")
            sys.exit(1)

        print(f"✅ Found product: {product.title[:50]}...")
        print(f"   ID: {product.id}")
        print(f"   Price: {product.price}")
        print(f"   Images: {len(product.data.get('images', []))}")

    # Step 2: Initialize Naver API
    print("\n2️⃣  Initializing Naver Commerce API...")
    naver_api = get_naver_commerce_api()
    print("✅ API client initialized")

    # Step 3: Upload first image
    print("\n3️⃣  Uploading product image to Naver...")
    images = product.data.get('downloaded_images', []) or product.data.get('images', [])

    if not images:
        print("❌ No images available")
        sys.exit(1)

    print(f"   Uploading: {images[0][:80]}...")
    image_id = naver_api.upload_image(images[0])

    if not image_id:
        print("❌ Failed to upload image")
        sys.exit(1)

    print(f"✅ Image uploaded: {image_id[:80]}...")

    # Step 4: Build product data
    print("\n4️⃣  Building product data...")

    # Simple detail HTML
    detail_html = '<div><p>테스트 상품 상세 설명입니다.</p></div>'

    product_data = naver_api.build_product_data(
        name=product.title[:100],  # Limit to 100 chars
        price=int(product.price * 200),  # CNY to KRW
        stock=999,
        image_ids=[image_id],
        detail_html=detail_html,
        category_id="50000790",  # Valid category
        origin_area="0801",  # China
        brand="테스트",
        manufacturer="테스트"
    )

    print("✅ Product data prepared")
    print(f"   Name: {product_data['originProduct']['name'][:50]}...")
    print(f"   Price: {product_data['originProduct']['salePrice']:,}원")

    # Step 5: Register product
    print("\n5️⃣  Registering product to Naver SmartStore...")
    print("⚠️  This will create a REAL product!")
    print("   Press Ctrl+C within 5 seconds to cancel...")

    import time
    time.sleep(5)

    result = naver_api.register_product(product_data)

    if result.get('success'):
        print(f"\n✅ Product registered successfully!")
        print(f"   Product ID: {result.get('product_id')}")
        print(f"   Response: {result.get('response')}")
    else:
        print(f"\n❌ Failed to register product")
        print(f"   Error: {result.get('error')}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ Real product registration test completed!")

except KeyboardInterrupt:
    print("\n\n⚠️  Test cancelled by user")
    sys.exit(0)
except Exception as e:
    print(f"\n❌ Test failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
