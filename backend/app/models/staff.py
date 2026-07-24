import enum
from sqlalchemy import String, Date, Time, Integer, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base


class ShiftType(str, enum.Enum):
    MORNING = "MORNING"
    EVENING = "EVENING"
    NIGHT = "NIGHT"
    ROTATIONAL = "ROTATIONAL"


class StaffStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LEAVE = "LEAVE"
    HALF_DAY = "HALF_DAY"


class SalaryStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"


class StaffProfile(Base):
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    organization_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String, nullable=True)
    designation: Mapped[str | None] = mapped_column(String, nullable=True)
    join_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    primary_property_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    salary: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    shift: Mapped[ShiftType] = mapped_column(
        Enum(ShiftType, name="shift_type_enum"),
        default=ShiftType.MORNING,
        nullable=False,
    )
    documents: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    status: Mapped[StaffStatus] = mapped_column(
        Enum(StaffStatus, name="staff_status_enum"),
        default=StaffStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="staff_profile")
    attendances = relationship("StaffAttendance", back_populates="staff_profile", cascade="all, delete-orphan")
    salaries = relationship("StaffSalary", back_populates="staff_profile", cascade="all, delete-orphan")


class StaffAttendance(Base):
    staff_profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Time | None] = mapped_column(Time, nullable=True)
    check_out: Mapped[Time | None] = mapped_column(Time, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status_enum"),
        default=AttendanceStatus.PRESENT,
        nullable=False,
    )

    # Relationships
    staff_profile = relationship("StaffProfile", back_populates="attendances")


class StaffSalary(Base):
    staff_profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    base_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    bonus: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    deductions: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    net_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[SalaryStatus] = mapped_column(
        Enum(SalaryStatus, name="salary_status_enum"),
        default=SalaryStatus.PENDING,
        nullable=False,
    )

    # Relationships
    staff_profile = relationship("StaffProfile", back_populates="salaries")
