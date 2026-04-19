from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


def conversations_collection():
    return get_collection("chat_conversations")


def messages_collection():
    return get_collection("chat_messages")


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _user_summary(user):
    if not user:
        return None
    if isinstance(user, dict):
        return {
            "id": user.get("id"),
            "full_name": user.get("full_name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", ""),
            "avatar": user.get("avatar", ""),
        }
    return {
        "id": getattr(user, "id", None),
        "full_name": getattr(user, "full_name", ""),
        "email": getattr(user, "email", ""),
        "role": getattr(user, "role", ""),
        "avatar": getattr(user, "avatar", ""),
    }


def _product_summary(product):
    product = clean_document(product) if product else None
    if not product:
        return None
    return {
        "id": product.get("id"),
        "name": product.get("name", ""),
        "slug": product.get("slug", ""),
        "image": product.get("main_image") or product.get("external_image_url", ""),
    }


def _vendor_summary(vendor):
    vendor = clean_document(vendor) if vendor else None
    if not vendor:
        return None
    return {
        "id": vendor.get("id"),
        "user": vendor.get("user"),
        "brand_name": vendor.get("brand_name", ""),
        "slug": vendor.get("slug", ""),
        "contact_email": vendor.get("contact_email", ""),
    }


def _tailor_summary(profile):
    profile = clean_document(profile) if profile else None
    if not profile:
        return None
    return {
        "id": profile.get("id"),
        "user": profile.get("user"),
        "full_name": profile.get("full_name", "") or _mapping_or_empty(profile.get("user_detail")).get("full_name", ""),
        "specialization": profile.get("specialization", ""),
        "profile_image": profile.get("profile_image", ""),
    }


def _order_summary(order):
    order = clean_document(order) if order else None
    if not order:
        return None
    return {
        "id": order.get("id"),
        "order_number": order.get("order_number", ""),
        "status": order.get("status", ""),
        "total": order.get("total"),
    }


def _return_summary(return_request):
    return_request = clean_document(return_request) if return_request else None
    if not return_request:
        return None
    return {
        "id": return_request.get("id"),
        "status": return_request.get("status", ""),
        "product_name": return_request.get("product_name", ""),
        "requested_resolution": return_request.get("requested_resolution", ""),
    }


def _tailoring_request_summary(request_document):
    request_document = clean_document(request_document) if request_document else None
    if not request_document:
        return None
    return {
        "id": request_document.get("id"),
        "clothing_type": request_document.get("clothing_type", ""),
        "status": request_document.get("status", ""),
        "reference_product_name": request_document.get("reference_product_name", ""),
    }


def _conversation_accessible(user, conversation):
    if user.role == "super_admin":
        return True
    if user.role == "admin":
        return False
    return user.id in (conversation.get("participant_user_ids") or [])


def _conversation_query_for_payload(payload):
    query = {
        "kind": payload["kind"],
        "customer_user_id": payload["customer_user_id"],
    }
    if payload["kind"] == "customer_vendor":
        query["vendor_user_id"] = payload["vendor_user_id"]
    if payload["kind"] == "customer_tailor":
        query["tailor_user_id"] = payload["tailor_user_id"]
    for key in ("product_id", "order_id", "return_request_id", "tailoring_request_id"):
        query[key] = payload.get(key)
    return query


def _latest_message_preview(conversation_id):
    document = messages_collection().find_one({"conversation_id": int(conversation_id)}, sort=[("created_at", -1), ("id", -1)])
    return clean_document(document) if document else None


def _unread_count_for_user(conversation_id, user_id):
    count = 0
    for message in messages_collection().find({"conversation_id": int(conversation_id)}):
        document = clean_document(message)
        if document.get("sender_user_id") == user_id:
            continue
        if user_id not in (document.get("read_by_user_ids") or []):
            count += 1
    return count


def _counterparty_for_user(user, conversation):
    if user.id == conversation.get("customer_user_id"):
        return conversation.get("vendor_detail") or conversation.get("tailor_detail")
    return conversation.get("customer_detail")


def _context_summary(conversation):
    bits = []
    if conversation.get("product_detail"):
        bits.append(conversation["product_detail"].get("name", "Product"))
    if conversation.get("order_detail"):
        bits.append(conversation["order_detail"].get("order_number", "Order"))
    if conversation.get("tailoring_request_detail"):
        bits.append(conversation["tailoring_request_detail"].get("clothing_type", "Tailoring Request"))
    if conversation.get("return_request_detail"):
        bits.append(f"Return #{conversation['return_request_detail'].get('id')}")
    return " · ".join([item for item in bits if item]) or "General conversation"


