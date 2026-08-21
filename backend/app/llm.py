import json
import httpx
from app.config import Config

# Mock definitions for testing and fallback
MOCK_FIELDS = [
    {"label": "Full Name", "type": "text", "required": True},
    {"label": "Date of Birth", "type": "date", "required": True},
    {"label": "Gender", "type": "text", "required": True},
    {"label": "Email Address", "type": "email", "required": True},
    {"label": "Mobile Number", "type": "text", "required": True},
    {"label": "Permanent Address", "type": "text", "required": True},
    {"label": "College Name", "type": "text", "required": True},
    {"label": "Course Name", "type": "text", "required": True},
    {"label": "Roll Number/ID", "type": "text", "required": True},
    {"label": "Current Semester", "type": "text", "required": True},
    {"label": "CGPA / GPA", "type": "text", "required": True},
    {"label": "Parent/Guardian Name", "type": "text", "required": True},
    {"label": "Parent/Guardian Occupation", "type": "text", "required": True},
    {"label": "Family Annual Income", "type": "text", "required": True},
    {"label": "Bank Account Number", "type": "text", "required": True},
    {"label": "Bank Name", "type": "text", "required": True},
    {"label": "IFSC Code", "type": "text", "required": True},
    {"label": "Signature Date", "type": "date", "required": True}
]

MOCK_MATCHES = {
    "Full Name": {"matched_field": "full_name", "confidence": 0.98},
    "Date of Birth": {"matched_field": "dob", "confidence": 0.96},
    "Gender": {"matched_field": "gender", "confidence": 0.94},
    "Email Address": {"matched_field": "email", "confidence": 0.98},
    "Mobile Number": {"matched_field": "phone", "confidence": 0.95},
    "Permanent Address": {"matched_field": "address", "confidence": 0.92},
    "College Name": {"matched_field": "college", "confidence": 0.95},
    "Course Name": {"matched_field": "course", "confidence": 0.94},
    "Roll Number/ID": {"matched_field": "roll_number", "confidence": 0.92},
    "Current Semester": {"matched_field": "semester", "confidence": 0.91},
    "CGPA / GPA": {"matched_field": "cgpa", "confidence": 0.90},
    # Sensitive field, confidence high but will be review-flagged due to sensitive config
    "Parent/Guardian Name": {"matched_field": "parent_name", "confidence": 0.88},
    "Parent/Guardian Occupation": {"matched_field": "parent_occupation", "confidence": 0.87},
    # No profile field maps to these (missing fields)
    "Family Annual Income": {"matched_field": None, "confidence": 0.0},
    "Bank Account Number": {"matched_field": None, "confidence": 0.0},
    "Bank Name": {"matched_field": None, "confidence": 0.0},
    "IFSC Code": {"matched_field": None, "confidence": 0.0},
    "Signature Date": {"matched_field": None, "confidence": 0.0}
}

MOCK_EXPLANATIONS = {
    "Full Name": "Your full legal name as it appears on official documents.",
    "Date of Birth": "Your birth date, used for age verification.",
    "Gender": "Your gender identification.",
    "Email Address": "A valid email address where you can receive communications.",
    "Mobile Number": "Your primary 10-digit mobile contact number.",
    "Permanent Address": "The residential address where you reside permanently.",
    "College Name": "The official name of the college or university you are attending.",
    "Course Name": "The program of study or degree you are pursuing (e.g. B.Tech Computer Science).",
    "Roll Number/ID": "Your unique student identifier or registration number issued by the college.",
    "Current Semester": "The semester you are currently enrolled in (e.g. 5th Semester).",
    "CGPA / GPA": "Your Cumulative Grade Point Average or overall score.",
    "Parent/Guardian Name": "The full name of your mother, father, or legal guardian.",
    "Parent/Guardian Occupation": "The profession or current work of your parent/guardian.",
    "Family Annual Income": "The total combined yearly earnings of all members of your household.",
    "Bank Account Number": "Your bank account identifier where scholarship funds will be direct-deposited.",
    "Bank Name": "The name of the banking institution where your account is held.",
    "IFSC Code": "The 11-digit alphanumeric code identifying your specific bank branch for money transfers.",
    "Signature Date": "The date on which you confirm and sign this application."
}

