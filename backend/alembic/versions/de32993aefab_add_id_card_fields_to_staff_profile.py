"""add_id_card_fields_to_staff_profile

Revision ID: de32993aefab
Revises: 9640a449fb22
Create Date: 2026-07-25 14:11:00.941818

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de32993aefab'
down_revision: Union[str, None] = '9640a449fb22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new ID card columns to staff_profiles
    op.add_column('staff_profiles', sa.Column('photo_url', sa.String(), nullable=True))
    op.add_column('staff_profiles', sa.Column('blood_group', sa.String(), nullable=True))
    op.add_column('staff_profiles', sa.Column('id_card_number', sa.String(), nullable=True))
    op.add_column('staff_profiles', sa.Column('issue_date', sa.Date(), nullable=True))
    op.add_column('staff_profiles', sa.Column('valid_till', sa.Date(), nullable=True))


def downgrade() -> None:
    # Drop new ID card columns from staff_profiles
    op.drop_column('staff_profiles', 'valid_till')
    op.drop_column('staff_profiles', 'issue_date')
    op.drop_column('staff_profiles', 'id_card_number')
    op.drop_column('staff_profiles', 'blood_group')
    op.drop_column('staff_profiles', 'photo_url')
