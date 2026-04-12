from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings


class KhaltiConfigurationError(Exception):
    pass


class KhaltiGatewayError(Exception):
    pass


def _get_secret_key():
    secret_key = settings.KHALTI_SECRET_KEY.strip()
    if not secret_key:
        raise KhaltiConfigurationError(
            "Khalti secret key is not configured. Add your rotated key to backend/.env as KHALTI_SECRET_KEY."
        )
    return secret_key


def _build_url(path):
    base_url = settings.KHALTI_API_BASE_URL.rstrip("/")
    return f"{base_url}/{path.lstrip('/')}"


def _headers():
    return {
        "Authorization": f"Key {_get_secret_key()}",
        "Content-Type": "application/json",
    }


def _raise_for_gateway_error(response):
    try:
        payload = response.json()
    except ValueError:
        payload = None
    message = "Khalti request failed."
    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error_key")
        if detail:
            message = str(detail)
    raise KhaltiGatewayError(message)


def amount_to_paisa(amount):
    return int((Decimal(str(amount)) * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def initiate_khalti_payment(*, order, payment_id):
    website_url = settings.FRONTEND_BASE_URL.rstrip("/")
    return_url = f"{website_url}/checkout/payment/khalti/{payment_id}"
    payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": amount_to_paisa(order["total"]),
        "purchase_order_id": order["order_number"],
        "purchase_order_name": f"Slessaa order {order['order_number']}",
        "customer_info": {
            "name": order["full_name"],
            "email": order["email"],
            "phone": order["phone"],
        },
    }
    try:
        response = requests.post(
            _build_url("/epayment/initiate/"),
            json=payload,
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException as exc:
        raise KhaltiGatewayError("Unable to reach Khalti right now.") from exc
    if not response.ok:
        _raise_for_gateway_error(response)
    return response.json()


def lookup_khalti_payment(*, pidx):
    try:
        response = requests.post(
            _build_url("/epayment/lookup/"),
            json={"pidx": pidx},
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException as exc:
        raise KhaltiGatewayError("Unable to verify payment with Khalti right now.") from exc
    if not response.ok:
        _raise_for_gateway_error(response)
    return response.json()
