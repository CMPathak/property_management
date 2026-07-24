from sqlalchemy import Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class Floor(Base):
    property_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="floors")
    rooms = relationship("Room", back_populates="floor", cascade="all, delete-orphan", lazy="selectin")