class LLMClient:
    @staticmethod
    def _call_gemini(prompt: str, json_mode: bool = False) -> str:
        headers = {"Content-Type": "application/json"}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={Config.GEMINI_API_KEY}"
        
        contents = {"parts": [{"text": prompt}]}
        data = {"contents": [contents]}
        
        if json_mode:
            data["generationConfig"] = {"responseMimeType": "application/json"}
            
        try:
            response = httpx.post(url, headers=headers, json=data, timeout=30.0)
            response.raise_for_status()
            res_json = response.json()
            # Extract text content
            text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            return text
        except Exception as e:
            # Fallback or log error
            print(f"Gemini API call failed: {e}")
            raise

    @staticmethod
    def _call_openai(prompt: str, json_mode: bool = False) -> str:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {Config.OPENAI_API_KEY}"
        }
        url = "https://api.openai.com/v1/chat/completions"
        
        data = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}]
        }
        
        if json_mode:
            data["response_format"] = {"type": "json_object"}
            
        try:
            response = httpx.post(url, headers=headers, json=data, timeout=30.0)
            response.raise_for_status()
            res_json = response.json()
            text = res_json["choices"][0]["message"]["content"]
            return text
        except Exception as e:
            print(f"OpenAI API call failed: {e}")
            raise

    @classmethod
    def call_llm(cls, prompt: str, json_mode: bool = False) -> str:
        if Config.LLM_PROVIDER == "gemini" and Config.GEMINI_API_KEY:
            return cls._call_gemini(prompt, json_mode)
        elif Config.LLM_PROVIDER == "openai" and Config.OPENAI_API_KEY:
            return cls._call_openai(prompt, json_mode)
        else:
            # Fallback mode
            raise ValueError("No active LLM provider configured.")

    @classmethod
    def extract_fields(cls, pdf_text: str) -> list[dict]:
        # Check if we are in mock mode or PDF text is empty/simple
        if Config.LLM_PROVIDER == "mock" or not pdf_text:
            return MOCK_FIELDS
            
        prompt = (
            "You are a form field extraction assistant. Your task is to analyze the text extracted from a form "
            "and output a JSON array listing every field that needs to be filled. "
            "Each field in the JSON array MUST have the exact structure:\n"
            "{\n"
            "  \"label\": \"<Field Name/Label as written on the form, e.g. Applicant Name or Phone>\",\n"
            "  \"type\": \"<one of: text, date, email, number>\",\n"
            "  \"required\": <true or false>\n"
            "}\n\n"
            f"Here is the text extracted from the PDF:\n--- START TEXT ---\n{pdf_text}\n--- END TEXT ---\n"
            "Return only the valid JSON array of fields. Do not include markdown code fence syntax like ```json."
        )
        
        try:
            res_text = cls.call_llm(prompt, json_mode=True)
            # Remove possible markdown fences if returned
            res_text = res_text.strip()
            if res_text.startswith("```json"):
                res_text = res_text[7:]
            if res_text.endswith("```"):
                res_text = res_text[:-3]
            res_text = res_text.strip()
            
            return json.loads(res_text)
        except Exception as e:
            print(f"Failed to extract fields via LLM, falling back to mock: {e}")
            return MOCK_FIELDS

    @classmethod
    def match_fields(cls, fields: list[dict], profile_keys: list[str]) -> list[dict]:
        if Config.LLM_PROVIDER == "mock":
            results = []
            for field in fields:
                label = field["label"]
                match_info = MOCK_MATCHES.get(label, {"matched_field": None, "confidence": 0.0})
                results.append({
                    "label": label,
                    "type": field["type"],
                    "required": field["required"],
                    "matched_field": match_info["matched_field"],
                    "confidence": match_info["confidence"]
                })
            return results

        # Construct batch matching prompt
        prompt = (
            "You are an AI that performs semantic mapping between form labels and user profile field keys. "
            "You will be given a list of form labels and a list of available profile field keys.\n"
            f"Profile Field Keys: {profile_keys}\n\n"
            "For each form field, find the closest matching profile field key. "
            "If no profile field key is a semantic match, return null. "
            "Assign a confidence score between 0.0 and 1.0 (where 1.0 is a perfect match, and <0.5 means a weak match).\n\n"
            "Format your response as a JSON array of objects with the keys 'label', 'matched_field', and 'confidence'. "
            "Example format:\n"
            "[\n"
            "  {\"label\": \"Candidate Name\", \"matched_field\": \"full_name\", \"confidence\": 0.98},\n"
            "  {\"label\": \"Salary\", \"matched_field\": null, \"confidence\": 0.0}\n"
            "]\n\n"
            f"Here are the form fields to match: {json.dumps(fields)}\n"
            "Return only the valid JSON array."
        )

        try:
            res_text = cls.call_llm(prompt, json_mode=True)
            res_text = res_text.strip()
            if res_text.startswith("```json"):
                res_text = res_text[7:]
            if res_text.endswith("```"):
                res_text = res_text[:-3]
            res_text = res_text.strip()
            
            matches = json.loads(res_text)
            
            # Combine original field details with matching results
            match_map = {m["label"]: m for m in matches}
            
            results = []
            for field in fields:
                lbl = field["label"]
                m_info = match_map.get(lbl, {"matched_field": None, "confidence": 0.0})
                results.append({
                    "label": lbl,
                    "type": field["type"],
                    "required": field["required"],
                    "matched_field": m_info.get("matched_field"),
                    "confidence": m_info.get("confidence", 0.0)
                })
            return results
        except Exception as e:
            print(f"Failed to match fields via LLM, falling back to mock: {e}")
            # Fallback to mock logic
            results = []
            for field in fields:
                label = field["label"]
                match_info = MOCK_MATCHES.get(label, {"matched_field": None, "confidence": 0.0})
                results.append({
                    "label": label,
                    "type": field["type"],
                    "required": field["required"],
                    "matched_field": match_info["matched_field"],
                    "confidence": match_info["confidence"]
                })
            return results

    @classmethod
    def explain_field(cls, label: str) -> str:
        if Config.LLM_PROVIDER == "mock":
            return MOCK_EXPLANATIONS.get(label, f"The value for '{label}' field requested by the form.")

        prompt = (
            f"Explain what the form field label '{label}' means in plain, simple English. "
            "Respond with a single, clear, supportive sentence. Do not mention jargon."
        )
        try:
            explanation = cls.call_llm(prompt)
            return explanation.strip()
        except Exception as e:
            print(f"Failed to get explanation via LLM, falling back to mock: {e}")
            return MOCK_EXPLANATIONS.get(label, f"The value for '{label}' field requested by the form.")
