import enum
from sqlalchemy import String, Date, Numeric, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class ExpenseCategory(str, enum.Enum):
    MAINTENANCE = "MAINTENANCE"
    UTILITY = "UTILITY"
    SALARY = "SALARY"
    MARKETING = "MARKETING"
    TAX = "TAX"
    OTHER = "OTHER"


class Expense(Base):
    property_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category_enum"),
        default=ExpenseCategory.OTHER,
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    receipt_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    property = relationship("Property", back_populates="expenses")
