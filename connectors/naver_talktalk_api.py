"""
Naver TalkTalk API Client
Send customer messages and handle responses for customs clearance ID requests
"""
import os
import re
import logging
import requests
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class NaverTalkTalkAPI:
    """Naver TalkTalk API Client for customer messaging"""

    BASE_URL = "https://talk.naver.com/api"

    def __init__(self, partner_id: str = None, authorization: str = None):
        """
        Initialize TalkTalk API client

        Args:
            partner_id: TalkTalk Partner ID (default: from env NAVER_TALK_PARTNER_ID)
            authorization: Authorization key (default: from env NAVER_TALK_AUTHORIZATION)
        """
        self.partner_id = partner_id or os.getenv('NAVER_TALK_PARTNER_ID')
        self.authorization = authorization or os.getenv('NAVER_TALK_AUTHORIZATION')

        if not self.partner_id or not self.authorization:
            raise ValueError("TalkTalk Partner ID and Authorization are required")

    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """
        Make HTTP request to TalkTalk API

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            data: Request payload

        Returns:
            API response as dictionary
        """
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            'Authorization': self.authorization,
            'Content-Type': 'application/json'
        }

        try:
            logger.info(f"TalkTalk API Request: {method} {url}")

            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout:
            logger.error(f"TalkTalk API timeout: {endpoint}")
            raise Exception("TalkTalk API request timeout")
        except requests.exceptions.HTTPError as e:
            logger.error(f"TalkTalk API HTTP error: {e.response.text}")
            raise Exception(f"TalkTalk API error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"TalkTalk API request failed: {str(e)}")
            raise

    def send_message(
        self,
        user_id: str,
        message: str,
        buttons: list = None,
        image_url: str = None
    ) -> Dict:
        """
        Send message to customer via TalkTalk

        Args:
            user_id: Customer's TalkTalk user ID (phone number)
            message: Message text to send
            buttons: Optional list of button objects
            image_url: Optional image URL

        Returns:
            Response with message_id and status
        """
        endpoint = f"/{self.partner_id}/messages"

        payload = {
            "event": "send",
            "user": user_id,
            "textContent": {
                "text": message
            }
        }

        # Add buttons if provided
        if buttons:
            payload["textContent"]["buttons"] = buttons

        # Add image if provided
        if image_url:
            payload["imageContent"] = {
                "imageUrl": image_url
            }

        try:
            response = self._make_request('POST', endpoint, data=payload)

            logger.info(f"✅ TalkTalk message sent to {user_id}")

            return {
                'success': True,
                'message_id': response.get('messageId'),
                'sent_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Failed to send TalkTalk message: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def send_customs_id_request(
        self,
        buyer_phone: str,
        buyer_name: str,
        order_id: str,
        product_name: str
    ) -> Dict:
        """
        Send customs clearance ID request message to customer

        Args:
            buyer_phone: Customer's phone number
            buyer_name: Customer's name
            order_id: Order ID for reference
            product_name: Ordered product name

        Returns:
            Response with message_id and status
        """
        # Build message template
        message = f"""안녕하세요 {buyer_name}님,

주문하신 상품 [{product_name}]의 통관을 위해 **개인통관고유부호**가 필요합니다.

📦 주문번호: {order_id}

아래 링크에서 개인통관고유부호를 확인하실 수 있습니다:
https://unipass.customs.go.kr/csp/index.do

개인통관고유부호를 이 메시지에 답장으로 보내주시면 빠르게 처리하겠습니다.

예) P123456789012

감사합니다! 😊"""

        # Optional: Add quick reply buttons
        buttons = [
            {
                "type": "TEXT",
                "title": "번호 확인하기",
                "value": "https://unipass.customs.go.kr/csp/index.do"
            }
        ]

        return self.send_message(
            user_id=buyer_phone,
            message=message,
            buttons=buttons
        )

    def parse_customs_id(self, customer_message: str) -> Optional[str]:
        """
        Parse customs clearance ID from customer's response message

        Args:
            customer_message: Customer's response text

        Returns:
            Extracted customs ID or None if not found
        """
        # Korean customs ID format: P + 12 digits (total 13 characters)
        # Example: P123456789012

        # Remove whitespace and special characters
        cleaned = re.sub(r'[\s\-]', '', customer_message.upper())

        # Pattern: P followed by 12 digits
        pattern = r'P\d{12}'
        match = re.search(pattern, cleaned)

        if match:
            customs_id = match.group(0)
            logger.info(f"✅ Extracted customs ID: {customs_id}")
            return customs_id

        logger.warning(f"⚠️ Could not extract customs ID from: {customer_message}")
        return None

    def validate_customs_id(self, customs_id: str) -> bool:
        """
        Validate customs clearance ID format

        Args:
            customs_id: Customs ID to validate

        Returns:
            True if valid, False otherwise
        """
        if not customs_id:
            return False

        # Must be exactly 13 characters (P + 12 digits)
        if len(customs_id) != 13:
            return False

        # Must start with 'P'
        if not customs_id.startswith('P'):
            return False

        # Following 12 characters must be digits
        if not customs_id[1:].isdigit():
            return False

        return True
