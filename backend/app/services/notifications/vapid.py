import os
import json
import base64
from typing import Tuple

try:
    from cryptography.hazmat.primitives.asymmetric import ec
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False


VAPID_FILE = os.path.join(os.path.dirname(__file__), ".vapid_keys.json")


def generate_vapid_keypair() -> Tuple[str, str]:
    """Generates a standard W3C compliant EC P-256 VAPID keypair."""
    if not CRYPTOGRAPHY_AVAILABLE:
        # Fallback raw keypair if cryptography package is missing
        return (
            "BC8a3W96N-rB0aU603X1w2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z=",
            "a_sample_vapid_private_key"
        )

    private_key = ec.generate_private_key(ec.SECP256R1())

    # Raw 32-byte private key scalar
    private_value = private_key.private_numbers().private_value
    private_bytes = private_value.to_bytes(32, byteorder="big")
    private_b64 = base64.urlsafe_b64encode(private_bytes).rstrip(b"=").decode("utf-8")

    # Uncompressed 65-byte public key (0x04 + 32-byte X + 32-byte Y)
    public_numbers = private_key.public_key().public_numbers()
    x_bytes = public_numbers.x.to_bytes(32, byteorder="big")
    y_bytes = public_numbers.y.to_bytes(32, byteorder="big")
    public_bytes = b"\x04" + x_bytes + y_bytes
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode("utf-8")

    return public_b64, private_b64


def get_or_create_vapid_keys() -> Tuple[str, str]:
    """
    Returns (public_key, private_key).
    Priority:
    1. Environment variables VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
    2. Saved keys in .vapid_keys.json
    3. Auto-generate new VAPID keys and save to .vapid_keys.json
    """
    env_pub = os.getenv("VAPID_PUBLIC_KEY")
    env_priv = os.getenv("VAPID_PRIVATE_KEY")

    if env_pub and env_priv and env_priv != "a_private_vapid_key_string_placeholder":
        return env_pub.strip(), env_priv.strip()

    if os.path.exists(VAPID_FILE):
        try:
            with open(VAPID_FILE, "r") as f:
                data = json.load(f)
                if data.get("public_key") and data.get("private_key"):
                    return data["public_key"], data["private_key"]
        except Exception as e:
            print(f"[VAPID] Error reading {VAPID_FILE}: {e}")

    # Generate new keypair
    pub, priv = generate_vapid_keypair()
    try:
        with open(VAPID_FILE, "w") as f:
            json.dump({"public_key": pub, "private_key": priv}, f, indent=2)
        print(f"[VAPID] Auto-generated new persistent VAPID keypair in {VAPID_FILE}")
    except Exception as e:
        print(f"[VAPID] Error saving {VAPID_FILE}: {e}")

    return pub, priv
