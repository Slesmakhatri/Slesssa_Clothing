import requests
from django.conf import settings
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.id_token import verify_oauth2_token
from rest_framework import serializers


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def _parse_identity_payload(payload):
    if payload.get("email_verified") not in ("true", True):
        raise serializers.ValidationError({"detail": "Google email address is not verified."})
    return {
        "sub": payload.get("sub", ""),
        "email": (payload.get("email") or "").lower(),
        "name": payload.get("name") or "",
        "given_name": payload.get("given_name") or "",
        "family_name": payload.get("family_name") or "",
        "picture": payload.get("picture") or "",
    }


def verify_google_credential(id_token_value):
    if not settings.GOOGLE_CLIENT_ID:
        raise serializers.ValidationError({"detail": "Google login is not configured on the server."})
    try:
        payload = verify_oauth2_token(id_token_value, GoogleRequest(), settings.GOOGLE_CLIENT_ID)
    except ValueError as exc:
        raise serializers.ValidationError({"detail": "Invalid Google ID token."}) from exc
    return _parse_identity_payload(payload)


def exchange_google_code(code):
    if not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise serializers.ValidationError({"detail": "Google OAuth code exchange is not configured on the server."})

    try:
        token_response = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        raise serializers.ValidationError({"detail": "Unable to reach Google for account verification right now."}) from exc
    if not token_response.ok:
        raise serializers.ValidationError({"detail": "Google token exchange failed."})
    token_payload = token_response.json()

    id_token = token_payload.get("id_token")
    access_token = token_payload.get("access_token")
    if id_token:
        return verify_google_credential(id_token)
    if not access_token:
        raise serializers.ValidationError({"detail": "Google did not return an ID token or access token."})

    try:
        profile_response = requests.get(
            GOOGLE_USERINFO_URL,
            params={"access_token": access_token},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise serializers.ValidationError({"detail": "Unable to reach Google for account verification right now."}) from exc
    if not profile_response.ok:
        raise serializers.ValidationError({"detail": "Google user profile lookup failed."})
    return _parse_identity_payload(profile_response.json())
