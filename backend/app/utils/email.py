import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

logger = logging.getLogger(__name__)

# Basic dummy configuration, should be replaced with real ENV variables
conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER if hasattr(settings, "SMTP_USER") else "test@example.com",
    MAIL_PASSWORD=settings.SMTP_PASSWORD if hasattr(settings, "SMTP_PASSWORD") else "password",
    MAIL_FROM=settings.SMTP_FROM if hasattr(settings, "SMTP_FROM") else "billing@accoumaxx.com",
    MAIL_PORT=settings.SMTP_PORT if hasattr(settings, "SMTP_PORT") else 587,
    MAIL_SERVER=settings.SMTP_HOST if hasattr(settings, "SMTP_HOST") else "smtp.example.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False
)

fm = FastMail(conf)

async def send_payment_reminder(tenant_email: str, tenant_name: str, amount: float, due_date: str):
    html = f"""
    <p>Hello {tenant_name},</p>
    <p>Your monthly rent of <strong>₹{amount}</strong> is due tomorrow.</p>
    <p>Due Date: <strong>{due_date}</strong></p>
    <p>Please log in to your dashboard to pay your rent.</p>
    <br>
    <p>Thank you,</p>
    <p>Accoumaxx Management</p>
    """
    
    message = MessageSchema(
        subject="Rent Due Tomorrow",
        recipients=[tenant_email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        await fm.send_message(message)
        logger.info(f"Payment reminder sent to {tenant_email}")
    except Exception as e:
        logger.error(f"Failed to send reminder to {tenant_email}: {e}")

async def send_payment_success_email(tenant_email: str, tenant_name: str, invoice_no: str, amount: float):
    html = f"""
    <p>Hello {tenant_name},</p>
    <p>We have successfully received your payment.</p>
    <p>Invoice: <strong>{invoice_no}</strong></p>
    <p>Amount: <strong>₹{amount}</strong></p>
    <p>Status: <strong>PAID</strong></p>
    <br>
    <p>Thank you,</p>
    <p>Accoumaxx Management</p>
    """
    
    message = MessageSchema(
        subject="Payment Successful",
        recipients=[tenant_email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        await fm.send_message(message)
        logger.info(f"Payment success email sent to {tenant_email}")
    except Exception as e:
        logger.error(f"Failed to send payment success to {tenant_email}: {e}")
