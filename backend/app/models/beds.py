import enum
from sqlalchemy import String, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class BedStatus(str, enum.Enum):
    VACANT = "VACANT"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class Bed(Base):
    room_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    bed_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[BedStatus] = mapped_column(
        Enum(BedStatus, name="bed_status_enum"),
        default=BedStatus.VACANT,
        nullable=False,
    )

    # Relationships
    room = relationship("Room", back_populates="beds")
    tenant_profile = relationship("TenantProfile", back_populates="bed", uselist=False)
    agreements = relationship("Agreement", back_populates="bed")
