"""
SmartStore Order model - Naver SmartStore order management
"""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from models.db import Base


class TalkTalkStatus(str, enum.Enum):
    """TalkTalk message status enum"""
    NOT_SENT = 'NOT_SENT'
    SENT = 'SENT'
    RESPONDED = 'RESPONDED'
    FAILED = 'FAILED'


class SmartStoreOrderStatus(str, enum.Enum):
    """SmartStore order status enum"""
    NEW = 'NEW'  # 새 주문
    CUSTOMS_ID_REQUESTED = 'CUSTOMS_ID_REQUESTED'  # 통관고유부호 요청됨
    CUSTOMS_ID_RECEIVED = 'CUSTOMS_ID_RECEIVED'  # 통관고유부호 수신됨
    PROCESSING = 'PROCESSING'  # 처리중
    SHIPPED = 'SHIPPED'  # 발송됨
    DELIVERED = 'DELIVERED'  # 배송완료
    CANCELLED = 'CANCELLED'  # 취소됨
    FAILED = 'FAILED'  # 실패


class SmartStoreOrder(Base):
    """SmartStore order table model"""
    __tablename__ = 'smartstore_orders'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # SmartStore order info
    smartstore_order_id = Column(String, unique=True, nullable=False, index=True)
    order_date = Column(DateTime(timezone=True), nullable=False)

    # Product info
    product_name = Column(String, nullable=False)
    product_option = Column(String)
    quantity = Column(Integer, default=1)
    payment_amount = Column(Numeric(12, 2))

    # Buyer info
    buyer_name = Column(String)
    buyer_phone = Column(String)
    shipping_address = Column(Text)
    shipping_zipcode = Column(String)
    shipping_message = Column(Text)

    # Customs clearance
    customs_id = Column(String)  # 개인통관고유부호 (고객 응답)

    # TalkTalk messaging
    talktalk_status = Column(Enum(TalkTalkStatus), default=TalkTalkStatus.NOT_SENT)
    talktalk_message_id = Column(String)
    talktalk_sent_at = Column(DateTime(timezone=True))
    talktalk_responded_at = Column(DateTime(timezone=True))

    # Order status
    order_status = Column(Enum(SmartStoreOrderStatus), default=SmartStoreOrderStatus.NEW)

    # Metadata (raw SmartStore API response)
    meta = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'smartstore_order_id': self.smartstore_order_id,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'product_name': self.product_name,
            'product_option': self.product_option,
            'quantity': self.quantity,
            'payment_amount': float(self.payment_amount) if self.payment_amount else None,
            'buyer_name': self.buyer_name,
            'buyer_phone': self.buyer_phone,
            'shipping_address': self.shipping_address,
            'shipping_zipcode': self.shipping_zipcode,
            'shipping_message': self.shipping_message,
            'customs_id': self.customs_id,
            'talktalk_status': self.talktalk_status.value if isinstance(self.talktalk_status, TalkTalkStatus) else self.talktalk_status,
            'talktalk_message_id': self.talktalk_message_id,
            'talktalk_sent_at': self.talktalk_sent_at.isoformat() if self.talktalk_sent_at else None,
            'talktalk_responded_at': self.talktalk_responded_at.isoformat() if self.talktalk_responded_at else None,
            'order_status': self.order_status.value if isinstance(self.order_status, SmartStoreOrderStatus) else self.order_status,
            'meta': self.meta or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
