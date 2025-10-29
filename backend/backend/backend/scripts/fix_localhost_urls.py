"""
Fix localhost URLs in database to use Railway production URL
"""
import sys
import os

# Add parent directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Load environment variables first
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Now import models after environment is set up
from models import get_db, Product


def fix_localhost_urls():
    """Replace localhost URLs with Railway production URL"""

    RAILWAY_URL = "https://buypilot-production.up.railway.app"
    LOCALHOST_PATTERNS = [
        "http://localhost:5000",
        "http://localhost:4070",
        "http://localhost:3000"
    ]

    with get_db() as db:
        products = db.query(Product).all()

        updated_count = 0

        for product in products:
            updated = False

            # Fix main image_url
            if product.image_url:
                for pattern in LOCALHOST_PATTERNS:
                    if pattern in product.image_url:
                        product.image_url = product.image_url.replace(pattern, RAILWAY_URL)
                        updated = True
                        logger.info(f"✅ Fixed image_url for product {product.id}")

            # Fix data fields
            if product.data:
                # Fix thumbnail_image_url
                if product.data.get('thumbnail_image_url'):
                    for pattern in LOCALHOST_PATTERNS:
                        if pattern in product.data['thumbnail_image_url']:
                            product.data['thumbnail_image_url'] = product.data['thumbnail_image_url'].replace(pattern, RAILWAY_URL)
                            updated = True
                            logger.info(f"✅ Fixed thumbnail_image_url for product {product.id}")

                # Fix detail_image_url
                if product.data.get('detail_image_url'):
                    for pattern in LOCALHOST_PATTERNS:
                        if pattern in product.data['detail_image_url']:
                            product.data['detail_image_url'] = product.data['detail_image_url'].replace(pattern, RAILWAY_URL)
                            updated = True
                            logger.info(f"✅ Fixed detail_image_url for product {product.id}")

                # Fix downloaded_images array
                if product.data.get('downloaded_images'):
                    new_downloaded_images = []
                    for img_url in product.data['downloaded_images']:
                        fixed_url = img_url
                        for pattern in LOCALHOST_PATTERNS:
                            if pattern in img_url:
                                fixed_url = img_url.replace(pattern, RAILWAY_URL)
                                updated = True
                        new_downloaded_images.append(fixed_url)
                    product.data['downloaded_images'] = new_downloaded_images
                    if updated:
                        logger.info(f"✅ Fixed downloaded_images for product {product.id}")

                # Fix option images
                if product.data.get('options'):
                    for option in product.data['options']:
                        for value in option.get('values', []):
                            if value.get('image'):
                                for pattern in LOCALHOST_PATTERNS:
                                    if pattern in value['image']:
                                        value['image'] = value['image'].replace(pattern, RAILWAY_URL)
                                        updated = True

            if updated:
                updated_count += 1

        if updated_count > 0:
            db.commit()
            logger.info(f"✅ Updated {updated_count} products")
        else:
            logger.info("ℹ️ No localhost URLs found")


if __name__ == '__main__':
    logger.info("🔧 Starting localhost URL fix...")
    fix_localhost_urls()
    logger.info("✅ Done!")
