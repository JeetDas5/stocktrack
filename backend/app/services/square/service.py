import os
import json
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def get_square_client_id() -> str:
    return os.getenv("SQUARE_CLIENT_ID", "")


def get_square_client_secret() -> str:
    return os.getenv("SQUARE_CLIENT_SECRET", "")


def get_square_environment() -> str:
    return os.getenv("SQUARE_ENVIRONMENT", "sandbox").lower()


def get_square_redirect_uri() -> str:
    return os.getenv(
        "SQUARE_REDIRECT_URI", "http://localhost:3000/dashboard/square/callback"
    )


def get_square_base_url(env: Optional[str] = None) -> str:
    environment = (env or get_square_environment()).lower()
    if environment == "production":
        return "https://connect.squareup.com"
    return "https://connect.squareupsandbox.com"


def get_square_authorize_url(state: str) -> str:
    base_url = get_square_base_url()
    client_id = get_square_client_id()
    if not client_id:
        raise ValueError(
            "SQUARE_CLIENT_ID environment variable is missing or empty in .env"
        )

    scopes = [
        "ITEMS_READ",
        "MERCHANT_PROFILE_READ",
    ]
    params = {
        "client_id": client_id,
        "scope": " ".join(scopes),
        "session": "false",
        "state": state,
    }
    return f"{base_url}/oauth2/authorize?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    base_url = get_square_base_url()
    url = f"{base_url}/oauth2/token"
    client_id = get_square_client_id()
    client_secret = get_square_client_secret()
    redirect_uri = get_square_redirect_uri()

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
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
    client_id = get_square_client_id()
    client_secret = get_square_client_secret()

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
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


def fetch_square_locations(
    access_token: str, env: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetches locations list from Square API (GET /v2/locations).
    """
    base_url = get_square_base_url(env)
    url = f"{base_url}/v2/locations"

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
        raise RuntimeError(f"Square Locations API Call Failed: {detail}")

