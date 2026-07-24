import enum
from sqlalchemy import String, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class ComplaintCategory(str, enum.Enum):
    PLUMBING = "PLUMBING"
    ELECTRICAL = "ELECTRICAL"
    APPLIANCE = "APPLIANCE"
    CLEANING = "CLEANING"
    SECURITY = "SECURITY"
    OTHER = "OTHER"


class ComplaintPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Complaint(Base):
    tenant_profile_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=True
    )
    property_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=True
    )
    category: Mapped[ComplaintCategory] = mapped_column(
        Enum(ComplaintCategory, name="complaint_category_enum"),
        default=ComplaintCategory.OTHER,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[ComplaintPriority] = mapped_column(
        Enum(ComplaintPriority, name="complaint_priority_enum"),
        default=ComplaintPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum"),
        default=ComplaintStatus.OPEN,
        nullable=False,
    )
    assigned_staff_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    images: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)

    # Relationships
    tenant_profile = relationship("TenantProfile", back_populates="complaints")
    property = relationship("Property", back_populates="complaints")
    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id])
    timelines = relationship(
        "ComplaintTimeline",
        back_populates="complaint",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class ComplaintTimeline(Base):
    complaint_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[ComplaintStatus | None] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum", create_type=False),
        nullable=True,
    )
    to_status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum", create_type=False),
        nullable=False,
    )
    changed_by: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    complaint = relationship("Complaint", back_populates="timelines")
    operator = relationship("User", foreign_keys=[changed_by])
union_all = None
