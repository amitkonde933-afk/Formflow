import os
import io
import pdfplumber
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# Layout coordinates for the 18 fields in the sample PDF
# coordinates map to standard Letter size (612 x 792 points)
FIELD_COORDINATES = {
    "Full Name": {"x": 140, "y": 680, "w": 400, "page": 0},
    "Date of Birth": {"x": 140, "y": 640, "w": 140, "page": 0},
    "Gender": {"x": 380, "y": 640, "w": 160, "page": 0},
    "Email Address": {"x": 140, "y": 600, "w": 400, "page": 0},
    "Mobile Number": {"x": 140, "y": 560, "w": 140, "page": 0},
    "Permanent Address": {"x": 140, "y": 520, "w": 400, "page": 0},
    "College Name": {"x": 140, "y": 480, "w": 400, "page": 0},
    "Course Name": {"x": 140, "y": 440, "w": 140, "page": 0},
    "Roll Number/ID": {"x": 380, "y": 440, "w": 160, "page": 0},
    "Current Semester": {"x": 140, "y": 400, "w": 140, "page": 0},
    "CGPA / GPA": {"x": 380, "y": 400, "w": 160, "page": 0},
    "Parent/Guardian Name": {"x": 190, "y": 360, "w": 350, "page": 0},
    "Parent/Guardian Occupation": {"x": 190, "y": 320, "w": 350, "page": 0},
    "Family Annual Income": {"x": 190, "y": 280, "w": 350, "page": 0},
    "Bank Account Number": {"x": 190, "y": 240, "w": 350, "page": 0},
    "Bank Name": {"x": 140, "y": 200, "w": 140, "page": 0},
    "IFSC Code": {"x": 380, "y": 200, "w": 160, "page": 0},
    "Signature Date": {"x": 140, "y": 140, "w": 140, "page": 0}
}

class PDFHandler:
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Extracts text from a digital PDF using pdfplumber."""
        extracted_text = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text.append(text)
            return "\n".join(extracted_text)
        except Exception as e:
            print(f"Error during text extraction: {e}")
            return ""

    @staticmethod
    def generate_demo_template(output_path: str):
        """Generates a standard 18-field scholarship form template PDF."""
        c = canvas.Canvas(output_path, pagesize=letter)
        
        # Draw Header
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(306, 750, "SCHOLARSHIP APPLICATION FORM")
        
        c.setFont("Helvetica", 10)
        c.setFillColorRGB(0.3, 0.3, 0.3)
        c.drawCentredString(306, 730, "FormFlow Demo Application — Fill Once, Use Everywhere")
        
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(1)
        c.line(50, 715, 562, 715)
        
        # Setup form text properties
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 10)
        
        labels = [
            ("Full Name:", 50, 680),
            ("Date of Birth:", 50, 640),
            ("Gender:", 310, 640),
            ("Email Address:", 50, 600),
            ("Mobile Number:", 50, 560),
            ("Permanent Address:", 50, 520),
            ("College Name:", 50, 480),
            ("Course Name:", 50, 440),
            ("Roll Number/ID:", 290, 440),
            ("Current Semester:", 50, 400),
            ("CGPA / GPA:", 310, 400),
            ("Parent/Guardian Name:", 50, 360),
            ("Parent/Guardian Occupation:", 50, 320),
            ("Family Annual Income:", 50, 280),
            ("Bank Account Number:", 50, 240),
            ("Bank Name:", 50, 200),
            ("IFSC Code:", 310, 200),
            ("Signature Date:", 50, 140),
            ("Applicant Signature:", 290, 140)
        ]
        
        # Draw labels
        for label_text, x_pos, y_pos in labels:
            c.drawString(x_pos, y_pos, label_text)
            
        # Draw lines for the fields
        for field_name, coords in FIELD_COORDINATES.items():
            x, y, w = coords["x"], coords["y"], coords["w"]
            c.line(x, y - 2, x + w, y - 2)
            
        # Draw signature line specifically (since it's not a filled field but visual)
        c.line(390, 138, 540, 138)
        
        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(306, 50, "Disclaimer: This is a sample form generated for testing FormFlow.")
        
        c.showPage()
        c.save()

    @staticmethod
    def fill_pdf(template_path: str, field_values: dict) -> io.BytesIO:
        """
        Takes an existing PDF template and a dictionary of {field_label: value},
        renders an overlay PDF, merges them, and returns a BytesIO object.
        """
        # Create an in-memory PDF overlay
        overlay_buffer = io.BytesIO()
        c = canvas.Canvas(overlay_buffer, pagesize=letter)
        
        c.setFont("Helvetica-Bold", 10)
        c.setFillColorRGB(0.0, 0.2, 0.6) # Sleek blue text for filled values
        
        # Draw filled values at coordinate mappings
        for field_name, val in field_values.items():
            if field_name in FIELD_COORDINATES:
                coords = FIELD_COORDINATES[field_name]
                x, y = coords["x"], coords["y"]
                # Render text slightly above the baseline line
                c.drawString(x + 4, y + 2, str(val))
                
        c.showPage()
        c.save()
        overlay_buffer.seek(0)
        
        # Load template and overlay, and merge them
        template_pdf = PdfReader(template_path)
        overlay_pdf = PdfReader(overlay_buffer)
        
        output_pdf = PdfWriter()
        
        # Merge page 0
        template_page = template_pdf.pages[0]
        overlay_page = overlay_pdf.pages[0]
        template_page.merge_page(overlay_page)
        
        output_pdf.add_page(template_page)
        
        # Save output to bytes
        filled_pdf_buffer = io.BytesIO()
        output_pdf.write(filled_pdf_buffer)
        filled_pdf_buffer.seek(0)
        
        return filled_pdf_buffer
