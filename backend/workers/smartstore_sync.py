"""
SmartStore Order Sync Worker
Syncs orders from Naver SmartStore and sends TalkTalk messages
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict

from models import get_db, SmartStoreOrder, SmartStoreOrderStatus, TalkTalkStatus
from connectors.naver_commerce_api import get_naver_commerce_api
from connectors.naver_talktalk_api import NaverTalkTalkAPI

logger = logging.getLogger(__name__)


def sync_smartstore_orders():
    """
    Sync orders from Naver SmartStore
    - Fetch new orders from SmartStore API
    - Save to database
    - Send TalkTalk messages for customs ID request
    """
    try:
        logger.info("🔄 Starting SmartStore order sync...")

        # Initialize APIs
        naver_api = get_naver_commerce_api()
        talktalk_api = NaverTalkTalkAPI()

        # Fetch orders from last 7 days
        start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')

        # Get orders from SmartStore API
        # Note: This is a placeholder - actual Naver Commerce API endpoint needs to be implemented
        orders_data = fetch_orders_from_smartstore(naver_api, start_date, end_date)

        new_orders_count = 0
        messages_sent_count = 0

        with get_db() as db:
            for order_data in orders_data:
                smartstore_order_id = order_data.get('order_id')

                # Check if order already exists
                existing_order = db.query(SmartStoreOrder).filter(
                    SmartStoreOrder.smartstore_order_id == smartstore_order_id
                ).first()

                if existing_order:
                    logger.debug(f"Order {smartstore_order_id} already exists, skipping...")
                    continue

                # Create new order
                new_order = SmartStoreOrder(
                    smartstore_order_id=smartstore_order_id,
                    order_date=datetime.fromisoformat(order_data.get('order_date')),
                    product_name=order_data.get('product_name'),
                    product_option=order_data.get('product_option'),
                    quantity=order_data.get('quantity', 1),
                    payment_amount=order_data.get('payment_amount'),
                    buyer_name=order_data.get('buyer_name'),
                    buyer_phone=order_data.get('buyer_phone'),
                    shipping_address=order_data.get('shipping_address'),
                    shipping_zipcode=order_data.get('shipping_zipcode'),
                    shipping_message=order_data.get('shipping_message'),
                    order_status=SmartStoreOrderStatus.NEW,
                    talktalk_status=TalkTalkStatus.NOT_SENT,
                    meta=order_data  # Store full API response
                )

                db.add(new_order)
                db.flush()  # Get the ID

                logger.info(f"✅ New order saved: {smartstore_order_id}")
                new_orders_count += 1

                # Send TalkTalk message for customs ID request
                try:
                    result = talktalk_api.send_customs_id_request(
                        buyer_phone=new_order.buyer_phone,
                        buyer_name=new_order.buyer_name,
                        order_id=smartstore_order_id,
                        product_name=new_order.product_name
                    )

                    if result.get('success'):
                        # Update order with TalkTalk info
                        new_order.talktalk_status = TalkTalkStatus.SENT
                        new_order.talktalk_message_id = result.get('message_id')
                        new_order.talktalk_sent_at = datetime.now()
                        new_order.order_status = SmartStoreOrderStatus.CUSTOMS_ID_REQUESTED

                        logger.info(f"✅ TalkTalk message sent for order {smartstore_order_id}")
                        messages_sent_count += 1
                    else:
                        new_order.talktalk_status = TalkTalkStatus.FAILED
                        logger.error(f"❌ Failed to send TalkTalk message: {result.get('error')}")

                except Exception as e:
                    logger.error(f"❌ Error sending TalkTalk message: {str(e)}")
                    new_order.talktalk_status = TalkTalkStatus.FAILED

            # Commit all changes
            db.commit()

        logger.info(f"✅ Order sync completed: {new_orders_count} new orders, {messages_sent_count} messages sent")

        return {
            'success': True,
            'new_orders': new_orders_count,
            'messages_sent': messages_sent_count
        }

    except Exception as e:
        logger.error(f"❌ SmartStore order sync failed: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


def fetch_orders_from_smartstore(naver_api, start_date: str, end_date: str) -> List[Dict]:
    """
    Fetch orders from Naver SmartStore API

    Args:
        naver_api: Naver Commerce API client
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        List of order data dictionaries
    """
    try:
        # Naver Commerce API endpoint for orders
        endpoint = '/v1/orders'
        params = {
            'searchDateType': 'ORDER_DATE',
            'searchStartDate': start_date,
            'searchEndDate': end_date,
            'pageNumber': 1,
            'pageSize': 100
        }

        response = naver_api._make_request('GET', endpoint, params=params)

        if response.get('data'):
            orders = response['data'].get('orders', [])
            logger.info(f"📦 Fetched {len(orders)} orders from SmartStore")
            return parse_smartstore_orders(orders)
        else:
            logger.warning("⚠️ No orders data in response")
            return []

    except Exception as e:
        logger.error(f"❌ Failed to fetch orders from SmartStore: {str(e)}")
        return []


def parse_smartstore_orders(orders: List[Dict]) -> List[Dict]:
    """
    Parse SmartStore API order response to our format

    Args:
        orders: Raw orders from SmartStore API

    Returns:
        Parsed orders list
    """
    parsed_orders = []

    for order in orders:
        try:
            # Extract order information from SmartStore API response
            # Note: Field names may vary based on actual API response structure
            parsed_order = {
                'order_id': order.get('orderId') or order.get('productOrderId'),
                'order_date': order.get('orderDate') or order.get('paymentDate'),
                'product_name': order.get('productName'),
                'product_option': order.get('productOption'),
                'quantity': order.get('quantity', 1),
                'payment_amount': order.get('paymentAmount') or order.get('totalPaymentAmount'),
                'buyer_name': order.get('ordererName') or order.get('receiverName'),
                'buyer_phone': order.get('ordererTel') or order.get('receiverTel1'),
                'shipping_address': f"{order.get('receiverAddress1', '')} {order.get('receiverAddress2', '')}".strip(),
                'shipping_zipcode': order.get('receiverZipCode'),
                'shipping_message': order.get('deliveryMessage') or order.get('giftMessage'),
            }

            parsed_orders.append(parsed_order)

        except Exception as e:
            logger.error(f"❌ Error parsing order: {str(e)}")
            continue

    return parsed_orders
