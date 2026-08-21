import sqlite3
import os
from app.crypto import Crypto

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "formflow.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY,
            full_name TEXT,
            dob TEXT,
            gender TEXT,
            email TEXT,
            phone TEXT,
            college TEXT,
            course TEXT,
            roll_number TEXT,
            semester TEXT,
            cgpa TEXT,
            address TEXT,
            parent_name TEXT,
            parent_occupation TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Set of fields requiring encryption before database write
ENCRYPTED_FIELDS = {"dob", "phone", "address", "parent_name", "parent_occupation"}

def save_profile(profile_data: dict):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM profiles WHERE id = 1")
    exists = cursor.fetchone()
    
    db_data = {}
    all_fields = [
        "full_name", "dob", "gender", "email", "phone", 
        "college", "course", "roll_number", "semester", "cgpa", 
        "address", "parent_name", "parent_occupation"
    ]
    
    for field in all_fields:
        val = profile_data.get(field, "")
        if field in ENCRYPTED_FIELDS:
            db_data[field] = Crypto.encrypt(val)
        else:
            db_data[field] = val
            
    if exists:
        update_query = ", ".join([f"{field} = ?" for field in all_fields])
        update_query += ", updated_at = CURRENT_TIMESTAMP"
        values = [db_data[field] for field in all_fields]
        cursor.execute(f"UPDATE profiles SET {update_query} WHERE id = 1", values)
    else:
        columns = ", ".join(all_fields)
        placeholders = ", ".join(["?"] * len(all_fields))
        values = [db_data[field] for field in all_fields]
        cursor.execute(f"INSERT INTO profiles (id, {columns}) VALUES (1, {placeholders})", values)
        
    conn.commit()
    conn.close()

def get_profile():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM profiles WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    profile = dict(row)
    # Decrypt encrypted fields for application usage
    for field in ENCRYPTED_FIELDS:
        if field in profile:
            profile[field] = Crypto.decrypt(profile[field])
            
    return profile

def delete_profile():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM profiles WHERE id = 1")
    conn.commit()
    conn.close()
