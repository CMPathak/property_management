import enum
from sqlalchemy import String, Date, Numeric, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ExpenseCategory(str, enum.Enum):
    MAINTENANCE = "MAINTENANCE"
    UTILITY = "UTILITY"
    SALARY = "SALARY"
    MARKETING = "MARKETING"
    TAX = "TAX"
    OTHER = "OTHER"

class PaymentMode(str, enum.Enum):
    ONLINE = "ONLINE"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"

class Expense(Base):
    property_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=True
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category_enum"),
        default=ExpenseCategory.OTHER,
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    expense_date: Mapped[Date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_mode: Mapped[PaymentMode | None] = mapped_column(
        Enum(PaymentMode, name="expense_payment_mode_enum"),
        nullable=True,
    )
    created_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    property = relationship("Property", back_populates="expenses")
    creator = relationship("User", foreign_keys=[created_by])
