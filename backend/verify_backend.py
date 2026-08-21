import os
import sys
import sqlite3

# Adjust paths to import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.crypto import Crypto
from app.database import save_profile, get_profile, delete_profile, init_db, DB_PATH
from app.pdf_handler import PDFHandler

def verify():
    print("=== Starting FormFlow Backend Verification ===")
    
    # 1. Test database initialization
    print("\n[Step 1] Initializing SQLite database...")
    init_db()
    if os.path.exists(DB_PATH):
        print(f"  Success: Database file created at {DB_PATH}")
    else:
        print("  Error: Database file was not created!")
        sys.exit(1)

    # 2. Test Encryption & Plaintext difference in SQLite
    print("\n[Step 2] Testing application-layer encryption...")
    test_profile = {
        "full_name": "Amit Konde",
        "dob": "12/08/2004",
        "gender": "Male",
        "email": "amit.konde@example.com",
        "phone": "9876543210",
        "college": "State Technical University",
        "course": "Computer Engineering",
        "roll_number": "CS-2022-045",
        "semester": "5th Semester",
        "cgpa": "9.12",
        "address": "402 Royal Residency, Park Street, Pune",
        "parent_name": "Satish Konde",
        "parent_occupation": "Software Architect"
    }
    
    print("  Saving profile...")
    save_profile(test_profile)
    
    # Read directly from SQLite bypass database decryption layer
    print("  Inspecting raw DB records for encryption verification...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT dob, phone, address, full_name, email FROM profiles WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        print("  Error: No profile records found in DB!")
        sys.exit(1)
        
    raw_dob, raw_phone, raw_address, raw_name, raw_email = row
    
    print(f"  Raw Full Name (Plaintext): {raw_name}")
    print(f"  Raw Email (Plaintext): {raw_email}")
    print(f"  Raw DOB (Encrypted ciphertext): {raw_dob[:30]}...")
    print(f"  Raw Phone (Encrypted ciphertext): {raw_phone[:30]}...")
    print(f"  Raw Address (Encrypted ciphertext): {raw_address[:30]}...")
    
    # Check assertions
    assert raw_name == test_profile["full_name"], "Full Name should be stored in plaintext"
    assert raw_email == test_profile["email"], "Email should be stored in plaintext"
    assert raw_dob != test_profile["dob"], "DOB must be encrypted!"
    assert raw_phone != test_profile["phone"], "Phone must be encrypted!"
    assert raw_address != test_profile["address"], "Address must be encrypted!"
    print("  Success: Verified that sensitive fields are stored encrypted, and non-sensitive fields are stored in plaintext!")

    # 3. Test profile decryption retrieval
    print("\n[Step 3] Testing decryption during retrieve...")
    loaded_profile = get_profile()
    if not loaded_profile:
        print("  Error: Loaded profile returned None")
        sys.exit(1)
        
    print(f"  Loaded Full Name: {loaded_profile['full_name']}")
    print(f"  Loaded Decrypted DOB: {loaded_profile['dob']}")
    print(f"  Loaded Decrypted Phone: {loaded_profile['phone']}")
    print(f"  Loaded Decrypted Address: {loaded_profile['address']}")
    
    assert loaded_profile["dob"] == test_profile["dob"], "Decrypted DOB mismatch!"
    assert loaded_profile["phone"] == test_profile["phone"], "Decrypted Phone mismatch!"
    assert loaded_profile["address"] == test_profile["address"], "Decrypted Address mismatch!"
    print("  Success: Retrieval decrypted all sensitive values perfectly back to their original states!")

    # 4. Test Demo PDF template generation
    print("\n[Step 4] Testing PDF Form template generation...")
    demo_pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "test_scholarship_form.pdf")
    os.makedirs(os.path.dirname(demo_pdf_path), exist_ok=True)
    
    PDFHandler.generate_demo_template(demo_pdf_path)
    if os.path.exists(demo_pdf_path) and os.path.getsize(demo_pdf_path) > 0:
        print(f"  Success: Demo PDF Form created successfully at {demo_pdf_path} ({os.path.getsize(demo_pdf_path)} bytes)")
    else:
        print("  Error: PDF Form template was not generated!")
        sys.exit(1)
        
    # 5. Test text extraction
    print("\n[Step 5] Testing text extraction from generated template...")
    extracted_text = PDFHandler.extract_text(demo_pdf_path)
    if "SCHOLARSHIP APPLICATION FORM" in extracted_text:
        print("  Success: Text successfully extracted from the digital PDF template!")
    else:
        print("  Error: Text extraction returned incomplete or wrong data!")
        print(f"  Extracted sample: {extracted_text[:100]}...")
        sys.exit(1)

    # 6. Test PDF Coordinate Form Filling
    print("\n[Step 6] Testing PDF Form filling overlay generation...")
    fill_data = {
        "Full Name": "Amit Konde",
        "Date of Birth": "12/08/2004",
        "Gender": "Male",
        "Email Address": "amit.konde@example.com",
        "Mobile Number": "9876543210",
        "Permanent Address": "402 Royal Residency, Park Street, Pune",
        "College Name": "State Technical University",
        "Course Name": "Computer Engineering",
        "Roll Number/ID": "CS-2022-045",
        "Current Semester": "5th Semester",
        "CGPA / GPA": "9.12",
        "Parent/Guardian Name": "Satish Konde",
        "Parent/Guardian Occupation": "Software Architect",
        "Family Annual Income": "INR 8,50,000",
        "Bank Account Number": "501002345678",
        "Bank Name": "National Student Bank",
        "IFSC Code": "NSB0001234",
        "Signature Date": "21/08/2026"
    }
    
    filled_pdf_io = PDFHandler.fill_pdf(demo_pdf_path, fill_data)
    filled_bytes = filled_pdf_io.read()
    if len(filled_bytes) > 0:
        print(f"  Success: Merged PDF overlay generated successfully! Size: {len(filled_bytes)} bytes")
    else:
        print("  Error: Filled PDF generation failed!")
        sys.exit(1)

    # 7. Clean up test files
    print("\n[Step 7] Cleaning up verification files...")
    if os.path.exists(demo_pdf_path):
        os.remove(demo_pdf_path)
    print("  Success: Cleanup completed.")

    print("\n=== Backend Verification COMPLETE & SUCCESSFUL! ===")

if __name__ == "__main__":
    verify()
