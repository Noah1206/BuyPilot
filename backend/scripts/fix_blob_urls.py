#!/usr/bin/env python3
"""
Fix blob URLs in database
Replace blob: URLs with original image URLs from product data
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import get_db, Product
from sqlalchemy import or_

def fix_blob_urls():
    """Fix products with blob URLs in image_url field"""

    with get_db() as db:
        # Find products with blob URLs
        products = db.query(Product).filter(
            or_(
                Product.image_url.like('blob:%'),
                Product.image_url.like('%blob:%')
            )
        ).all()

        print(f"Found {len(products)} products with blob URLs")

        fixed_count = 0
        for product in products:
            print(f"\nProduct ID: {product.id}")
            print(f"  Current image_url: {product.image_url}")

            # Try to get original image from data
            original_image = None

            if product.data:
                # Try downloaded_images first
                if 'downloaded_images' in product.data and product.data['downloaded_images']:
                    # Find non-blob URL
                    for img_url in product.data['downloaded_images']:
                        if not img_url.startswith('blob:'):
                            original_image = img_url
                            break

                # Try pic_url
                if not original_image and 'pic_url' in product.data:
                    original_image = product.data['pic_url']

                # Try images array
                if not original_image and 'images' in product.data and product.data['images']:
                    original_image = product.data['images'][0]

            if original_image:
                print(f"  ✅ Fixing with: {original_image}")
                product.image_url = original_image
                fixed_count += 1
            else:
                print(f"  ⚠️ No original image found, setting to empty")
                product.image_url = ''

        db.commit()
        print(f"\n✅ Fixed {fixed_count} products")

if __name__ == '__main__':
    fix_blob_urls()
