import enum
from sqlalchemy import String, Numeric, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class RoomType(str, enum.Enum):
    SINGLE = "SINGLE"
    DOUBLE = "DOUBLE"
    TRIPLE = "TRIPLE"
    CUSTOM = "CUSTOM"


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
    base_rent: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    floor = relationship("Floor", back_populates="rooms")
    beds = relationship("Bed", back_populates="room", cascade="all, delete-orphan", lazy="selectin")
    agreements = relationship("Agreement", back_populates="room")
