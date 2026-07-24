from sqlalchemy import String, JSON, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base

# Association table for property managers
property_managers = Table(
    "property_managers",
    Base.metadata,
    Column(
        "property_id",
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Property(Base):
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    images: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    documents: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)

    # Relationships configured with selectin loading for async compatibility
    floors = relationship("Floor", back_populates="property", cascade="all, delete-orphan", lazy="selectin")
    managers = relationship(
        "User",
        secondary=property_managers,
        back_populates="properties_managed",
        lazy="selectin"
    )
    complaints = relationship("Complaint", back_populates="property", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="property", cascade="all, delete-orphan")