def _to_int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def decorate_conversation_for_user(user, conversation):
    document = clean_document(conversation) if conversation else None
    if not document:
        return None
    last_message = _latest_message_preview(document["id"])
    counterparty = _counterparty_for_user(user, document)
    return {
        **document,
        "unread_count": _unread_count_for_user(document["id"], user.id),
        "last_message": last_message,
        "last_message_preview": (last_message or {}).get("body", ""),
        "counterparty_detail": counterparty,
        "context_summary": _context_summary(document),
    }


def _message_document(conversation, sender, body, attachment=""):
    sender_detail = _user_summary(sender)
    return {
        "id": next_sequence("chat_messages"),
        "conversation_id": conversation["id"],
        "sender_user_id": sender_detail["id"],
        "sender_detail": sender_detail,
        "body": body,
        "attachment": attachment,
        "read_by_user_ids": [sender_detail["id"]],
        "created_at": utcnow(),
        "deleted_for_user_ids": [],
    }


def _context_details(payload):
    from apps.orders.repository import _get_return_request_by_id, get_order_by_id
    from apps.products.repository import get_product_by_id
    from apps.tailoring.repository import get_tailoring_request_for_user, tailor_profiles_collection
    from apps.vendors.repository import get_vendor_by_user_id
    from apps.accounts.repository import get_user_by_id

    customer_user = get_user_by_id(payload["customer_user_id"])
    vendor_user = get_user_by_id(payload.get("vendor_user_id")) if payload.get("vendor_user_id") else None
    tailor_user = get_user_by_id(payload.get("tailor_user_id")) if payload.get("tailor_user_id") else None
    vendor = get_vendor_by_user_id(payload.get("vendor_user_id")) if payload.get("vendor_user_id") else None
    tailor_profile = clean_document(tailor_profiles_collection().find_one({"user": payload.get("tailor_user_id")})) if payload.get("tailor_user_id") else None
    product = get_product_by_id(payload.get("product_id")) if payload.get("product_id") else None
    order = clean_document(get_order_by_id(payload.get("order_id"))) if payload.get("order_id") else None
    return_request = _get_return_request_by_id(payload.get("return_request_id")) if payload.get("return_request_id") else None
    tailoring_request = get_tailoring_request_for_user(customer_user, payload.get("tailoring_request_id")) if payload.get("tailoring_request_id") and customer_user else None

    return {
        "customer_detail": _user_summary(customer_user),
        "vendor_detail": _vendor_summary(vendor) if vendor else _user_summary(vendor_user),
        "tailor_detail": _tailor_summary(tailor_profile) if tailor_profile else _user_summary(tailor_user),
        "product_detail": _product_summary(product),
        "order_detail": _order_summary(order),
        "return_request_detail": _return_summary(return_request),
        "tailoring_request_detail": _tailoring_request_summary(tailoring_request),
        "vendor_id": (vendor or {}).get("id") if vendor else None,
    }


