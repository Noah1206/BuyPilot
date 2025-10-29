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

    def __init__(self, client_id: str = None, client_secret: str = None):
        """
        Initialize Naver Commerce API client

        Args:
            client_id: Naver application client ID
            client_secret: Naver application client secret
        """
        self.client_id = client_id or os.getenv('NAVER_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('NAVER_CLIENT_SECRET')

        if not self.client_id or not self.client_secret:
            logger.error("Naver Commerce API credentials not configured")
            raise ValueError("NAVER_CLIENT_ID and NAVER_CLIENT_SECRET must be set")

        logger.info("✅ Naver Commerce API client initialized")

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
        timestamp = str(int(time.time() * 1000))
        signature = self._generate_signature(timestamp, method, endpoint)

        headers = {
            'Content-Type': 'application/json',
            'X-Naver-Client-Id': self.client_id,
            'X-Naver-Client-Secret': self.client_secret,
            'X-Timestamp': timestamp,
            'X-Signature': signature
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

        Args:
            image_url: URL of image to upload

        Returns:
            Naver image ID or None if failed
        """
        try:
            # Fix URL if scheme is missing
            if not image_url.startswith(('http://', 'https://')):
                image_url = f'https://{image_url}'
                logger.info(f"🔧 Fixed image URL (added https://): {image_url}")

            # Download image
            img_response = requests.get(image_url, timeout=30)
            img_response.raise_for_status()

            # Upload to Naver
            # Note: This is a simplified version. Actual implementation may vary
            endpoint = '/v1/product-images'

            files = {'image': ('image.jpg', img_response.content, 'image/jpeg')}

            url = f"{self.BASE_URL}{endpoint}"
            timestamp = str(int(time.time() * 1000))

            headers = {
                'X-Naver-Client-Id': self.client_id,
                'X-Naver-Client-Secret': self.client_secret,
                'X-Timestamp': timestamp
            }

            response = requests.post(url, headers=headers, files=files)
            response.raise_for_status()

            result = response.json()
            image_id = result.get('imageId') or result.get('id')

            logger.info(f"✅ Image uploaded successfully: {image_id}")
            return image_id

        except Exception as e:
            logger.error(f"❌ Failed to upload image: {str(e)}")
            return None

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

            endpoint = '/v1/products'
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
        category_id: str = "50000006",  # Default: 선반
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
        product_data = {
            "originProduct": {
                "statusType": "SALE",  # SALE, SUSPENSION, SOLD_OUT
                "saleType": "NEW",  # NEW, USED, REFURBISHED
                "leafCategoryId": category_id,
                "name": name,
                "images": [{"id": img_id} for img_id in image_ids[:10]],  # Max 10 images
                "salePrice": price,
                "stockQuantity": stock,
                "deliveryInfo": {
                    "deliveryType": "DELIVERY",
                    "deliveryAttributeType": "NORMAL",
                    "deliveryFee": {
                        "deliveryFeeType": "FREE",  # FREE or CHARGE
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
                "productInfoProvidedNotice": {
                    "productInfoProvidedNoticeType": "GENERAL_GOODS",
                    "generalGoods": {
                        "returnCostReason": "반품 배송비는 고객 부담입니다",
                        "noRefundReason": "상품 하자 시 100% 환불 가능",
                        "qualityAssuranceStandard": "관련법 및 소비자분쟁해결기준에 따름",
                        "compensationProcedure": "고객센터 문의",
                        "troubleShootingContents": "고객센터로 문의 주세요"
                    }
                },
                "originAreaInfo": {
                    "originAreaCode": origin_area,  # 0801 = China
                    "importer": "",
                    "content": "중국" if origin_area == "0801" else ""
                }
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
