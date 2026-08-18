import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

logger = logging.getLogger(__name__)

# Basic dummy configuration, should be replaced with real ENV variables
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME if hasattr(settings, "MAIL_USERNAME") else "test@example.com",
    MAIL_PASSWORD=settings.MAIL_PASSWORD if hasattr(settings, "MAIL_PASSWORD") else "password",
    MAIL_FROM=settings.MAIL_FROM if hasattr(settings, "MAIL_FROM") else "billing@accomaxx.com",
    MAIL_PORT=settings.MAIL_PORT if hasattr(settings, "MAIL_PORT") else 587,
    MAIL_SERVER=settings.MAIL_SERVER if hasattr(settings, "MAIL_SERVER") else "smtp.example.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False
)

fm = FastMail(conf)

async def send_payment_reminder(tenant_email: str, tenant_name: str, amount: float, due_date: str):
    html = f"""
    <div style="font-family: 'Inter', Helvetica, sans-serif; background-color: #F8FAFC; padding: 40px 20px; color: #0F172A;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
            <div style="background-color: #2563EB; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Accomaxx</h1>
            </div>
            <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #475569; margin-top: 0;">Hello <strong>{tenant_name}</strong>,</p>
                <p style="font-size: 16px; color: #475569; line-height: 1.5;">This is a friendly reminder that your monthly rent is due tomorrow. Please ensure timely payment to avoid any late fees.</p>
                
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                    <p style="font-size: 14px; color: #64748B; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Amount Due</p>
                    <p style="font-size: 32px; color: #0F172A; font-weight: 800; margin: 0;">₹{amount}</p>
                    <div style="margin-top: 15px; display: inline-block; background-color: #FEF2F2; color: #DC2626; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                        Due Date: {due_date}
                    </div>
                </div>
                
                <p style="font-size: 16px; color: #475569; margin-bottom: 30px;">You can easily pay your rent by logging into your tenant dashboard.</p>
                
                <div style="text-align: center;">
                    <a href="http://localhost:5173/login" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">Pay Rent Now</a>
                </div>
            </div>
            <div style="background-color: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0; color: #94A3B8; font-size: 13px;">© 2026 Accomaxx Management. All rights reserved.</p>
            </div>
        </div>
    </div>
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
    <div style="font-family: 'Inter', Helvetica, sans-serif; background-color: #F8FAFC; padding: 40px 20px; color: #0F172A;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
            <div style="background-color: #16A34A; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Payment Successful</h1>
            </div>
            <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #475569; margin-top: 0;">Hello <strong>{tenant_name}</strong>,</p>
                <p style="font-size: 16px; color: #475569; line-height: 1.5;">Thank you! We have successfully received your payment. Your rent is now cleared for the current billing cycle.</p>
                
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #CBD5E1; padding-bottom: 12px;">
                        <span style="color: #64748B; font-size: 15px;">Invoice Number</span>
                        <span style="color: #0F172A; font-weight: 600; font-size: 15px;">{invoice_no}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #CBD5E1; padding-bottom: 12px;">
                        <span style="color: #64748B; font-size: 15px;">Amount Paid</span>
                        <span style="color: #0F172A; font-weight: 600; font-size: 15px;">₹{amount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748B; font-size: 15px;">Status</span>
                        <span style="color: #16A34A; font-weight: 700; font-size: 15px; background-color: #DCFCE7; padding: 4px 10px; border-radius: 6px;">PAID</span>
                    </div>
                </div>
                
                <p style="font-size: 16px; color: #475569; margin-bottom: 30px;">You can view and download your payment receipt from your dashboard.</p>
                
                <div style="text-align: center;">
                    <a href="http://localhost:5173/login" style="display: inline-block; background-color: #16A34A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Receipt</a>
                </div>
            </div>
            <div style="background-color: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0; color: #94A3B8; font-size: 13px;">© 2026 Accomaxx Management. All rights reserved.</p>
            </div>
        </div>
    </div>
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
