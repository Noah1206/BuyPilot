"""
Order model - Main order management table
"""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from models.db import Base


class OrderStatus(str, enum.Enum):
    """Order status enum matching database type"""
    PENDING = 'PENDING'
    SUPPLIER_ORDERING = 'SUPPLIER_ORDERING'
    ORDERED_SUPPLIER = 'ORDERED_SUPPLIER'
    BUYER_INFO_SET = 'BUYER_INFO_SET'
    FORWARDER_SENDING = 'FORWARDER_SENDING'
    SENT_TO_FORWARDER = 'SENT_TO_FORWARDER'
    MANUAL_REVIEW = 'MANUAL_REVIEW'
    RETRYING = 'RETRYING'
    FAILED = 'FAILED'
    DONE = 'DONE'


class Order(Base):
    """Order table model"""
    __tablename__ = 'orders'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING)

    # Platform info
    platform = Column(String)  # 'smartstore', 'shopee', 'own'
    platform_order_ref = Column(String)  # Platform order reference

    # Product info
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=True)
    qty = Column(Integer, default=1)
    unit_price = Column(Numeric(12, 2))
    currency = Column(String, default='USD')

    # Idempotency
    idempotency_key = Column(String, unique=True, nullable=True)

    # Supplier info
    supplier_id = Column(String)
    supplier_order_id = Column(String)
    supplier_status = Column(String)

    # Forwarder info
    forwarder_id = Column(String)
    forwarder_job_id = Column(String)
    forwarder_status = Column(String)

    # Metadata
    meta = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="orders")
    buyer_info = relationship("BuyerInfo", back_populates="order", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="order", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'status': self.status.value if isinstance(self.status, OrderStatus) else self.status,
            'platform': self.platform,
            'platform_order_ref': self.platform_order_ref,
            'product_id': str(self.product_id) if self.product_id else None,
            'qty': self.qty,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'currency': self.currency,
            'supplier_id': self.supplier_id,
            'supplier_order_id': self.supplier_order_id,
            'supplier_status': self.supplier_status,
            'forwarder_id': self.forwarder_id,
            'forwarder_job_id': self.forwarder_job_id,
            'forwarder_status': self.forwarder_status,
            'meta': self.meta or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'buyer': self.buyer_info.to_dict() if self.buyer_info else None
        }


class BuyerInfo(Base):
    """Buyer information table (one-to-one with orders)"""
    __tablename__ = 'buyer_info'

    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), primary_key=True)

    name = Column(String)
    phone = Column(String)
    address1 = Column(String)
    address2 = Column(String)
    zip = Column(String)
    country = Column(String, default='KR')
    customs_id = Column(String)  # 개인통관고유부호

    meta = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    order = relationship("Order", back_populates="buyer_info")

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'name': self.name,
            'phone': self.phone,
            'address1': self.address1,
            'address2': self.address2,
            'zip': self.zip,
            'country': self.country,
            'customs_id': self.customs_id
        }


class AuditLog(Base):
    """Audit log table for tracking order operations"""
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id'), nullable=True)

    actor = Column(String, nullable=False)  # 'system', 'user', 'webhook'
    action = Column(String, nullable=False)  # 'state_change', 'call_supplier', etc.
    meta = Column(JSONB, default={})

    ts = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    order = relationship("Order", back_populates="audit_logs")
