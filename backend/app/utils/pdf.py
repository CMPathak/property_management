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
    security_deposit: float,
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
    ]
    if rent_amount > 0:
        items_data.append([
            Paragraph("Monthly Rent Charge", body_style),
            Paragraph(f"Rs. {rent_amount:,.2f}", right_align_style),
        ])
    if security_deposit > 0:
        items_data.append([
            Paragraph("Security Deposit Charge", body_style),
            Paragraph(f"Rs. {security_deposit:,.2f}", right_align_style),
        ])
    items_data.extend([
        [
            Paragraph("Utility Charges (Electricity, Water, WiFi)", body_style),
            Paragraph(f"Rs. {utility_charges:,.2f}", right_align_style),
        ],
        [
            Paragraph("Late Payment Fees", body_style),
            Paragraph(f"Rs. {late_fees:,.2f}", right_align_style),
        ],
        [
            Paragraph("Discounts Applied", body_style),
            Paragraph(f"-Rs. {discount:,.2f}", right_align_style),
        ],
        [
            Paragraph("<b>Total Amount Due</b>", bold_style),
            Paragraph(f"<b>Rs. {total_amount:,.2f}</b>", right_align_bold_style),
        ]
    ])

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


def generate_agreement_pdf(
    agreement_no: str,
    tenant_name: str,
    room_bed: str,
    start_date: str,
    end_date: str,
    rent_amount: float,
    security_deposit: float,
    status: str,
) -> str:
    """
    Generate a professional Rental Lease Agreement PDF using ReportLab Platypus.
    Returns the file path.
    """
    pdf_dir = Path(settings.UPLOAD_DIR) / "agreements"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    
    file_name = f"agreement_{agreement_no}.pdf"
    file_path = pdf_dir / file_name

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

    primary_color = colors.HexColor("#1E3A8A")
    secondary_color = colors.HexColor("#475569")
    light_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        "AgrTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=primary_color,
        fontName="Helvetica-Bold",
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        "AgrSubTitle",
        parent=styles["Normal"],
        fontSize=11,
        leading=14,
        textColor=secondary_color,
        alignment=1,
    )
    section_heading = ParagraphStyle(
        "AgrSecHead",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=primary_color,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle("AgrBody", parent=styles["Normal"], fontSize=10, leading=14, textColor=colors.HexColor("#1F2937"))
    bold_body = ParagraphStyle("AgrBoldBody", parent=styles["Normal"], fontSize=10, leading=14, fontName="Helvetica-Bold", textColor=colors.HexColor("#111827"))

    # Title section
    story.append(Paragraph("RESIDENTIAL LEASE AGREEMENT", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Agreement Ref No: <b>{agreement_no}</b>", subtitle_style))
    story.append(Spacer(1, 20))

    # Agreement overview box table
    info_data = [
        [Paragraph("<b>Landlord / Management</b>", bold_body), Paragraph("Accoumaxx Property Portal", body_style)],
        [Paragraph("<b>Tenant Name</b>", bold_body), Paragraph(tenant_name or "N/A", body_style)],
        [Paragraph("<b>Allocated Property/Bed</b>", bold_body), Paragraph(room_bed or "Not Allocated", body_style)],
        [Paragraph("<b>Agreement Status</b>", bold_body), Paragraph(status or "ACTIVE", body_style)],
        [Paragraph("<b>Start Date</b>", bold_body), Paragraph(str(start_date or "—"), body_style)],
        [Paragraph("<b>End Date</b>", bold_body), Paragraph(str(end_date or "Open-ended"), body_style)],
        [Paragraph("<b>Monthly Rent</b>", bold_body), Paragraph(f"Rs. {rent_amount:,.2f}", bold_body)],
        [Paragraph("<b>Security Deposit</b>", bold_body), Paragraph(f"Rs. {security_deposit:,.2f}", bold_body)],
    ]
    info_table = Table(info_data, colWidths=[200, 330])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_bg),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 20))

    # Terms & Conditions
    story.append(Paragraph("TERMS AND CONDITIONS", section_heading))
    story.append(Spacer(1, 8))
    terms = [
        "1. <b>Rent Payment:</b> The tenant agrees to pay monthly rent on or before the due date specified each billing cycle.",
        "2. <b>Security Deposit:</b> The security deposit is refundable upon vacancy subject to proper property inspection and clearing of pending dues.",
        "3. <b>Property Care:</b> The tenant agrees to keep the allocated bed and common property clean and damage-free.",
        "4. <b>Termination Notice:</b> Either party may terminate this agreement by providing formal written notice as per property rules.",
    ]
    for term in terms:
        story.append(Paragraph(term, body_style))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 30))

    # Signature blocks
    sig_data = [
        [Paragraph("__________________________<br/><b>Landlord / Authorized Signature</b>", body_style),
         Paragraph("__________________________<br/><b>Tenant Signature</b>", body_style)]
    ]
    sig_table = Table(sig_data, colWidths=[265, 265])
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(sig_table)

    doc.build(story)
    return str(file_path)

