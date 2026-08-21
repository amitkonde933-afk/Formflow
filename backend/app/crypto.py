from cryptography.fernet import Fernet
from app.config import Config

class Crypto:
    _fernet = None

    @classmethod
    def get_fernet(cls):
        if cls._fernet is None:
            # Key should be a 32-byte url-safe base64 key
            # Ensure it is properly encoded
            key = Config.ENCRYPTION_KEY.encode()
            cls._fernet = Fernet(key)
        return cls._fernet

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        if plaintext is None:
            return None
        if not isinstance(plaintext, str):
            plaintext = str(plaintext)
        if plaintext == "":
            return ""
        f = cls.get_fernet()
        return f.encrypt(plaintext.encode()).decode()

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        if ciphertext is None:
            return None
        if ciphertext == "":
            return ""
        f = cls.get_fernet()
        try:
            return f.decrypt(ciphertext.encode()).decode()
        except Exception:
            # If decryption fails (e.g. key mismatch or plaintext in DB), return original as fallback
            return ciphertext
