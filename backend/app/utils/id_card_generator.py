import os
import io
import datetime
import qrcode
from reportlab.lib.pagesizes import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader


def generate_staff_id_card_pdf(staff_info: dict) -> bytes:
    buffer = io.BytesIO()
    
    # 54mm x 85.6mm PVC standard
    card_width = 54 * mm
    card_height = 85.6 * mm
    
    c = canvas.Canvas(buffer, pagesize=(card_width, card_height))
    
    # ----------------------------------------------------
    # DRAW PAGE 1 (FRONT SIDE)
    # ----------------------------------------------------
    c.saveState()
    
    # Card boundary clipping path for rounded corners (3mm radius)
    path = c.beginPath()
    path.roundRect(0.5, 0.5, card_width - 1, card_height - 1, 3 * mm)
    c.clipPath(path, stroke=1)
    
    # Background color
    c.setFillColor(HexColor("#F8FAFC"))  # Modern slate-tinted white
    c.rect(0, 0, card_width, card_height, fill=1, stroke=0)
    
    # Header bar
    c.setFillColor(HexColor("#1E3A8A"))  # Deep Premium Blue
    c.rect(0, 70 * mm, card_width, 15.6 * mm, fill=1, stroke=0)
    
    # Header Text
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(card_width / 2.0, 78 * mm, "ACCOUMAXX")
    
    c.setFillColor(HexColor("#93C5FD"))  # Light Accent Blue
    c.setFont("Helvetica-Bold", 5)
    c.drawCentredString(card_width / 2.0, 73 * mm, "S T A F F   I D   C A R D")
    
    # Employee Photo Position
    photo_cx = card_width / 2.0
    photo_cy = 55 * mm
    photo_r = 9.5 * mm
    
    # Circular Photo Border
    c.setStrokeColor(HexColor("#FFFFFF"))
    c.setLineWidth(1.5)
    c.circle(photo_cx, photo_cy, photo_r, fill=0, stroke=1)
    
    # Photo Image Drawing (Clipped to Circle)
    c.saveState()
    photo_clip = c.beginPath()
    photo_clip.circle(photo_cx, photo_cy, photo_r - 0.7)
    c.clipPath(photo_clip, stroke=0)
    
    photo_drawn = False
    photo_url = staff_info.get("photo_url")
    if photo_url and os.path.exists(photo_url):
        try:
            c.drawImage(photo_url, photo_cx - photo_r, photo_cy - photo_r, photo_r * 2, photo_r * 2)
            photo_drawn = True
        except Exception:
            pass
            
    if not photo_drawn:
        # Draw vector avatar placeholder silhouette
        # Avatar Background Circle
        c.setFillColor(HexColor("#E2E8F0"))
        c.circle(photo_cx, photo_cy, photo_r, fill=1, stroke=0)
        
        # Avatar Head
        c.setFillColor(HexColor("#94A3B8"))
        c.circle(photo_cx, photo_cy + photo_r * 0.15, photo_r * 0.35, fill=1, stroke=0)
        
        # Avatar Shoulders
        c.circle(photo_cx, photo_cy - photo_r * 0.8, photo_r * 0.7, fill=1, stroke=0)
        
    c.restoreState()
    
    # Employee Name
    c.setFillColor(HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawCentredString(card_width / 2.0, 42.5 * mm, staff_info.get("full_name", "").upper())
    
    # Employee ID Badge Background
    badge_w = 22 * mm
    badge_h = 3.5 * mm
    badge_x = (card_width - badge_w) / 2.0
    badge_y = 37 * mm
    c.setFillColor(HexColor("#EFF6FF"))
    c.setStrokeColor(HexColor("#BFDBFE"))
    c.setLineWidth(0.5)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 1 * mm, fill=1, stroke=1)
    
    # Employee ID Text
    c.setFillColor(HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 5.5)
    c.drawCentredString(card_width / 2.0, badge_y + 1 * mm, staff_info.get("employee_id", ""))
    
    # Key-Value Details Layout
    start_y = 31 * mm
    dy = 3.2 * mm
    
    details = [
        ("Designation", staff_info.get("designation", "—")),
        ("Department", staff_info.get("department", "—")),
        ("Property", staff_info.get("property", "—")),
        ("Phone", staff_info.get("phone_number", "—")),
        ("Blood Group", staff_info.get("blood_group", "N/A")),
    ]
    
    c.setFont("Helvetica", 4.8)
    for idx, (label, val) in enumerate(details):
        curr_y = start_y - (idx * dy)
        c.setFillColor(HexColor("#475569"))
        c.drawString(4 * mm, curr_y, label)
        c.drawString(17 * mm, curr_y, ":")
        
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 4.8)
        
        # Max length clipping to prevent overflow
        val_str = str(val)
        if len(val_str) > 22:
            val_str = val_str[:19] + "..."
        c.drawString(18.5 * mm, curr_y, val_str)
        c.setFont("Helvetica", 4.8)
        
    # QR Code bottom-right
    qr_w = 12 * mm
    qr_h = 12 * mm
    qr_x = 38 * mm
    qr_y = 2.5 * mm
    
    qr_data = (
        f"ID: {staff_info.get('employee_id', '')}\n"
        f"Name: {staff_info.get('full_name', '')}\n"
        f"Designation: {staff_info.get('designation', '')}\n"
        f"Property: {staff_info.get('property', '')}\n"
        f"Verify: {staff_info.get('verification_url', '')}"
    )
    
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#1E3A8A", back_color="white")
    
    qr_byte_arr = io.BytesIO()
    qr_img.save(qr_byte_arr, format='PNG')
    qr_byte_arr.seek(0)
    
    qr_reader = ImageReader(qr_byte_arr)
    c.drawImage(qr_reader, qr_x, qr_y, qr_w, qr_h)
    
    # Dates bottom-left
    c.setFillColor(HexColor("#64748B"))
    c.setFont("Helvetica", 4.2)
    issue_date = staff_info.get("issue_date", "")
    valid_till = staff_info.get("valid_till", "")
    c.drawString(4 * mm, 7.5 * mm, f"Issued: {issue_date}")
    c.drawString(4 * mm, 4 * mm, f"Expires: {valid_till}")
    
    c.restoreState()
    c.showPage()
    
    # ----------------------------------------------------
    # DRAW PAGE 2 (BACK SIDE)
    # ----------------------------------------------------
    c.saveState()
    back_path = c.beginPath()
    back_path.roundRect(0.5, 0.5, card_width - 1, card_height - 1, 3 * mm)
    c.clipPath(back_path, stroke=1)
    
    # Background color
    c.setFillColor(HexColor("#F1F5F9"))
    c.rect(0, 0, card_width, card_height, fill=1, stroke=0)
    
    # Top header bar
    c.setFillColor(HexColor("#1E3A8A"))
    c.rect(0, 75 * mm, card_width, 10.6 * mm, fill=1, stroke=0)
    
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawCentredString(card_width / 2.0, 79.5 * mm, "INSTRUCTIONS")
    
    # Instructions lines
    terms_y = 66 * mm
    terms_dy = 3.5 * mm
    terms_lines = [
        "This card is the property of Accoumaxx.",
        "It must be worn at all times while on duty.",
        "If found, please return to the office address below.",
        "Loss of this card must be reported immediately."
    ]
    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica", 4.2)
    for idx, line in enumerate(terms_lines):
        c.drawCentredString(card_width / 2.0, terms_y - (idx * terms_dy), line)
        
    # Divider line
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(4 * mm, 48 * mm, card_width - 4 * mm, 48 * mm)
    
    # Company Office address details
    c.setFillColor(HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 5.5)
    c.drawString(4 * mm, 43 * mm, "ACCOUMAXX PROPERTY PORTAL")
    
    c.setFont("Helvetica", 4.5)
    c.drawString(4 * mm, 38.5 * mm, "Office: Suite 402, Business Tower, Mumbai, India")
    c.drawString(4 * mm, 34 * mm, "Email: support@accoumaxx.com")
    c.drawString(4 * mm, 29.5 * mm, "Web: www.accoumaxx.com")
    
    # Divider line
    c.line(4 * mm, 25 * mm, card_width - 4 * mm, 25 * mm)
    
    # Emergency Contact section
    c.setFillColor(HexColor("#DC2626"))  # Accent Emergency Red
    c.setFont("Helvetica-Bold", 5.5)
    c.drawString(4 * mm, 20 * mm, "EMERGENCY CONTACT:")
    c.setFillColor(HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 6)
    c.drawString(29 * mm, 20 * mm, "+91 98765 43210")
    
    # Scan verification instruction
    c.setFillColor(HexColor("#64748B"))
    c.setFont("Helvetica-BoldOblique", 4.8)
    c.drawCentredString(card_width / 2.0, 10 * mm, "Scan QR Code on Front to Verify Identity")
    
    # Bottom footer card number
    card_num = staff_info.get("id_card_number", "IDC-UNKNOWN")
    c.setFont("Helvetica", 4.2)
    c.drawCentredString(card_width / 2.0, 5 * mm, f"ID Card No: {card_num}")
    
    c.restoreState()
    c.showPage()
    
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
