import enum
from sqlalchemy import String, Date, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class TenantStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LEAVING = "LEAVING"
    NOTICE = "NOTICE"
    CHECKED_OUT = "CHECKED_OUT"


class AgreementStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"


class TenantProfile(Base):
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    tenant_code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    property_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    room_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    bed_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("beds.id", ondelete="SET NULL"), nullable=True
    )
    guardian_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    guardian_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    guardian_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monthly_rent: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    admission_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
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
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    agreement_no: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    rent_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    terms: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[AgreementStatus] = mapped_column(
        Enum(AgreementStatus, name="agreement_status_enum"),
        default=AgreementStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    tenant_profile = relationship("TenantProfile", back_populates="agreements")
    # invoices = relationship("Invoice", back_populates="agreement", cascade="all, delete-orphan")

