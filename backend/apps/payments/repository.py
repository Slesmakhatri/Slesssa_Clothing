import uuid

from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow

from .khalti import initiate_khalti_payment, lookup_khalti_payment


def payments_collection():
    return get_collection("payments")


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _collect_vendor_user_ids(order):
    vendor_user_ids = set(order.get("vendor_user_ids", []))
    for item in order.get("items", []):
        vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
        product_detail = _mapping_or_empty(item.get("product_detail"))
        product_vendor_detail = _mapping_or_empty(product_detail.get("vendor_detail"))
        vendor_user = item.get("vendor_user") or vendor_detail.get("user") or product_vendor_detail.get("user")
        if vendor_user:
            vendor_user_ids.add(vendor_user)
    return list(vendor_user_ids)


def _mask_value(value):
    if not value:
        return ""
    value = str(value)
    if len(value) <= 4:
        return "*" * len(value)
    return f"{'*' * (len(value) - 4)}{value[-4:]}"


def _sanitize_gateway_payload(payload):
    sensitive_tokens = ("card", "cvv", "pan", "expiry", "secret", "token", "password")
    if isinstance(payload, dict):
        cleaned = {}
        for key, value in payload.items():
            if any(token in str(key).lower() for token in sensitive_tokens):
                cleaned[key] = "[redacted]"
            else:
                cleaned[key] = _sanitize_gateway_payload(value)
        return cleaned
    if isinstance(payload, list):
        return [_sanitize_gateway_payload(item) for item in payload]
    return payload


