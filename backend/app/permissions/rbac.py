import enum
from fastapi import Depends, HTTPException, status
from app.modules.users.model import User, UserRole
from app.core.dependencies import get_current_user

class PermissionAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    PRINT = "print"
    APPROVE = "approve"
    ASSIGN = "assign"


# RBAC Matrix mapping UserRole to allowable permission tokens
# Format: "resource:action" or "*" for all
# RBAC Matrix mapping UserRole to allowable permission tokens
# Format: "resource:action" or "*" for all
ROLE_PERMISSIONS: dict[UserRole, list[str]] = {
    UserRole.SUPER_ADMIN: ["*"],
    UserRole.OWNER: ["*"],
    UserRole.STAFF: [
        "property:read", "floor:read", "room:read", "bed:read", "tenant:read",
        "agreement:read",
        "complaint:create", "complaint:read", "complaint:update",
        "staff_attendance:create", "staff_attendance:read"
    ],
    UserRole.TENANT: [
        "property:read", "floor:read", "room:read", "bed:read",
        "tenant:read",
        "agreement:read",
        "invoice:read", "invoice:print",
        "payment:create", "payment:read",
        "complaint:create", "complaint:read", "complaint:update"
    ]
}

# Designation-specific permissions for STAFF role
STAFF_DESIGNATION_PERMISSIONS: dict[str, list[str]] = {
    "Property Manager": [
        "property:create", "property:read", "property:update", "property:assign",
        "floor:create", "floor:read", "floor:update",
        "room:create", "room:read", "room:update",
        "bed:create", "bed:read", "bed:update",
        "tenant:create", "tenant:read", "tenant:update", "tenant:assign",
        "agreement:create", "agreement:read", "agreement:update",
        "rent:create", "rent:read", "rent:update", "rent:approve",
        "invoice:create", "invoice:read", "invoice:update", "invoice:print", "invoice:export",
        "payment:create", "payment:read", "payment:update",
        "complaint:create", "complaint:read", "complaint:update", "complaint:assign", "complaint:approve",
        "staff:read", "staff:update", "staff:assign",
        "staff_attendance:read", "staff_attendance:create",
        "expense:create", "expense:read", "expense:update", "expense:export",
        "report:read", "report:export", "report:print"
    ],
    "Accountant": [
        "property:read", "floor:read", "room:read", "bed:read", "tenant:read",
        "agreement:read",
        "rent:read", "rent:update", "rent:approve",
        "invoice:create", "invoice:read", "invoice:update", "invoice:print", "invoice:export",
        "payment:create", "payment:read", "payment:update", "payment:approve",
        "staff:read", "staff_salary:create", "staff_salary:read", "staff_salary:update", "staff_salary:approve",
        "expense:create", "expense:read", "expense:update", "expense:export",
        "report:read", "report:export", "report:print"
    ]
}


class PermissionChecker:
    def __init__(self, resource: str, action: PermissionAction):
        self.resource = resource
        self.action = action

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role
        allowed_permissions = list(ROLE_PERMISSIONS.get(user_role, []))

        # Dynamically append designation-specific permissions for STAFF
        if user_role == UserRole.STAFF:
            designation = None
            if current_user.staff_profile and hasattr(current_user.staff_profile, 'designation'):
                designation = current_user.staff_profile.designation
                
            if designation:
                designation_perms = STAFF_DESIGNATION_PERMISSIONS.get(designation, [])
                allowed_permissions.extend(designation_perms)

        # Super admin and owner have wildcard permissions
        if "*" in allowed_permissions:
            return current_user

        # Format checking
        required_permission = f"{self.resource}:{self.action.value}"
        if required_permission in allowed_permissions:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User role {user_role.value} does not have permission to execute action '{self.action.value}' on resource '{self.resource}'"
        )


# Direct wrapper function for role validation
def require_role(allowed_roles: list[UserRole]):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role {current_user.role.value} is not allowed to access this resource"
            )
        return current_user
    return dependency
