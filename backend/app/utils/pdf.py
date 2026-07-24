import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.core.config import settings


def generate_invoice_pdf(
    invoice_id: str,
    invoice_number: str,
    billing_period: str,
    due_date: str,
    tenant_name: str,
    room_number: str,
    rent_amount: float,
    utility_charges: float,
    late_fees: float,
    discount: float,
    total_amount: float,
    status: str,
) -> str:
    """
    Generate a professional PDF invoice using ReportLab Platypus.
    Returns the path to the generated file.
    """
    # Create target directory
    pdf_dir = Path(settings.UPLOAD_DIR) / "invoices"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    
    file_name = f"invoice_{invoice_number}.pdf"
    file_path = pdf_dir / file_name

    # Setup document
    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    
    story = []
    styles = getSampleStyleSheet()

    # Colors
    primary_color = colors.HexColor("#1A365D")
    secondary_color = colors.HexColor("#4A5568")
    light_bg = colors.HexColor("#F7FAFC")
    border_color = colors.HexColor("#E2E8F0")

    # Custom styles
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=24,
        leading=28,
        textColor=primary_color,
    )
    
    header_style = ParagraphStyle(
        "InvoiceHeader",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=secondary_color,
    )

    body_style = ParagraphStyle(
        "InvoiceBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.black,
    )

    bold_style = ParagraphStyle(
        "InvoiceBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    right_align_style = ParagraphStyle(
        "RightAlign",
        parent=body_style,
        alignment=2,  # Right align
    )

    right_align_bold_style = ParagraphStyle(
        "RightAlignBold",
        parent=bold_style,
        alignment=2,  # Right align
    )

    # 1. Header Section
    header_data = [
        [
            Paragraph("ACCOUMAXX PORTAL", title_style),
            Paragraph(f"<b>INVOICE</b><br/>#{invoice_number}", right_align_style),
        ],
        [
            Paragraph("123 Property St, Suite 100<br/>Phone: +1 555-0199<br/>support@accoumaxx.com", header_style),
            Paragraph(f"Date: {billing_period.split(' to ')[0]}<br/>Due Date: {due_date}<br/>Status: <b>{status}</b>", right_align_style),
        ]
    ]
    
    header_table = Table(header_data, colWidths=[300, 230])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # 2. Bill To & Details
    details_data = [
        [
            Paragraph("<b>BILL TO:</b>", header_style),
            Paragraph("<b>PROPERTY DETAILS:</b>", header_style),
        ],
        [
            Paragraph(f"Tenant Name: {tenant_name}", body_style),
            Paragraph(f"Room Number: {room_number}", body_style),
        ]
    ]
    
    details_table = Table(details_data, colWidths=[265, 265])
    details_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), light_bg),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("BOX", (0, 0), (-1, -1), 1, border_color),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 20))

    # 3. Invoice Items Table
    items_data = [
        [
            Paragraph("<b>Description</b>", bold_style),
            Paragraph("<b>Amount</b>", right_align_bold_style),
        ],
        [
            Paragraph("Monthly Rent Charge", body_style),
            Paragraph(f"${rent_amount:,.2f}", right_align_style),
        ],
        [
            Paragraph("Utility Charges (Electricity, Water, WiFi)", body_style),
            Paragraph(f"${utility_charges:,.2f}", right_align_style),
        ],
        [
            Paragraph("Late Payment Fees", body_style),
            Paragraph(f"${late_fees:,.2f}", right_align_style),
        ],
        [
            Paragraph("Discounts Applied", body_style),
            Paragraph(f"-${discount:,.2f}", right_align_style),
        ],
        [
            Paragraph("<b>Total Amount Due</b>", bold_style),
            Paragraph(f"<b>${total_amount:,.2f}</b>", right_align_bold_style),
        ]
    ]

    items_table = Table(items_data, colWidths=[400, 130])
    items_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 1, primary_color),
        ("BACKGROUND", (0, 0), (-1, 0), light_bg),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, border_color),
        ("LINEABOVE", (0, -1), (-1, -1), 1, primary_color),
        ("BACKGROUND", (0, -1), (-1, -1), light_bg),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 40))

    # 4. Footer Note
    footer_text = "Thank you for renting with Accoumaxx. Please pay your invoices on time to avoid late fees. For online payments, log in to your tenant dashboard."
    story.append(Paragraph(footer_text, header_style))

    # Build PDF
    doc.build(story)
    
    # Return path relative to project root
    return f"{settings.UPLOAD_DIR}/invoices/{file_name}"
