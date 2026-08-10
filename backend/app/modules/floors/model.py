import enum
from sqlalchemy import Integer, ForeignKey, String, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class FloorStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"


class Floor(Base):
    property_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    floor_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    floor_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[FloorStatus] = mapped_column(
        Enum(FloorStatus, name="floor_status_enum"),
        default=FloorStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    property = relationship("Property", back_populates="floors")
    rooms = relationship("Room", back_populates="floor", cascade="all, delete-orphan", lazy="selectin")
