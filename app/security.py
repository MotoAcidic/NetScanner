"""Security utilities for credential encryption"""
from cryptography.fernet import Fernet
from pathlib import Path
import os
import json

KEY_FILE = Path.home() / '.netscanner' / 'encryption.key'

def get_or_create_key():
    """Get or create encryption key"""
    KEY_FILE.parent.mkdir(exist_ok=True)
    if KEY_FILE.exists():
        with open(KEY_FILE, 'rb') as f:
            return f.read()
    else:
        key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as f:
            f.write(key)
        os.chmod(KEY_FILE, 0o600)  # Read/write for owner only
        return key

def encrypt_credentials(username, password):
    """Encrypt username and password"""
    key = get_or_create_key()
    f = Fernet(key)
    credentials = json.dumps({'username': username, 'password': password})
    encrypted = f.encrypt(credentials.encode())
    return encrypted.decode()

def decrypt_credentials(encrypted_str):
    """Decrypt username and password"""
    key = get_or_create_key()
    f = Fernet(key)
    try:
        decrypted = f.decrypt(encrypted_str.encode())
        return json.loads(decrypted.decode())
    except Exception as e:
        print(f"Decryption error: {e}")
        return None
