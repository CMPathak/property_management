import enum
from sqlalchemy import String, Numeric, ForeignKey, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RoomType(str, enum.Enum):
    SINGLE = "SINGLE"
    DOUBLE = "DOUBLE"
    TRIPLE = "TRIPLE"
    CUSTOM = "CUSTOM"


class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class Room(Base):
    floor_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("floors.id", ondelete="CASCADE"), nullable=False
    )
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    room_type: Mapped[RoomType] = mapped_column(
        Enum(RoomType, name="room_type_enum"),
        default=RoomType.SINGLE,
        nullable=False,
    )
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monthly_rent: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[RoomStatus] = mapped_column(
        Enum(RoomStatus, name="room_status_enum"),
        default=RoomStatus.AVAILABLE,
        nullable=False,
    )

    # Relationships
    floor = relationship("Floor", back_populates="rooms")
    beds = relationship("Bed", back_populates="room", cascade="all, delete-orphan", lazy="selectin")
    # agreements = relationship("Agreement", back_populates="room")
