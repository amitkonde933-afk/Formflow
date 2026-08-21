import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

class Config:
    # LLM Settings
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Choose provider: gemini, openai, or mock (for demo/testing)
    LLM_PROVIDER = os.getenv("LLM_PROVIDER")
    if not LLM_PROVIDER:
        if GEMINI_API_KEY:
            LLM_PROVIDER = "gemini"
        elif OPENAI_API_KEY:
            LLM_PROVIDER = "openai"
        else:
            LLM_PROVIDER = "mock"

    # Fernet Encryption Key
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
    if not ENCRYPTION_KEY:
        ENCRYPTION_KEY = Fernet.generate_key().decode()
        os.environ["ENCRYPTION_KEY"] = ENCRYPTION_KEY
        
        # Try to write it to .env in the backend folder
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_path = os.path.join(backend_dir, ".env")
        try:
            with open(env_path, "a") as f:
                f.write(f"\nENCRYPTION_KEY={ENCRYPTION_KEY}\n")
        except Exception:
            pass

    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
