import os
import json
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any

SQUARE_CLIENT_ID = os.getenv("SQUARE_CLIENT_ID", "")
SQUARE_CLIENT_SECRET = os.getenv("SQUARE_CLIENT_SECRET", "")
SQUARE_ENVIRONMENT = os.getenv("SQUARE_ENVIRONMENT", "sandbox").lower()
SQUARE_REDIRECT_URI = os.getenv(
    "SQUARE_REDIRECT_URI", "http://localhost:3000/dashboard/square/callback"
)


def get_square_base_url(env: Optional[str] = None) -> str:
    environment = (env or SQUARE_ENVIRONMENT).lower()
    if environment == "production":
        return "https://connect.squareup.com"
    return "https://connect.squareupsandbox.com"


def get_square_authorize_url(state: str) -> str:
    base_url = get_square_base_url()
    scopes = [
        "ITEMS_READ",
        "MERCHANT_PROFILE_READ",
    ]
    params = {
        "client_id": SQUARE_CLIENT_ID,
        "scope": " ".join(scopes),
        "session": "false",
        "state": state,
    }
    return f"{base_url}/oauth2/authorize?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    base_url = get_square_base_url()
    url = f"{base_url}/oauth2/token"

    payload = {
        "client_id": SQUARE_CLIENT_ID,
        "client_secret": SQUARE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": SQUARE_REDIRECT_URI,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Square-Version": "2026-07-15",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_body)
            detail = err_json.get("errors", [{}])[0].get("detail", error_body)
        except Exception:
            detail = error_body
        raise RuntimeError(f"Square Token Exchange Failed: {detail}")


def refresh_square_tokens(refresh_token: str) -> Dict[str, Any]:
    base_url = get_square_base_url()
    url = f"{base_url}/oauth2/token"

    payload = {
        "client_id": SQUARE_CLIENT_ID,
        "client_secret": SQUARE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Square-Version": "2026-07-15",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_body)
            detail = err_json.get("errors", [{}])[0].get("detail", error_body)
        except Exception:
            detail = error_body
        raise RuntimeError(f"Square Token Refresh Failed: {detail}")


def fetch_square_catalog(
    access_token: str, types: Optional[str] = None, env: Optional[str] = None
) -> Dict[str, Any]:
    base_url = get_square_base_url(env)
    url = f"{base_url}/v2/catalog/list"

    params = {}
    if types:
        params["types"] = types

    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Square-Version": "2026-07-15",
            "Content-Type": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_body)
            detail = err_json.get("errors", [{}])[0].get("detail", error_body)
        except Exception:
            detail = error_body
        raise RuntimeError(f"Square Catalog API Call Failed: {detail}")
