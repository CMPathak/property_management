import enum
from sqlalchemy import String, Date, Time, Integer, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


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


class PaymentMode(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    UPI = "UPI"


class StaffProfile(Base):
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    employee_code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    property_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shift: Mapped[ShiftType] = mapped_column(
        Enum(ShiftType, name="shift_type_enum"),
        default=ShiftType.MORNING,
        nullable=False,
    )
    joining_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    salary: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    id_card_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_card_issued_on: Mapped[Date | None] = mapped_column(Date, nullable=True)
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
    attendance_date: Mapped[Date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Time | None] = mapped_column(Time, nullable=True)
    check_out: Mapped[Time | None] = mapped_column(Time, nullable=True)
    working_hours: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    overtime: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status_enum"),
        default=AttendanceStatus.PRESENT,
        nullable=False,
    )
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    staff_profile = relationship("StaffProfile", back_populates="attendances")

    @property
    def date(self):
        return self.attendance_date


class StaffSalary(Base):
    staff_profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    basic_salary: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    allowances: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    deductions: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    total_salary: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    # Relationships
    staff_profile = relationship("StaffProfile", back_populates="salaries")
