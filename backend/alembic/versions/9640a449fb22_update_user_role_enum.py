"""update_user_role_enum

Revision ID: 9640a449fb22
Revises: a5f36b9e289c
Create Date: 2026-07-25 10:10:26.676846

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9640a449fb22'
down_revision: Union[str, None] = 'a5f36b9e289c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update any existing MANAGER users to STAFF role with Property Manager designation
    op.execute(
        "UPDATE users SET designation = 'Property Manager', department = 'Administration', role = 'STAFF' WHERE role = 'MANAGER'"
    )
    # 2. Update any existing ACCOUNTANT users to STAFF role with Accountant designation
    op.execute(
        "UPDATE users SET designation = 'Accountant', department = 'Accounts & Finance', role = 'STAFF' WHERE role = 'ACCOUNTANT'"
    )


def downgrade() -> None:
    # Revert roles back to MANAGER/ACCOUNTANT based on their designations
    op.execute(
        "UPDATE users SET role = 'MANAGER' WHERE role = 'STAFF' AND designation = 'Property Manager'"
    )
    op.execute(
        "UPDATE users SET role = 'ACCOUNTANT' WHERE role = 'STAFF' AND designation = 'Accountant'"
    )
