"""
Naver Commerce API Client
Handles SmartStore product registration and management
"""
import os
import requests
import logging
import time
import hashlib
import hmac
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class NaverCommerceAPI:
    """Naver Commerce API Client for SmartStore integration"""

    BASE_URL = "https://api.commerce.naver.com"
    TOKEN_URL = "https://api.commerce.naver.com/external/v1/oauth2/token"

    def __init__(self, client_id: str = None, client_secret: str = None):
        """
        Initialize Naver Commerce API client

        Args:
            client_id: Naver Commerce API client ID (ncp_xxxxx format)
            client_secret: Naver Commerce API client secret
        """
        # Use NAVER_COMMERCE_* for SmartStore API, fallback to NAVER_* for backwards compatibility
        self.client_id = client_id or os.getenv('NAVER_COMMERCE_CLIENT_ID') or os.getenv('NAVER_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('NAVER_COMMERCE_CLIENT_SECRET') or os.getenv('NAVER_CLIENT_SECRET')

        if not self.client_id:
            logger.error("Naver Commerce API client_id not configured")
            raise ValueError("NAVER_COMMERCE_CLIENT_ID must be set")

        if not self.client_secret:
            logger.warning("⚠️ NAVER_COMMERCE_CLIENT_SECRET not set - will try authentication without signature")

        # OAuth 2.0 access token (will be fetched on first API call)
        self.access_token = None
        self.token_expires_at = 0

        logger.info("✅ Naver Commerce API client initialized")

    def _get_access_token(self) -> str:
        """
        Get OAuth 2.0 access token (fetch new one if expired)

        Returns:
            Valid access token
        """
        # Check if token is still valid
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token

        # Fetch new token
        try:
            timestamp = str(int(time.time() * 1000))

            data = {
                'client_id': self.client_id,
                'timestamp': timestamp,
                'grant_type': 'client_credentials',
                'type': 'SELF'
            }

            # Only add signature if client_secret is provided
            if self.client_secret:
                # Create bcrypt-based signature (Naver Commerce API requirement)
                import bcrypt
                message = f"{self.client_id}_{timestamp}"

                # Use client_secret as bcrypt salt (it's already in bcrypt format: $2a$04$...)
                hashed = bcrypt.hashpw(message.encode('utf-8'), self.client_secret.encode('utf-8'))
                signature = base64.b64encode(hashed).decode('utf-8')

                data['client_secret_sign'] = signature
                logger.info("🔐 bcrypt signature generated for OAuth")
            else:
                logger.info("🔐 Requesting OAuth token without client_secret (using client_id only)")

            response = requests.post(self.TOKEN_URL, data=data, timeout=30)
            response.raise_for_status()

            result = response.json()
            self.access_token = result['access_token']
            # Token expires in 2 hours, refresh 5 minutes before
            self.token_expires_at = time.time() + (2 * 3600) - 300

            logger.info("✅ OAuth 2.0 access token obtained")
            return self.access_token

        except Exception as e:
            logger.error(f"❌ Failed to get access token: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.status_code} - {e.response.text}")
            raise

    def _generate_signature(self, timestamp: str, method: str, uri: str) -> str:
        """
        Generate API request signature

        Args:
            timestamp: Unix timestamp in milliseconds
            method: HTTP method (GET, POST, etc.)
            uri: Request URI

        Returns:
            Base64 encoded signature
        """
        message = f"{timestamp}.{method}.{uri}"
        signature = hmac.new(
            self.client_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()

        return base64.b64encode(signature).decode('utf-8')

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Dict = None,
        params: Dict = None
    ) -> Dict:
        """
        Make authenticated API request

        Args:
            method: HTTP method
            endpoint: API endpoint (e.g., '/v1/products')
            data: Request body (for POST/PUT)
            params: Query parameters

        Returns:
            API response as dictionary
        """
        url = f"{self.BASE_URL}{endpoint}"

        # Get valid OAuth 2.0 access token
        access_token = self._get_access_token()

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Naver Commerce API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise

    def upload_image(self, image_url: str) -> Optional[str]:
        """
        Upload image to Naver and get image ID
        Converts WebP to JPEG since Naver only supports JPEG/JPG/GIF/PNG/BMP

        Args:
            image_url: URL of image to upload

        Returns:
            Naver image ID or None if failed
        """
        try:
            from PIL import Image
            from io import BytesIO

            # Fix URL if scheme is missing
            if not image_url.startswith(('http://', 'https://')):
                image_url = f'https://{image_url}'
                logger.info(f"🔧 Fixed image URL (added https://): {image_url}")

            # Download image
            img_response = requests.get(image_url, timeout=30)
            img_response.raise_for_status()

            # Upload to Naver - Use correct endpoint
            endpoint = '/external/v1/product-images/upload'

            # Check if image is WebP (Naver doesn't support WebP)
            filename = image_url.split('/')[-1].split('?')[0]
            is_webp = filename.endswith('.webp') or img_response.headers.get('Content-Type') == 'image/webp'

            if is_webp:
                logger.info(f"🔄 Converting WebP to JPEG for Naver compatibility...")

                # Convert WebP to JPEG
                image = Image.open(BytesIO(img_response.content))

                # Convert RGBA to RGB if needed
                if image.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                    image = background

                # Save as JPEG
                output = BytesIO()
                image.save(output, format='JPEG', quality=95)
                image_content = output.getvalue()
                content_type = 'image/jpeg'
                filename = filename.replace('.webp', '.jpg')

                logger.info(f"✅ Converted to JPEG: {filename}")
            else:
                image_content = img_response.content
                content_type = img_response.headers.get('Content-Type', 'image/jpeg')
                if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']):
                    filename = 'image.jpg'

            files = {'imageFiles': (filename, image_content, content_type)}

            url = f"{self.BASE_URL}{endpoint}"

            # Get valid OAuth 2.0 access token
            access_token = self._get_access_token()

            headers = {
                'Authorization': f'Bearer {access_token}'
            }

            response = requests.post(url, headers=headers, files=files, timeout=30)

            # Log response for debugging
            logger.info(f"🔍 Upload response status: {response.status_code}")
            logger.info(f"🔍 Upload response body: {response.text[:500]}")

            response.raise_for_status()

            result = response.json()

            # Extract image URL from Naver response
            # Format: {"images":[{"url":"https://shop-phinf.pstatic.net/..."}]}
            image_url = None
            if 'images' in result and len(result['images']) > 0:
                image_url = result['images'][0].get('url')

            # Fallback to other possible fields
            if not image_url:
                image_url = result.get('imageId') or result.get('id') or result.get('url')

            logger.info(f"✅ Image uploaded successfully: {image_url}")
            return image_url

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to upload image (HTTP {e.response.status_code}): {e.response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"❌ Failed to upload image: {str(e)}")
            return None

    def get_categories(self) -> Dict:
        """
        Get SmartStore category list

        Returns:
            Category tree with IDs and names
        """
        try:
            logger.info("📋 Fetching SmartStore category list...")

            endpoint = '/external/v2/categories'
            response = self._make_request('GET', endpoint)

            logger.info(f"✅ Retrieved {len(response.get('categories', []))} categories")
            return {
                'success': True,
                'categories': response.get('categories', [])
            }

        except Exception as e:
            logger.error(f"❌ Failed to fetch categories: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def register_product(self, product_data: Dict) -> Dict:
        """
        Register product on SmartStore

        Args:
            product_data: Product information dictionary containing:
                - name: Product name
                - salePrice: Sale price
                - stockQuantity: Stock quantity
                - images: List of image IDs
                - detailContent: HTML detail content
                - categoryId: Category ID
                - originAreaCode: Origin area code (e.g., '0801' for China)
                - options: Product options (optional)
                - etc.

        Returns:
            API response with product ID
        """
        try:
            logger.info(f"📦 Registering product: {product_data.get('name', 'Unknown')}")

            endpoint = '/external/v2/products'
            response = self._make_request('POST', endpoint, data=product_data)

            product_id = response.get('productId') or response.get('id')
            logger.info(f"✅ Product registered successfully: {product_id}")

            return {
                'success': True,
                'product_id': product_id,
                'response': response
            }

        except Exception as e:
            logger.error(f"❌ Failed to register product: {str(e)}")
            # Log detailed error response if available
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"❌ Naver API Error Response: {error_details}")
                except:
                    logger.error(f"❌ Naver API Response Text: {e.response.text[:1000]}")
            return {
                'success': False,
                'error': str(e)
            }

    def build_product_data(
        self,
        name: str,
        price: int,
        stock: int,
        image_ids: List[str],
        detail_html: str,
        category_id: str = "50000790",  # Valid leaf category from seller center
        origin_area: str = "0801",  # China
        brand: str = "",
        manufacturer: str = "",
        options: List[Dict] = None,
        **kwargs
    ) -> Dict:
        """
        Build product data structure for SmartStore API

        Args:
            name: Product name
            price: Sale price in KRW
            stock: Stock quantity
            image_ids: List of uploaded image IDs
            detail_html: HTML content for product detail
            category_id: SmartStore category ID
            origin_area: Origin area code (0801 = China)
            brand: Brand name
            manufacturer: Manufacturer name
            options: Product options
            **kwargs: Additional product fields

        Returns:
            Formatted product data for API
        """
        # Build images in correct format - representativeImage + optionalImages
        images_data = {
            "representativeImage": {"url": image_ids[0]} if len(image_ids) > 0 else None,
            "optionalImages": [{"url": img_url} for img_url in image_ids[1:10]]  # Max 9 optional
        }

        product_data = {
            "originProduct": {
                "statusType": "SALE",  # SALE, SUSPENSION, SOLD_OUT
                "saleType": "NEW",  # NEW, USED, REFURBISHED
                "leafCategoryId": category_id,
                "name": name,
                "images": images_data,
                "salePrice": price,
                "stockQuantity": stock,
                "deliveryInfo": {
                    "deliveryType": "DELIVERY",
                    "deliveryAttributeType": "NORMAL",
                    "deliveryCompany": "CJGLS",  # CJ대한통운
                    "deliveryFee": {
                        "deliveryFeeType": "FREE",
                        "baseFee": 0,
                        "freeConditionalAmount": 0
                    },
                    "claimDeliveryInfo": {
                        "returnDeliveryFee": 3000,
                        "exchangeDeliveryFee": 6000,
                        "shippingAddressId": None
                    }
                },
                "detailContent": detail_html,
                "detailAttribute": {
                    "naverShoppingSearchInfo": {
                        "manufacturerName": manufacturer or "해외 제조사",
                        "brandName": brand or "해외 브랜드",
                        "modelName": ""
                    },
                    "originAreaInfo": {
                        "originAreaCode": "03",  # 03 = 중국 (China)
                        "content": "중국"
                    },
                    "afterServiceInfo": {
                        "afterServiceTelephoneNumber": "1588-0000",
                        "afterServiceGuideContent": "상품 수령 후 7일 이내 문의 가능"
                    },
                    "minorPurchasable": True,  # 미성년자 구매 가능 여부
                    "productInfoProvidedNotice": {
                        "productInfoProvidedNoticeType": "ETC",
                        "etc": {
                            "returnCostReason": "상품상세참조",
                            "noRefundReason": "상품상세참조",
                            "qualityAssuranceStandard": "상품상세참조",
                            "compensationProcedure": "상품상세참조",
                            "itemName": "상품상세참조",
                            "modelName": "상품상세참조",
                            "manufacturer": manufacturer or "상품상세참조",
                            "afterServiceDirector": "1588-0000"
                        }
                    }
                }
            },
            "smartstoreChannelProduct": {
                "naverShoppingRegistration": True,
                "channelProductDisplayStatusType": "ON"
            }
        }

        # Add brand if provided
        if brand:
            product_data["originProduct"]["brand"] = {"name": brand}

        # Add manufacturer if provided
        if manufacturer:
            product_data["originProduct"]["manufacturer"] = manufacturer

        # Add options if provided
        if options and len(options) > 0:
            product_data["originProduct"]["optionInfo"] = {
                "simpleOption": False,
                "optionCombinations": self._build_option_combinations(options),
                "standardOptions": self._build_standard_options(options)
            }

        # Add any additional fields
        for key, value in kwargs.items():
            if value is not None:
                product_data["originProduct"][key] = value

        return product_data

    def _build_option_combinations(self, options: List[Dict]) -> List[Dict]:
        """Build option combinations for SmartStore API"""
        combinations = []

        # Simple implementation: create combinations from option values
        if len(options) > 0:
            option1 = options[0]
            for value in option1.get('values', []):
                combinations.append({
                    "id": value.get('id', ''),
                    "optionName1": option1.get('name', ''),
                    "optionValue1": value.get('name', ''),
                    "stockQuantity": 999,
                    "price": 0,  # Additional price
                    "sellerManagerCode": ""
                })

        return combinations

    def _build_standard_options(self, options: List[Dict]) -> List[Dict]:
        """Build standard options for SmartStore API"""
        standard_options = []

        for idx, option in enumerate(options[:2]):  # Max 2 options
            standard_options.append({
                "groupName": option.get('name', f'옵션{idx+1}'),
                "optionValues": [
                    {"name": val.get('name', '')}
                    for val in option.get('values', [])
                ]
            })

        return standard_options


def get_naver_commerce_api() -> NaverCommerceAPI:
    """Get Naver Commerce API client instance"""
    return NaverCommerceAPI()
