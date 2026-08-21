from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class ProfileSchema(BaseModel):
    full_name: str = ""
    dob: str = ""
    gender: str = ""
    email: str = ""
    phone: str = ""
    college: str = ""
    course: str = ""
    roll_number: str = ""
    semester: str = ""
    cgpa: str = ""
    address: str = ""
    parent_name: str = ""
    parent_occupation: str = ""

class ExplainRequest(BaseModel):
    label: str

class FillRequest(BaseModel):
    file_name: str
    field_values: dict
