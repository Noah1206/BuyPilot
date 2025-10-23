"""
Product model - Product catalog with AI scoring
"""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from models.db import Base


class Product(Base):
    """Product table model"""
    __tablename__ = 'products'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Source info
    source = Column(String, nullable=False)  # 'alimall', '1688', 'custom'
    source_url = Column(String, nullable=False)
    supplier_id = Column(String)

    # Product details
    title = Column(String, nullable=False)
    price = Column(Numeric(12, 2))
    currency = Column(String, default='USD')
    stock = Column(Integer)
    image_url = Column(String)

    # AI scoring
    score = Column(Numeric(5, 2))  # AI evaluation score (0-100)

    # Original data snapshot
    data = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    orders = relationship("Order", back_populates="product")

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'source': self.source,
            'source_url': self.source_url,
            'supplier_id': self.supplier_id,
            'title': self.title,
            'price': float(self.price) if self.price else None,
            'currency': self.currency,
            'stock': self.stock,
            'image_url': self.image_url,
            'score': float(self.score) if self.score else None,
            'data': self.data or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