def list_payments(user):
    documents = [clean_document(document) for document in payments_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    if user.role in {"admin", "super_admin"}:
        return documents
    if user.role == "vendor":
        return [document for document in documents if user.id in document.get("vendor_user_ids", [])]
    return [document for document in documents if document.get("user_id") == user.id]


def get_payment_by_id(payment_id):
    try:
        payment_id = int(payment_id)
    except (TypeError, ValueError):
        return None
    return payments_collection().find_one({"id": payment_id})


def get_payment_for_user(user, payment_id):
    payment = get_payment_by_id(payment_id)
    if not payment:
        return None
    if user.role in {"admin", "super_admin"}:
        return clean_document(payment)
    if user.role == "vendor" and user.id in payment.get("vendor_user_ids", []):
        return clean_document(payment)
    if payment.get("user_id") == user.id:
        return clean_document(payment)
    return None


def initiate_payment(order, provider):
    billing_detail = {
        "id": next_sequence("billing_details"),
        "full_name": order["full_name"],
        "email": order["email"],
        "phone": order["phone"],
        "address_line_1": order.get("billing_address") or order.get("shipping_address"),
        "address_line_2": "",
        "city": order["city"],
        "province": order.get("province", ""),
        "postal_code": order.get("postal_code", ""),
        "country": "Nepal",
        "tax_number": "",
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    payment_id = next_sequence("payments")
    payment = {
        "id": payment_id,
        "order": order["id"],
        "user_id": order["user_id"],
        "vendor_user_ids": _collect_vendor_user_ids(order),
        "provider": provider,
        "transaction_id": f"{provider.upper()}-{order['id']}-{uuid.uuid4().hex[:10].upper()}",
        "external_transaction_id": "",
        "gateway_reference": "",
        "amount": order["total"],
        "currency": "NPR",
        "status": "initiated",
        "payer_name": order["full_name"],
        "payer_email": order["email"],
        "payer_phone": order["phone"],
        "payer_reference": _mask_value(order["phone"] or order["email"]),
        "verification_reference": "",
        "gateway_response": {},
        "verified_at": None,
        "paid_at": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "billing_detail": billing_detail,
        "order_payment": {
            "id": next_sequence("order_payments"),
            "payment_id": payment_id,
            "payment_method": provider,
            "payment_status": "initiated",
            "amount": order["total"],
            "currency": "NPR",
            "is_verified": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        },
        "status_history": [
            {
                "id": next_sequence("payment_status_history"),
                "status": "initiated",
                "note": "Payment initiated and linked to order.",
                "gateway_code": "",
                "gateway_message": "",
                "payload": {},
                "created_at": utcnow(),
            }
        ],
    }
    if provider == "khalti":
        khalti_response = initiate_khalti_payment(order=order, payment_id=payment_id)
        payment["gateway_reference"] = khalti_response.get("pidx", "")
        payment["gateway_response"] = _sanitize_gateway_payload(khalti_response)
        payment["redirect_url"] = khalti_response.get("payment_url", "")
        payment["expires_at"] = khalti_response.get("expires_at")
        payment["expires_in"] = khalti_response.get("expires_in")
    mongo_payment = prepare_document_for_mongo(payment)
    payments_collection().insert_one(mongo_payment)
    from apps.orders.repository import update_order_after_payment

    update_order_after_payment(
        order["id"],
        payment_status="initiated",
        billing_detail=billing_detail,
        payment_record=mongo_payment["order_payment"],
    )
    return clean_document(mongo_payment)


def verify_payment(payment, success, payload):
    now = utcnow()
    payment["external_transaction_id"] = payload.get("external_transaction_id", payment.get("external_transaction_id", ""))
    payment["gateway_reference"] = payload.get("gateway_reference", payment.get("gateway_reference", ""))
    payment["verification_reference"] = payload.get("verification_reference") or uuid.uuid4().hex

    gateway_payload = payload.get("gateway_response", payment.get("gateway_response", {}))
    gateway_code = payload.get("gateway_code", "")
    gateway_message = payload.get("gateway_message", "")
    status_value = "paid" if success else "failed"
    order_status = "processing" if success else "pending"
    note = "Payment verification completed."

    if payment.get("provider") == "khalti":
        pidx = payment.get("gateway_reference") or payload.get("gateway_reference")
        if not pidx:
            raise ValueError("Missing Khalti payment reference.")
        khalti_lookup = lookup_khalti_payment(pidx=pidx)
        khalti_status = str(khalti_lookup.get("status", "")).strip()
        gateway_payload = khalti_lookup
        gateway_code = khalti_status or gateway_code
        gateway_message = f"Khalti lookup returned {khalti_status or 'unknown'} status."
        payment["gateway_reference"] = khalti_lookup.get("pidx", pidx)
        payment["external_transaction_id"] = khalti_lookup.get(
            "transaction_id",
            payload.get("external_transaction_id", payment.get("external_transaction_id", "")),
        )
        payment["verification_reference"] = khalti_lookup.get("pidx", payment["verification_reference"])
        if khalti_status == "Completed":
            status_value = "paid"
            order_status = "processing"
            note = "Khalti payment verified successfully."
        elif khalti_status in {"Pending", "Initiated"}:
            status_value = "initiated"
            order_status = "pending"
            note = "Khalti payment is still pending confirmation."
        else:
            status_value = "failed"
            order_status = "pending"
            note = "Khalti payment verification failed."

    payment["gateway_response"] = _sanitize_gateway_payload(gateway_payload)
    payment["status"] = status_value
    payment["verified_at"] = now
    payment["paid_at"] = now if status_value == "paid" else None
    payment["updated_at"] = now
    payment["order_payment"]["payment_status"] = status_value
    payment["order_payment"]["is_verified"] = status_value == "paid"
    payment["order_payment"]["updated_at"] = now
    payment["status_history"].append(
        {
            "id": next_sequence("payment_status_history"),
            "status": status_value,
            "note": note,
            "gateway_code": gateway_code,
            "gateway_message": gateway_message,
            "payload": _sanitize_gateway_payload(gateway_payload),
            "created_at": now,
        }
    )
    payments_collection().update_one({"id": payment["id"]}, {"$set": prepare_document_for_mongo(payment)})

    from apps.orders.repository import append_tracking_update, update_order_after_payment

    update_order_after_payment(
        payment["order"],
        payment_status=status_value,
        status_value=order_status,
        payment_record=payment["order_payment"],
        billing_detail=payment["billing_detail"],
    )
    append_tracking_update(
        payment["order"],
        order_status,
        note,
    )
    return clean_document(get_payment_by_id(payment["id"]))