def validate_conversation_start(user, payload):
    from apps.orders.repository import get_order_for_user, get_return_request_for_user
    from apps.products.repository import get_product_by_id
    from apps.tailoring.repository import get_tailoring_request_for_user

    if user.role not in {"customer", "tailor"}:
        raise ValueError("Only customers (for vendor chats) and assigned tailors (for tailor chats) can start conversations.")

    validated = {
        "kind": payload["kind"],
        "customer_user_id": user.id,
        "product_id": payload.get("product_id"),
        "order_id": payload.get("order_id"),
        "return_request_id": payload.get("return_request_id"),
        "tailoring_request_id": payload.get("tailoring_request_id"),
    }

    if payload["kind"] == "customer_vendor":
        if user.role != "customer":
            raise ValueError("Only customers can start vendor chat conversations.")
        vendor_user_id = payload.get("vendor_user_id")
        product = get_product_by_id(payload.get("product_id")) if payload.get("product_id") else None
        if product:
            product_vendor_user_id = _mapping_or_empty(product.get("vendor_detail")).get("user")
            if vendor_user_id and int(vendor_user_id) != int(product_vendor_user_id or 0):
                raise ValueError("Product context does not match the selected vendor.")
            vendor_user_id = vendor_user_id or product_vendor_user_id
        if payload.get("order_id"):
            order = get_order_for_user(user, payload.get("order_id"))
            if not order:
                raise ValueError("You can only start vendor chat for your own orders.")
            if vendor_user_id and not any(int(item.get("vendor_user") or 0) == int(vendor_user_id) for item in order.get("items", [])):
                raise ValueError("Order context does not match the selected vendor.")
            if not vendor_user_id:
                vendor_users = {item.get("vendor_user") for item in order.get("items", []) if item.get("vendor_user")}
                if len(vendor_users) == 1:
                    vendor_user_id = next(iter(vendor_users))
        if payload.get("return_request_id"):
            return_request = get_return_request_for_user(user, payload.get("return_request_id"))
            if not return_request:
                raise ValueError("You can only start vendor chat for your own return requests.")
            if vendor_user_id and int(vendor_user_id) != int(return_request.get("vendor_user_id") or 0):
                raise ValueError("Return request context does not match the selected vendor.")
            vendor_user_id = vendor_user_id or return_request.get("vendor_user_id")
        if not vendor_user_id:
            raise ValueError("A valid vendor context is required to start this chat.")
        validated["vendor_user_id"] = int(vendor_user_id)
        validated["tailor_user_id"] = None

    if payload["kind"] == "customer_tailor":
        tailoring_request_id = payload.get("tailoring_request_id")
        if not tailoring_request_id:
            raise ValueError("Tailor chat requires a tailoring request context.")
        tailoring_request = get_tailoring_request_for_user(user, tailoring_request_id)
        if not tailoring_request:
            raise ValueError("You can only start tailor chat for a request assigned to you or owned by you.")
        tailor_user_id = tailoring_request.get("tailor_id") or tailoring_request.get("assigned_tailor")
        if not tailor_user_id:
            raise ValueError("This tailoring request does not have an assigned tailor yet.")
        if user.role == "tailor":
            if int(tailor_user_id) != int(user.id):
                raise ValueError("You can only start tailor chat for requests assigned to you.")
            validated["customer_user_id"] = int(tailoring_request["user"])
        validated["tailor_user_id"] = int(tailor_user_id)
        validated["vendor_user_id"] = None

    return validated


def _ensure_tailor_request_conversations_for_user(user):
    if user.role not in {"customer", "tailor"}:
        return
    from apps.tailoring.repository import list_tailoring_requests

    for request_document in list_tailoring_requests(user):
        tailor_user_id = _to_int_or_none(request_document.get("tailor_id") or request_document.get("assigned_tailor"))
        if not tailor_user_id:
            continue
        customer_user_id = _to_int_or_none(request_document.get("user"))
        if not customer_user_id:
            continue
        if user.role == "tailor" and tailor_user_id != int(user.id):
            continue
        if user.role == "customer" and customer_user_id != int(user.id):
            continue
        payload = {
            "kind": "customer_tailor",
            "customer_user_id": customer_user_id,
            "tailor_user_id": tailor_user_id,
            "vendor_user_id": None,
            "product_id": None,
            "order_id": None,
            "return_request_id": None,
            "tailoring_request_id": int(request_document["id"]),
        }
        if conversations_collection().find_one(_conversation_query_for_payload(payload)):
            continue
        details = _context_details(payload)
        document = {
            "id": next_sequence("chat_conversations"),
            "kind": "customer_tailor",
            "participant_user_ids": [payload["customer_user_id"], payload["tailor_user_id"]],
            "customer_user_id": payload["customer_user_id"],
            "customer_detail": details["customer_detail"],
            "vendor_user_id": None,
            "vendor_id": None,
            "vendor_detail": None,
            "tailor_user_id": payload["tailor_user_id"],
            "tailor_detail": details["tailor_detail"],
            "product_id": None,
            "product_detail": None,
            "order_id": None,
            "order_detail": None,
            "return_request_id": None,
            "return_request_detail": None,
            "tailoring_request_id": payload["tailoring_request_id"],
            "tailoring_request_detail": details["tailoring_request_detail"],
            "created_at": utcnow(),
            "updated_at": utcnow(),
            "last_message_at": None,
            "last_message_preview": "",
        }
        conversations_collection().insert_one(prepare_document_for_mongo(document))


