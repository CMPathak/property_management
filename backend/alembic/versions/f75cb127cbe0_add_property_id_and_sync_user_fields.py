"""Add property_id and sync user fields

Revision ID: f75cb127cbe0
Revises: 9b0521111da7
Create Date: 2026-07-31 10:31:33.223050

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f75cb127cbe0'
down_revision: Union[str, None] = '9b0521111da7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Set default values for NULL columns before setting them to NOT NULL
    op.execute("UPDATE agreements SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL")
    op.execute("UPDATE agreements SET deposit_amount = 0 WHERE deposit_amount IS NULL")
    op.execute("UPDATE complaints SET subject = 'No Subject' WHERE subject IS NULL")
    op.execute("UPDATE floors SET status = 'ACTIVE' WHERE status IS NULL")
    op.execute("UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL")
    op.execute("UPDATE login_histories SET status = 'SUCCESS' WHERE status IS NULL")
    op.execute("UPDATE notification_logs SET notification_type = 'EMAIL' WHERE notification_type IS NULL")
    op.execute("UPDATE notification_logs SET message = '' WHERE message IS NULL")
    op.execute("UPDATE notification_logs SET is_read = false WHERE is_read IS NULL")
    op.execute("UPDATE payments SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL")
    op.execute("UPDATE payments SET payment_mode = 'CASH' WHERE payment_mode IS NULL")
    op.execute("UPDATE properties SET status = 'ACTIVE' WHERE status IS NULL")
    op.execute("UPDATE rent_reminders SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL")
    op.execute("UPDATE rent_reminders SET reminder_date = CURRENT_DATE WHERE reminder_date IS NULL")
    op.execute("UPDATE rooms SET monthly_rent = 0 WHERE monthly_rent IS NULL")
    op.execute("UPDATE rooms SET security_deposit = 0 WHERE security_deposit IS NULL")
    op.execute("UPDATE rooms SET status = 'AVAILABLE' WHERE status IS NULL")
    op.execute("UPDATE staff_attendances SET attendance_date = CURRENT_DATE WHERE attendance_date IS NULL")
    op.execute("UPDATE staff_salaries SET basic_salary = 0 WHERE basic_salary IS NULL")
    op.execute("UPDATE staff_salaries SET allowances = 0 WHERE allowances IS NULL")
    op.execute("UPDATE staff_salaries SET total_salary = 0 WHERE total_salary IS NULL")
    op.execute("UPDATE tenant_profiles SET monthly_rent = 0 WHERE monthly_rent IS NULL")
    op.execute("UPDATE users SET phone_verified = false WHERE phone_verified IS NULL")

    op.alter_column('agreements', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('agreements', 'deposit_amount',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('complaints', 'subject',
               existing_type=sa.VARCHAR(length=100),
               nullable=False)
    op.alter_column('floors', 'status',
               existing_type=postgresql.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', name='floor_status_enum'),
               nullable=False)
    op.alter_column('invoices', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('login_histories', 'status',
               existing_type=postgresql.ENUM('SUCCESS', 'FAILED', name='login_status_enum'),
               nullable=False)
    op.alter_column('notification_logs', 'notification_type',
               existing_type=postgresql.ENUM('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', name='notification_type_enum'),
               nullable=False)
    op.alter_column('notification_logs', 'message',
               existing_type=sa.VARCHAR(length=500),
               nullable=False)
    op.alter_column('notification_logs', 'is_read',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('payments', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('payments', 'payment_mode',
               existing_type=postgresql.ENUM('ONLINE', 'CASH', 'BANK_TRANSFER', 'CHEQUE', name='billing_payment_mode_enum'),
               nullable=False)
    op.alter_column('properties', 'status',
               existing_type=postgresql.ENUM('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', name='property_status_enum'),
               nullable=False)
    op.alter_column('rent_reminders', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('rent_reminders', 'reminder_date',
               existing_type=sa.DATE(),
               nullable=False)
    op.alter_column('rooms', 'monthly_rent',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('rooms', 'security_deposit',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('rooms', 'status',
               existing_type=postgresql.ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', name='room_status_enum'),
               nullable=False)
    op.alter_column('staff_attendances', 'attendance_date',
               existing_type=sa.DATE(),
               nullable=False)
    op.create_unique_constraint(None, 'staff_profiles', ['employee_code'])
    op.alter_column('staff_salaries', 'basic_salary',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('staff_salaries', 'allowances',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('staff_salaries', 'total_salary',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('tenant_profiles', 'monthly_rent',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('users', 'phone_verified',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=False)
    op.alter_column('users', 'phone_verified',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('tenant_profiles', 'monthly_rent',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('staff_salaries', 'total_salary',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('staff_salaries', 'allowances',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('staff_salaries', 'basic_salary',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.drop_constraint(None, 'staff_profiles', type_='unique')
    op.alter_column('staff_attendances', 'attendance_date',
               existing_type=sa.DATE(),
               nullable=True)
    op.alter_column('rooms', 'status',
               existing_type=postgresql.ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', name='room_status_enum'),
               nullable=True)
    op.alter_column('rooms', 'security_deposit',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('rooms', 'monthly_rent',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('rent_reminders', 'reminder_date',
               existing_type=sa.DATE(),
               nullable=True)
    op.alter_column('rent_reminders', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('properties', 'status',
               existing_type=postgresql.ENUM('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', name='property_status_enum'),
               nullable=True)
    op.alter_column('payments', 'payment_mode',
               existing_type=postgresql.ENUM('ONLINE', 'CASH', 'BANK_TRANSFER', 'CHEQUE', name='billing_payment_mode_enum'),
               nullable=True)
    op.alter_column('payments', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('notification_logs', 'is_read',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('notification_logs', 'message',
               existing_type=sa.VARCHAR(length=500),
               nullable=True)
    op.alter_column('notification_logs', 'notification_type',
               existing_type=postgresql.ENUM('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', name='notification_type_enum'),
               nullable=True)
    op.alter_column('login_histories', 'status',
               existing_type=postgresql.ENUM('SUCCESS', 'FAILED', name='login_status_enum'),
               nullable=True)
    op.alter_column('invoices', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('floors', 'status',
               existing_type=postgresql.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', name='floor_status_enum'),
               nullable=True)
    op.alter_column('complaints', 'subject',
               existing_type=sa.VARCHAR(length=100),
               nullable=True)
    op.alter_column('agreements', 'deposit_amount',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
    op.alter_column('agreements', 'tenant_id',
               existing_type=sa.UUID(),
               nullable=True)
    # ### end Alembic commands ###
