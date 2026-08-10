import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash, verify_password
from app.modules.users.model import User, LoginHistory, UserRole
from app.repositories.base import BaseRepository
from app.modules.users.schema import UserCreate, UserUpdate


class CRUDUser(BaseRepository[User, UserCreate, UserUpdate]):
    async def get(self, db: AsyncSession, id: uuid.UUID) -> User | None:
        from sqlalchemy.orm import selectinload
        statement = (
            select(User)
            .options(
                selectinload(User.tenant_profile),
                selectinload(User.staff_profile),
            )
            .where(User.id == id, User.deleted_at.is_(None))
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """
        Fetch a user by their unique email.
        """
        statement = select(User).where(User.email == email, User.deleted_at.is_(None))
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self, db: AsyncSession, *, obj_in: UserCreate, user_id: uuid.UUID | None = None
    ) -> User:
        """
        Create a new user with password hashing and automatically create StaffProfile.
        """
        db_obj = User(
            email=obj_in.email,
            password_hash=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            phone=obj_in.phone,
            role=obj_in.role,
            is_active=obj_in.is_active,
            email_verified=obj_in.email_verified,
        )
        if user_id:
            db_obj.created_by = user_id
            db_obj.updated_by = user_id

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)

        if db_obj.role not in [UserRole.TENANT]:
            from app.modules.staff.model import StaffProfile, ShiftType
            shift_val = ShiftType.MORNING
            if obj_in.shift_timing == "NIGHT":
                shift_val = ShiftType.NIGHT
            
            staff_profile = StaffProfile(
                user_id=db_obj.id,
                shift=shift_val,
                employee_code=obj_in.employee_id,
                designation=obj_in.designation,
                department=obj_in.department,
                organization_id=getattr(db_obj, "organization_id", None),
                blood_group=obj_in.blood_group,
                issue_date=obj_in.issue_date,
                valid_till=obj_in.valid_till
            )
            db.add(staff_profile)
            await db.commit()

        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: User,
        obj_in: UserUpdate | dict[str, Any],
        user_id: uuid.UUID | None = None
    ) -> User:
        """
        Update a user, including password hashing and sync StaffProfile.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data and update_data["password"]:
            password_hash = get_password_hash(update_data["password"])
            db_obj.password_hash = password_hash
            del update_data["password"]

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        if user_id:
            db_obj.updated_by = user_id

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)

        if db_obj.role not in [UserRole.TENANT]:
            from app.modules.staff.model import StaffProfile, ShiftType
            profile_statement = select(StaffProfile).where(StaffProfile.user_id == db_obj.id)
            profile_res = await db.execute(profile_statement)
            staff_profile = profile_res.scalar_one_or_none()
            
            shift_val = ShiftType.MORNING
            shift_timing_str = update_data.get("shift_timing")
            if shift_timing_str in ["NIGHT", "Night"]:
                shift_val = ShiftType.NIGHT
            elif shift_timing_str in ["EVENING", "Evening"]:
                shift_val = ShiftType.EVENING
                
            if not staff_profile:
                staff_profile = StaffProfile(
                    user_id=db_obj.id,
                    shift=shift_val,
                    employee_code=update_data.get("employee_id"),
                    designation=update_data.get("designation"),
                    department=update_data.get("department"),
                    organization_id=getattr(db_obj, "organization_id", None),
                    blood_group=update_data.get("blood_group"),
                    issue_date=update_data.get("issue_date"),
                    valid_till=update_data.get("valid_till")
                )
                db.add(staff_profile)
            else:
                if "shift_timing" in update_data:
                    staff_profile.shift = shift_val
                if "employee_id" in update_data:
                    staff_profile.employee_code = update_data["employee_id"]
                if "designation" in update_data:
                    staff_profile.designation = update_data["designation"]
                if "department" in update_data:
                    staff_profile.department = update_data["department"]
                staff_profile.organization_id = getattr(db_obj, "organization_id", None)
                if "blood_group" in update_data:
                    staff_profile.blood_group = update_data["blood_group"]
                if "issue_date" in update_data:
                    staff_profile.issue_date = update_data["issue_date"]
                if "valid_till" in update_data:
                    staff_profile.valid_till = update_data["valid_till"]
                db.add(staff_profile)
                
            await db.commit()

        return db_obj

    async def authenticate(
        self, db: AsyncSession, *, email: str, password: str
    ) -> User | None:
        """
        Authenticate a user by email and password.
        """
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def add_login_history(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_info: str | None = None
    ) -> LoginHistory:
        """
        Log user login event to login history audit.
        """
        login_log = LoginHistory(
            user_id=user_id,
            ip_address=ip_address,
            device=device_info,
        )
        db.add(login_log)
        await db.commit()
        await db.refresh(login_log)
        return login_log


user_crud = CRUDUser(User)
