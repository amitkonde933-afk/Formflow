import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from app.config import Config
from app.database import save_profile, get_profile, delete_profile, init_db
from app.schemas import ProfileSchema, ExplainRequest, FillRequest
from app.llm import LLMClient
from app.pdf_handler import PDFHandler

app = FastAPI(title="FormFlow Backend API", version="1.0.0")

# Enable CORS for Next.js frontend (default port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon ease, restrict to localhost:3000 if strict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "llm_provider": Config.LLM_PROVIDER}

# Profile Routes
@app.get("/api/profile")
def read_profile():
    profile = get_profile()
    if not profile:
        return {}
    return profile

@app.post("/api/profile")
def update_profile(profile: ProfileSchema):
    try:
        save_profile(profile.dict())
        return {"status": "success", "message": "Profile saved successfully"}
    except Exception as e:
        # Avoid logging PII inside backend errors, log generic messages
        print(f"Error saving profile: Database write failed")
        raise HTTPException(status_code=500, detail="Failed to save profile. Database error occurred.")

@app.delete("/api/profile")
def clear_profile():
    try:
        delete_profile()
        return {"status": "success", "message": "Profile permanently deleted"}
    except Exception as e:
        print(f"Error deleting profile")
        raise HTTPException(status_code=500, detail="Failed to delete profile.")

# PDF Form Processing Routes
def is_sensitive_field(label: str) -> bool:
    """Helper to detect sensitive fields based on label text."""
    lbl = label.lower()
    sensitive_keywords = [
        "parent", "guardian", "income", "bank", "account", "ifsc", "salary", 
        "dob", "birth", "phone", "mobile", "address", "signature", "pan", "aadhaar", "ssn"
    ]
    return any(k in lbl for k in keywords for keywords in [[k]] if k in lbl) or any(k in lbl for k in sensitive_keywords)

@app.post("/api/upload")
async def upload_pdf_form(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Generate unique filename for tracking session upload
    file_id = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(Config.UPLOAD_DIR, file_id)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract text from digital PDF
        extracted_text = PDFHandler.extract_text(temp_path)
        
        # Call LLM to detect fields in form
        detected_fields = LLMClient.extract_fields(extracted_text)
        
        # Load user profile for matching
        profile = get_profile() or {}
        profile_keys = list(profile.keys())
        
        # Call LLM to perform semantic matching
        matched_results = LLMClient.match_fields(detected_fields, profile_keys)
        
        # Final enrichment: inject suggested values, confidence scores, and sensitive flags
        enriched_fields = []
        for field in matched_results:
            label = field["label"]
            matched_key = field["matched_field"]
            confidence = field["confidence"]
            
            # Retrieve value from profile if matched
            suggested_value = ""
            if matched_key and matched_key in profile:
                suggested_value = profile[matched_key]
                
            sensitive = is_sensitive_field(label)
            
            # Review required if low confidence or sensitive
            review_required = (confidence < 0.85) or sensitive
            
            enriched_fields.append({
                "label": label,
                "type": field["type"],
                "required": field["required"],
                "matched_field": matched_key,
                "confidence": confidence,
                "suggested_value": suggested_value,
                "is_sensitive": sensitive,
                "review_required": review_required
            })
            
        return {
            "file_name": file_id,
            "fields": enriched_fields
        }
        
    except Exception as e:
        print(f"Error processing form upload: Exception caught")
        # Ensure cleanup if error occurred before returning
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to process form. {str(e)}")

@app.post("/api/explain")
def explain_form_field(request: ExplainRequest):
    try:
        explanation = LLMClient.explain_field(request.label)
        return {"label": request.label, "explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get field explanation.")

@app.post("/api/fill")
def fill_and_generate_form(request: FillRequest, background_tasks: BackgroundTasks):
    temp_path = os.path.join(Config.UPLOAD_DIR, request.file_name)
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail="Uploaded form template expired or not found.")
        
    try:
        # Fill PDF coordinate overlay
        filled_pdf_io = PDFHandler.fill_pdf(temp_path, request.field_values)
        
        # Retention policy: auto-delete source file on background task once processed
        background_tasks.add_task(os.remove, temp_path)
        
        return StreamingResponse(
            filled_pdf_io,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=formflow_completed.pdf"}
        )
    except Exception as e:
        print(f"Error generating filled form: PDF merge error")
        raise HTTPException(status_code=500, detail=f"Failed to generate filled PDF: {str(e)}")

@app.get("/api/demo-pdf")
def download_demo_template():
    demo_path = os.path.join(Config.UPLOAD_DIR, "scholarship_application_form_template.pdf")
    # Generate on-the-fly if not present
    if not os.path.exists(demo_path):
        try:
            PDFHandler.generate_demo_template(demo_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate demo template: {str(e)}")
            
    return FileResponse(
        demo_path, 
        media_type="application/pdf", 
        filename="scholarship_application_form_template.pdf"
    )
