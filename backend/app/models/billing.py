import enum
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class InvoiceStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    VOID = "VOID"


class PaymentMethod(str, enum.Enum):
    ONLINE = "ONLINE"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ReminderType(str, enum.Enum):
    THREE_DAYS_BEFORE = "THREE_DAYS_BEFORE"
    ONE_DAY_BEFORE = "ONE_DAY_BEFORE"
    DUE_DATE = "DUE_DATE"
    WEEKLY_PAST_DUE = "WEEKLY_PAST_DUE"


class ReminderStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class Invoice(Base):
    tenant_profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), nullable=False
    )
    agreement_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agreements.id", ondelete="CASCADE"), nullable=False
    )
    billing_period_start: Mapped[Date] = mapped_column(Date, nullable=False)
    billing_period_end: Mapped[Date] = mapped_column(Date, nullable=False)
    rent_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    utility_charges: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    late_fees: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status_enum"),
        default=InvoiceStatus.UNPAID,
        nullable=False,
    )
    pdf_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships with selectin loading for nested serialization
    tenant_profile = relationship("TenantProfile", back_populates="invoices")
    agreement = relationship("Agreement", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin")
    reminders = relationship("RentReminder", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin")


class Payment(Base):
    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum"),
        nullable=False,
    )
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")


class RentReminder(Base):
    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    reminder_type: Mapped[ReminderType] = mapped_column(
        Enum(ReminderType, name="reminder_type_enum"),
        nullable=False,
    )
    scheduled_date: Mapped[Date] = mapped_column(Date, nullable=False)
    sent_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ReminderStatus] = mapped_column(
        Enum(ReminderStatus, name="reminder_status_enum"),
        default=ReminderStatus.PENDING,
        nullable=False,
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="reminders")
