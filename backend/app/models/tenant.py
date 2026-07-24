import enum
from sqlalchemy import String, Date, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class TenantStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LEAVING = "LEAVING"


class AgreementStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"


class TenantProfile(Base):
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    bed_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("beds.id", ondelete="SET NULL"), nullable=True
    )
    photo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    aadhaar_number: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Stored encrypted
    pan_number: Mapped[str | None] = mapped_column(String(255), nullable=True)      # Stored encrypted
    passport_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    driving_license: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Name, phone, relation
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    check_in_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    check_out_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus, name="tenant_status_enum"),
        default=TenantStatus.INACTIVE,
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="tenant_profile")
    bed = relationship("Bed", back_populates="tenant_profile")
    agreements = relationship("Agreement", back_populates="tenant_profile", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="tenant_profile", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="tenant_profile", cascade="all, delete-orphan")


class Agreement(Base):
    tenant_profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    bed_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("beds.id", ondelete="SET NULL"), nullable=True
    )
    room_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    rent_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    agreement_pdf_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[AgreementStatus] = mapped_column(
        Enum(AgreementStatus, name="agreement_status_enum"),
        default=AgreementStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    tenant_profile = relationship("TenantProfile", back_populates="agreements")
    bed = relationship("Bed", back_populates="agreements")
    room = relationship("Room", back_populates="agreements")
    invoices = relationship("Invoice", back_populates="agreement", cascade="all, delete-orphan")
