import enum
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class InvoiceStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    VOID = "VOID"


class PaymentMode(str, enum.Enum):
    ONLINE = "ONLINE"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"


class PaymentStatus(str, enum.Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    SUCCESS = "SUCCESS"
    REJECTED = "REJECTED"


class ReminderType(str, enum.Enum):
    THREE_DAYS_BEFORE = "THREE_DAYS_BEFORE"
    ONE_DAY_BEFORE = "ONE_DAY_BEFORE"
    DUE_DATE = "DUE_DATE"
    WEEKLY_PAST_DUE = "WEEKLY_PAST_DUE"


class ReminderStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    READ = "READ"
    FAILED = "FAILED"


class Invoice(Base):
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    invoice_no: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    billing_start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    billing_end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    invoice_date: Mapped[Date] = mapped_column(Date, server_default=func.now(), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    rent_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status_enum"),
        default=InvoiceStatus.PENDING,
        nullable=False,
    )

    # Relationships with selectin loading for nested serialization
    tenant_profile = relationship("TenantProfile", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin")
    reminders = relationship("RentReminder", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin")


class Payment(Base):
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_mode: Mapped[PaymentMode] = mapped_column(
        Enum(PaymentMode, name="billing_payment_mode_enum"),
        nullable=False,
    )
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_proof: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.PENDING_VERIFICATION,
        nullable=False,
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    tenant = relationship("TenantProfile")


class RentReminder(Base):
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    reminder_type: Mapped[ReminderType] = mapped_column(
        Enum(ReminderType, name="reminder_type_enum"),
        nullable=False,
    )
    reminder_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[ReminderStatus] = mapped_column(
        Enum(ReminderStatus, name="reminder_status_enum"),
        default=ReminderStatus.PENDING,
        nullable=False,
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="reminders")
    tenant = relationship("TenantProfile")

class PaymentSettings(Base):
    __tablename__ = 'payment_settings'
    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=func.uuid_generate_v4())
    organization_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True) # or property_id
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(100), nullable=False)
    qr_code_image: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_instruction: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

