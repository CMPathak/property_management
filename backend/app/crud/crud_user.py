import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash, verify_password
from app.models.users import User, LoginHistory, UserRole
from app.repositories.base import BaseRepository
from app.schemas.users import UserCreate, UserUpdate


class CRUDUser(BaseRepository[User, UserCreate, UserUpdate]):
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
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            phone_number=obj_in.phone_number,
            role=obj_in.role,
            is_active=obj_in.is_active,
            is_verified=obj_in.is_verified,
            employee_id=obj_in.employee_id,
            designation=obj_in.designation,
            department=obj_in.department,
            shift_timing=obj_in.shift_timing,
        )
        if user_id:
            db_obj.created_by = user_id
            db_obj.updated_by = user_id

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)

        if db_obj.role not in [UserRole.TENANT]:
            from app.models.staff import StaffProfile, ShiftType
            shift_val = ShiftType.MORNING
            if db_obj.shift_timing == "NIGHT":
                shift_val = ShiftType.NIGHT
            
            staff_profile = StaffProfile(
                user_id=db_obj.id,
                shift=shift_val,
                employee_code=db_obj.employee_id,
                designation=db_obj.designation,
                organization_id=getattr(db_obj, "organization_id", None)
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
            hashed_password = get_password_hash(update_data["password"])
            db_obj.hashed_password = hashed_password
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
            from app.models.staff import StaffProfile, ShiftType
            profile_statement = select(StaffProfile).where(StaffProfile.user_id == db_obj.id)
            profile_res = await db.execute(profile_statement)
            staff_profile = profile_res.scalar_one_or_none()
            
            shift_val = ShiftType.MORNING
            if db_obj.shift_timing == "NIGHT":
                shift_val = ShiftType.NIGHT
                
            if not staff_profile:
                staff_profile = StaffProfile(
                    user_id=db_obj.id,
                    shift=shift_val,
                    employee_code=db_obj.employee_id,
                    designation=db_obj.designation,
                    organization_id=getattr(db_obj, "organization_id", None)
                )
                db.add(staff_profile)
            else:
                staff_profile.shift = shift_val
                staff_profile.employee_code = db_obj.employee_id
                staff_profile.designation = db_obj.designation
                staff_profile.organization_id = getattr(db_obj, "organization_id", None)
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
        if not verify_password(password, user.hashed_password):
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
            user_agent=user_agent,
            device_info=device_info,
        )
        db.add(login_log)
        await db.commit()
        await db.refresh(login_log)
        return login_log


user_crud = CRUDUser(User)
