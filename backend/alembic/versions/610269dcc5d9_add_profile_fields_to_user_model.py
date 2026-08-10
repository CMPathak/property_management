"""add profile fields to user model

Revision ID: 610269dcc5d9
Revises: 7ae6f74c0926
Create Date: 2026-08-04 11:03:07.218110

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '610269dcc5d9'
down_revision: Union[str, None] = '7ae6f74c0926'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