def list_conversations(user, params=None):
    params = params or {}
    # Ensure tailoring-request conversations exist for the user so threads appear
    # even when the frontend does not explicitly filter by kind.
    _ensure_tailor_request_conversations_for_user(user)
    documents = [clean_document(item) for item in conversations_collection().find({}, sort=[("updated_at", -1), ("id", -1)])]
    documents = [item for item in documents if _conversation_accessible(user, item)]
    kind = params.get("kind")
    if kind:
        documents = [item for item in documents if item.get("kind") == kind]
    return [decorate_conversation_for_user(user, item) for item in documents]


def get_conversation_for_user(user, conversation_id):
    try:
        conversation_id = int(conversation_id)
    except (TypeError, ValueError):
        return None
    document = conversations_collection().find_one({"id": conversation_id})
    if not document:
        return None
    clean = clean_document(document)
    if not _conversation_accessible(user, clean):
        return None
    return decorate_conversation_for_user(user, clean)


def create_or_get_conversation(user, payload):
    validated = validate_conversation_start(user, payload)
    existing = conversations_collection().find_one(_conversation_query_for_payload(validated))
    if existing:
        return decorate_conversation_for_user(user, clean_document(existing))

    details = _context_details(validated)
    participant_user_ids = [validated["customer_user_id"]]
    if validated.get("vendor_user_id"):
        participant_user_ids.append(validated["vendor_user_id"])
    if validated.get("tailor_user_id"):
        participant_user_ids.append(validated["tailor_user_id"])

    document = {
        "id": next_sequence("chat_conversations"),
        "kind": validated["kind"],
        "participant_user_ids": participant_user_ids,
        "customer_user_id": validated["customer_user_id"],
        "customer_detail": details["customer_detail"],
        "vendor_user_id": validated.get("vendor_user_id"),
        "vendor_id": details.get("vendor_id"),
        "vendor_detail": details["vendor_detail"],
        "tailor_user_id": validated.get("tailor_user_id"),
        "tailor_detail": details["tailor_detail"],
        "product_id": validated.get("product_id"),
        "product_detail": details["product_detail"],
        "order_id": validated.get("order_id"),
        "order_detail": details["order_detail"],
        "return_request_id": validated.get("return_request_id"),
        "return_request_detail": details["return_request_detail"],
        "tailoring_request_id": validated.get("tailoring_request_id"),
        "tailoring_request_detail": details["tailoring_request_detail"],
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "last_message_at": None,
        "last_message_preview": "",
    }
    conversations_collection().insert_one(prepare_document_for_mongo(document))
    return decorate_conversation_for_user(user, document)


def list_messages_for_conversation(user, conversation_id):
    try:
        conversation_id = int(conversation_id)
    except (TypeError, ValueError):
        return None
    conversation = get_conversation_for_user(user, conversation_id)
    if not conversation:
        return None
    documents = [
        clean_document(item)
        for item in messages_collection().find({"conversation_id": conversation_id}, sort=[("created_at", 1), ("id", 1)])
    ]
    return [item for item in documents if user.id not in (item.get("deleted_for_user_ids") or [])]


def send_message(user, conversation_id, payload):
    conversation_id = _to_int_or_none(conversation_id)
    if conversation_id is None:
        return None
    conversation = get_conversation_for_user(user, conversation_id)
    if not conversation:
        return None
    attachment = payload.get("attachment", "")
    document = _message_document(conversation, user, payload["body"], attachment=attachment)
    messages_collection().insert_one(prepare_document_for_mongo(document))
    conversations_collection().update_one(
        {"id": conversation["id"]},
        {"$set": prepare_document_for_mongo({"updated_at": utcnow(), "last_message_at": document["created_at"], "last_message_preview": document["body"][:140]})},
    )
    return clean_document(document)


def mark_conversation_read(user, conversation_id):
    conversation = get_conversation_for_user(user, conversation_id)
    if not conversation:
        return None
    for message in messages_collection().find({"conversation_id": int(conversation_id)}):
        document = clean_document(message)
        read_by = document.get("read_by_user_ids") or []
        if user.id in read_by:
            continue
        read_by.append(user.id)
        messages_collection().update_one({"id": document["id"]}, {"$set": {"read_by_user_ids": read_by}})
    return decorate_conversation_for_user(user, conversation)
