"""
Image Download and Processing Service
Downloads product images from Taobao and optimizes them
"""
import os
import logging
import hashlib
from typing import List, Optional
from urllib.parse import urlparse
import requests
from PIL import Image
from io import BytesIO

logger = logging.getLogger(__name__)


class ImageService:
    """Service for downloading and processing product images"""

    def __init__(self, storage_dir: str = "storage/images"):
        """
        Initialize image service

        Args:
            storage_dir: Directory to store downloaded images
        """
        self.storage_dir = storage_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        # Create storage directory if it doesn't exist
        os.makedirs(storage_dir, exist_ok=True)
        logger.info(f"✅ Image service initialized (storage: {storage_dir})")

    def _get_image_hash(self, url: str) -> str:
        """
        Generate hash for image URL (for deduplication)

        Args:
            url: Image URL

        Returns:
            MD5 hash of URL
        """
        return hashlib.md5(url.encode()).hexdigest()[:12]

    def _get_file_extension(self, url: str, content_type: Optional[str] = None) -> str:
        """
        Get file extension from URL or content type

        Args:
            url: Image URL
            content_type: HTTP Content-Type header

        Returns:
            File extension (e.g., 'jpg', 'png')
        """
        # Try to get from URL
        parsed = urlparse(url)
        path = parsed.path.lower()

        if path.endswith('.jpg') or path.endswith('.jpeg'):
            return 'jpg'
        elif path.endswith('.png'):
            return 'png'
        elif path.endswith('.webp'):
            return 'webp'
        elif path.endswith('.gif'):
            return 'gif'

        # Try to get from content type
        if content_type:
            if 'jpeg' in content_type or 'jpg' in content_type:
                return 'jpg'
            elif 'png' in content_type:
                return 'png'
            elif 'webp' in content_type:
                return 'webp'
            elif 'gif' in content_type:
                return 'gif'

        # Default to jpg
        return 'jpg'

    def download_image(
        self,
        url: str,
        optimize: bool = True,
        max_size: tuple = (1200, 1200)
    ) -> Optional[str]:
        """
        Download and process single image

        Args:
            url: Image URL
            optimize: Whether to optimize/resize image
            max_size: Maximum dimensions (width, height)

        Returns:
            Local file path or None if failed
        """
        try:
            # Fix URL if it starts with //
            if url.startswith('//'):
                url = 'https:' + url

            logger.info(f"🔄 Downloading image: {url[:80]}...")

            # Download image
            response = self.session.get(url, timeout=15)
            response.raise_for_status()

            # Get file extension
            content_type = response.headers.get('content-type', '')
            file_ext = self._get_file_extension(url, content_type)

            # Generate filename
            img_hash = self._get_image_hash(url)
            filename = f"{img_hash}.{file_ext}"
            filepath = os.path.join(self.storage_dir, filename)

            # Check if already downloaded
            if os.path.exists(filepath):
                logger.info(f"✅ Image already exists: {filename}")
                return filepath

            # Process image if optimization is enabled
            if optimize:
                try:
                    # Open image
                    img = Image.open(BytesIO(response.content))

                    # Convert RGBA to RGB if saving as JPEG
                    if file_ext == 'jpg' and img.mode in ('RGBA', 'LA', 'P'):
                        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                        rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                        img = rgb_img

                    # Resize if too large
                    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                        logger.info(f"📏 Resized image to {img.size}")

                    # Save optimized image
                    save_kwargs = {'optimize': True}
                    if file_ext == 'jpg':
                        save_kwargs['quality'] = 85

                    img.save(filepath, **save_kwargs)
                    logger.info(f"✅ Image optimized and saved: {filename}")

                except Exception as opt_error:
                    logger.warning(f"⚠️ Optimization failed, saving original: {str(opt_error)}")
                    # Save original if optimization fails
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
            else:
                # Save without optimization
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                logger.info(f"✅ Image saved: {filename}")

            return filepath

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to download image: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Error processing image: {str(e)}")
            return None

    def download_images(
        self,
        urls: List[str],
        optimize: bool = True,
        max_images: int = 10
    ) -> List[str]:
        """
        Download multiple images

        Args:
            urls: List of image URLs
            optimize: Whether to optimize images
            max_images: Maximum number of images to download

        Returns:
            List of local file paths (excludes failed downloads)
        """
        local_paths = []

        # Limit number of images
        urls = urls[:max_images]

        logger.info(f"🔄 Downloading {len(urls)} images...")

        for i, url in enumerate(urls):
            logger.info(f"📥 [{i+1}/{len(urls)}] Downloading...")

            filepath = self.download_image(url, optimize=optimize)
            if filepath:
                local_paths.append(filepath)
            else:
                logger.warning(f"⚠️ Skipping failed image: {url[:80]}")

        logger.info(f"✅ Downloaded {len(local_paths)}/{len(urls)} images successfully")
        return local_paths

    def get_public_url(self, filepath: str, base_url: str = "") -> str:
        """
        Convert local file path to public URL

        Args:
            filepath: Local file path
            base_url: Base URL for serving images (e.g., 'https://example.com/images')

        Returns:
            Public URL
        """
        filename = os.path.basename(filepath)

        if base_url:
            return f"{base_url.rstrip('/')}/{filename}"
        else:
            # Return relative path for local development
            return f"/static/images/{filename}"


# Singleton instance
_image_service = None

def get_image_service() -> ImageService:
    """Get or create image service singleton"""
    global _image_service
    if _image_service is None:
        _image_service = ImageService()
    return _image_service
