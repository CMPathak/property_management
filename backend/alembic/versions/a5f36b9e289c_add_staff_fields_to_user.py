"""add staff fields to user

Revision ID: a5f36b9e289c
Revises: 3ecdc8965c08
Create Date: 2026-07-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5f36b9e289c'
down_revision: Union[str, None] = '3ecdc8965c08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('employee_id', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('designation', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('department', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('shift_timing', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'shift_timing')
    op.drop_column('users', 'department')
    op.drop_column('users', 'designation')
    op.drop_column('users', 'employee_id')
