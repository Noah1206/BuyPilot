#!/usr/bin/env python3
"""
Quick test: Real Naver product registration
"""
import sys
import os
sys.path.insert(0, '/home/ec2-user/BuyPilot/backend')

from models import get_db, Product
from connectors.naver_commerce_api import get_naver_commerce_api
from dotenv import load_dotenv

load_dotenv('/home/ec2-user/BuyPilot/backend/.env')

# Override DATABASE_URL to use Railway
os.environ['DATABASE_URL'] = os.getenv('SUPABASE_DB_URL')

print("🚀 Quick Naver Product Registration Test")
print("=" * 60)

try:
    # Get product
    print("\n1️⃣  Fetching product from Railway DB...")
    with get_db() as db:
        product = db.query(Product).limit(1).first()
        if not product:
            print("❌ No products found")
            sys.exit(1)

        print(f"✅ Product: {product.title[:60]}")

    # Initialize API
    print("\n2️⃣  Initializing Naver API...")
    naver_api = get_naver_commerce_api()
    print("✅ API ready")

    # Upload image
    print("\n3️⃣  Uploading image...")
    images = product.data.get('downloaded_images', []) or product.data.get('images', [])
    if not images:
        print("❌ No images")
        sys.exit(1)

    img_url = naver_api.upload_image(images[0])
    if not img_url:
        print("❌ Upload failed")
        sys.exit(1)
    print(f"✅ Uploaded: {img_url[:70]}...")

    # Build data
    print("\n4️⃣  Building product data...")
    data = naver_api.build_product_data(
        name=product.title[:100],
        price=int(product.price * 200),
        stock=999,
        image_ids=[img_url],
        detail_html='<div><p>상품 설명</p></div>',
        category_id="50000790",
        origin_area="0801",
        brand="테스트",
        manufacturer="테스트"
    )
    print(f"✅ Ready: {data['originProduct']['name'][:50]}...")

    # Register
    print("\n5️⃣  Registering to Naver (5 sec to cancel)...")
    import time
    time.sleep(5)

    result = naver_api.register_product(data)

    if result.get('success'):
        print(f"\n✅ SUCCESS!")
        print(f"   Product ID: {result.get('product_id')}")
    else:
        print(f"\n❌ FAILED: {result.get('error')}")

except KeyboardInterrupt:
    print("\n⚠️  Cancelled")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
