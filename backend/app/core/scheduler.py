import logging
from datetime import datetime, timedelta, date
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import SessionLocal
from app.modules.tenant.model import TenantProfile, TenantStatus
from app.modules.billing.model import Invoice, InvoiceStatus
from app.utils.email import send_payment_reminder

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def automated_billing_job():
    """
    Runs daily to:
    1. Mark overdue invoices.
    2. Generate new invoices based on check-in date (admission_date).
    3. Send rent reminders for invoices due tomorrow.
    """
    logger.info("Starting automated_billing_job...")
    
    async with SessionLocal() as db:
        today = date.today()
        tomorrow = today + timedelta(days=1)
        
        # 1. Mark Overdue Invoices
        overdue_query = select(Invoice).where(
            Invoice.status == InvoiceStatus.PENDING,
            Invoice.due_date < today
        )
        overdue_invoices_result = await db.execute(overdue_query)
        overdue_invoices = overdue_invoices_result.scalars().all()
        
        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE
            logger.info(f"Marked invoice {inv.id} as OVERDUE")
        
        # 2. Generate New Invoices
        # Find ACTIVE tenants who haven't checked out
        active_tenants_query = select(TenantProfile).options(
            selectinload(TenantProfile.invoices),
            selectinload(TenantProfile.user)
        ).where(
            TenantProfile.status == TenantStatus.ACTIVE,
            TenantProfile.check_out_date.is_(None)
        )
        active_tenants_result = await db.execute(active_tenants_query)
        active_tenants = active_tenants_result.scalars().all()
        
        for tenant in active_tenants:
            if not tenant.admission_date:
                continue
                
            invoices = tenant.invoices
            
            # Find the latest invoice by billing_end_date
            latest_invoice = None
            if invoices:
                latest_invoice = max(invoices, key=lambda x: x.billing_end_date)
            
            next_start_date = None
            if not latest_invoice:
                next_start_date = tenant.admission_date
            else:
                next_start_date = latest_invoice.billing_end_date + timedelta(days=1)
                
            # If the next_start_date is <= today + 5 days (e.g. generate invoice 5 days in advance)
            # The prompt says "Every cycle automatically generate invoice." 
            # Let's generate it if next_start_date is on or before today
            if next_start_date <= today:
                # Need to check if there is an unpaid outstanding invoice
                # The user specified: "Never generate invoice before previous invoice is paid unless owner allows outstanding invoices"
                unpaid_invoices = [i for i in invoices if i.status in (InvoiceStatus.PENDING, InvoiceStatus.OVERDUE)]
                if unpaid_invoices:
                    logger.info(f"Skipping invoice generation for tenant {tenant.id}, has unpaid invoices.")
                    continue
                
                # Calculate next billing_end_date (1 month minus 1 day)
                import calendar
                days_in_month = calendar.monthrange(next_start_date.year, next_start_date.month)[1]
                next_end_date = next_start_date + timedelta(days=days_in_month - 1)
                due_date = next_start_date + timedelta(days=5) # 5 days to pay by default
                
                new_invoice = Invoice(
                    tenant_id=tenant.id,
                    invoice_no=f"INV-{int(datetime.now().timestamp())}",
                    billing_start_date=next_start_date,
                    billing_end_date=next_end_date,
                    invoice_date=today,
                    rent_amount=tenant.monthly_rent,
                    security_deposit=0.0,
                    total_amount=tenant.monthly_rent,
                    paid_amount=0.0,
                    due_date=due_date,
                    status=InvoiceStatus.PENDING
                )
                db.add(new_invoice)
                logger.info(f"Generated new invoice {new_invoice.invoice_no} for tenant {tenant.id}")

        # 3. Send Reminders
        reminders_query = select(Invoice).options(
            selectinload(Invoice.tenant_profile).selectinload(TenantProfile.user)
        ).where(
            Invoice.status == InvoiceStatus.PENDING,
            Invoice.due_date == tomorrow
        )
        reminders_result = await db.execute(reminders_query)
        reminders = reminders_result.scalars().all()
        
        for inv in reminders:
            if inv.tenant_profile and inv.tenant_profile.user and inv.tenant_profile.status == TenantStatus.ACTIVE and not inv.tenant_profile.check_out_date:
                # Send email
                await send_payment_reminder(
                    tenant_email=inv.tenant_profile.user.email,
                    tenant_name=inv.tenant_profile.user.full_name,
                    amount=inv.total_amount,
                    due_date=str(inv.due_date)
                )

        await db.commit()
    
    logger.info("automated_billing_job completed.")

def start_scheduler():
    scheduler.add_job(automated_billing_job, 'cron', hour=0, minute=0)
    scheduler.start()
    logger.info("Scheduler started.")
