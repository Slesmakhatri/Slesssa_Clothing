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
        return conversation.get("kind") == "vendor_admin" and user.id in (conversation.get("participant_user_ids") or [])
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
    if payload["kind"] == "vendor_admin":
        query.pop("customer_user_id", None)
        query["vendor_user_id"] = payload["vendor_user_id"]
        query["admin_user_id"] = payload["admin_user_id"]
        query["support_topic"] = payload.get("support_topic", "")
    for key in ("product_id", "order_id", "return_request_id", "tailoring_request_id"):
        if payload.get(key) is not None:
            query[key] = payload.get(key)
    if payload.get("custom_request_id") is not None and payload.get("tailoring_request_id") is None:
        query["custom_request_id"] = payload.get("custom_request_id")
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
    if conversation.get("kind") == "vendor_admin":
        if user.id == conversation.get("vendor_user_id"):
            return conversation.get("admin_detail")
        return conversation.get("vendor_detail")
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
    if conversation.get("support_topic"):
        bits.append(str(conversation.get("support_topic")).replace("_", " ").title())
    if conversation.get("subject"):
        bits.append(conversation.get("subject"))
    return " - ".join([item for item in bits if item]) or "General conversation"


def _conversation_identity(conversation):
    support_topic = conversation.get("support_topic") or ""
    return tuple(
        [
            conversation.get("kind"),
            conversation.get("customer_user_id"),
            conversation.get("vendor_user_id"),
            conversation.get("tailor_user_id"),
            conversation.get("admin_user_id"),
            support_topic,
            conversation.get("product_id"),
            conversation.get("order_id"),
            conversation.get("return_request_id"),
            conversation.get("tailoring_request_id"),
            conversation.get("custom_request_id"),
        ]
    )


def _dedupe_conversations(documents):
    seen = set()
    unique = []
    for document in documents:
        if document.get("tailoring_request_id") and document.get("custom_request_id") is None:
            document["custom_request_id"] = document.get("tailoring_request_id")
        key = _conversation_identity(document)
        if key in seen:
            continue
        seen.add(key)
        unique.append(document)
    return unique


def _find_existing_conversation(payload):
    return conversations_collection().find_one(
        _conversation_query_for_payload(payload),
        sort=[("updated_at", -1), ("id", -1)],
    )


def _to_int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _conversation_type_for_kind(kind):
    return {
        "customer_vendor": "vendor_chat",
        "customer_tailor": "tailor_chat",
        "vendor_admin": "vendor_admin",
    }.get(kind, kind)


def _kind_for_conversation_type(conversation_type):
    return {
        "vendor_chat": "customer_vendor",
        "tailor_chat": "customer_tailor",
        "customer_vendor": "customer_vendor",
        "customer_tailor": "customer_tailor",
        "vendor_admin": "vendor_admin",
    }.get(conversation_type)


def decorate_conversation_for_user(user, conversation):
    document = clean_document(conversation) if conversation else None
    if not document:
        return None
    document.setdefault("admin_user_id", None)
    document.setdefault("admin_detail", None)
    document.setdefault("custom_request_id", document.get("tailoring_request_id"))
    document.setdefault("support_topic", "")
    document.setdefault("subject", "")
    document.setdefault("is_closed", False)
    document.setdefault("participant_user_ids", [])
    last_message = _latest_message_preview(document["id"])
    counterparty = _counterparty_for_user(user, document)
    return {
        **document,
        "conversation_type": _conversation_type_for_kind(document.get("kind")),
        "customer_id": document.get("customer_user_id"),
        "admin_id": document.get("admin_user_id"),
        "tailor_id": document.get("tailor_user_id"),
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
        "sender_id": sender_detail["id"],
        "sender_user_id": sender_detail["id"],
        "sender_role": sender_detail["role"],
        "sender_detail": sender_detail,
        "body": body,
        "attachment": attachment,
        "is_read": True,
        "read_by_user_ids": [sender_detail["id"]],
        "created_at": utcnow(),
        "deleted_for_user_ids": [],
    }


def _decorate_message_for_user(user, message):
    document = clean_document(message)
    sender_user_id = document.get("sender_user_id") or document.get("sender_id")
    read_by = document.get("read_by_user_ids") or []
    document["sender_id"] = sender_user_id
    document["sender_user_id"] = sender_user_id
    document["sender_role"] = document.get("sender_role") or _mapping_or_empty(document.get("sender_detail")).get("role", "")
    document["is_read"] = user.id in read_by
    return document


def _context_details(payload):
    from apps.orders.repository import _get_return_request_by_id, get_order_by_id
    from apps.products.repository import get_product_by_id
    from apps.tailoring.repository import get_tailoring_request_for_user, tailor_profiles_collection
    from apps.vendors.repository import get_vendor_by_user_id
    from apps.accounts.repository import get_user_by_id

    customer_user = get_user_by_id(payload.get("customer_user_id")) if payload.get("customer_user_id") else None
    admin_user = get_user_by_id(payload.get("admin_user_id")) if payload.get("admin_user_id") else None
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
        "admin_detail": _user_summary(admin_user),
        "vendor_detail": _vendor_summary(vendor) if vendor else _user_summary(vendor_user),
        "tailor_detail": _tailor_summary(tailor_profile) if tailor_profile else _user_summary(tailor_user),
        "product_detail": _product_summary(product),
        "order_detail": _order_summary(order),
        "return_request_detail": _return_summary(return_request),
        "tailoring_request_detail": _tailoring_request_summary(tailoring_request),
        "vendor_id": (vendor or {}).get("id") if vendor else None,
    }


def _default_vendor_user_id():
    from apps.vendors.repository import vendors_collection

    vendor = clean_document(vendors_collection().find_one({"approval_status": "approved"}, sort=[("id", 1)]))
    return vendor.get("user") if vendor else None


def validate_conversation_start(user, payload):
    from apps.orders.repository import get_order_for_user, get_return_request_for_user
    from apps.products.repository import get_product_by_id
    from apps.tailoring.repository import get_tailoring_request_for_user

    requested_kind = payload.get("kind") or _kind_for_conversation_type(payload.get("conversation_type"))
    if requested_kind not in {"customer_vendor", "customer_tailor", "vendor_admin"}:
        raise ValueError("A valid conversation type is required.")
    payload = {**payload, "kind": requested_kind}

    if user.role not in {"customer", "tailor", "vendor", "admin", "super_admin"}:
        raise ValueError("Your account cannot start conversations.")

    validated = {
        "kind": payload["kind"],
        "customer_user_id": user.id if user.role == "customer" else None,
        "product_id": payload.get("product_id"),
        "order_id": payload.get("order_id"),
        "return_request_id": payload.get("return_request_id"),
        "tailoring_request_id": payload.get("tailoring_request_id") or payload.get("custom_request_id"),
        "custom_request_id": payload.get("custom_request_id") or payload.get("tailoring_request_id"),
        "subject": str(payload.get("subject") or "").strip(),
        "support_topic": str(payload.get("support_topic") or "").strip(),
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
                elif not vendor_users:
                    vendor_user_id = _default_vendor_user_id()
        if payload.get("return_request_id"):
            return_request = get_return_request_for_user(user, payload.get("return_request_id"))
            if not return_request:
                raise ValueError("You can only start vendor chat for your own return requests.")
            if vendor_user_id and int(vendor_user_id) != int(return_request.get("vendor_user_id") or 0):
                raise ValueError("Return request context does not match the selected vendor.")
            vendor_user_id = vendor_user_id or return_request.get("vendor_user_id")
        if not vendor_user_id:
            vendor_user_id = _default_vendor_user_id()
        if not vendor_user_id:
            raise ValueError("A valid vendor context is required to start this chat.")
        validated["vendor_user_id"] = int(vendor_user_id)
        validated["tailor_user_id"] = None
        validated["admin_user_id"] = None

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
        validated["admin_user_id"] = None

    if payload["kind"] == "vendor_admin":
        from apps.accounts.repository import ROLE_ADMIN, ROLE_SUPER_ADMIN, get_user_by_id, list_users
        from apps.vendors.repository import get_vendor_by_user_id

        if user.role not in {"vendor", "admin", "super_admin"}:
            raise ValueError("Only vendors and admins can use vendor support conversations.")
        vendor_user_id = payload.get("vendor_user_id")
        if user.role == "vendor":
            vendor_user_id = user.id
        if not vendor_user_id:
            raise ValueError("Vendor context is required.")
        vendor_user = get_user_by_id(vendor_user_id)
        if not vendor_user or vendor_user.get("role") != "vendor":
            raise ValueError("A valid vendor account is required.")

        admin_user_id = payload.get("admin_user_id")
        if user.role == "admin":
            admin_user_id = admin_user_id or user.id
            if int(admin_user_id) != int(user.id):
                raise ValueError("Admins can only create support threads assigned to themselves.")
        if user.role == "super_admin":
            admin_user_id = admin_user_id or user.id
        if not admin_user_id:
            admins = [item for item in list_users() if item.get("role") in {ROLE_ADMIN, ROLE_SUPER_ADMIN} and item.get("is_active", True)]
            if not admins:
                raise ValueError("No admin account is available for support.")
            admins.sort(key=lambda item: (0 if item.get("role") == ROLE_ADMIN else 1, item.get("id", 0)))
            admin_user_id = admins[0]["id"]
        admin_user = get_user_by_id(admin_user_id)
        if not admin_user or admin_user.get("role") not in {ROLE_ADMIN, ROLE_SUPER_ADMIN}:
            raise ValueError("A valid admin account is required.")
        vendor = get_vendor_by_user_id(vendor_user_id)
        validated.update({
            "customer_user_id": None,
            "vendor_user_id": int(vendor_user_id),
            "vendor_id": (vendor or {}).get("id"),
            "admin_user_id": int(admin_user_id),
            "tailor_user_id": None,
            "support_topic": validated["support_topic"] or "general_support",
            "subject": validated["subject"] or "Vendor support request",
        })

    return validated


def _ensure_tailor_request_conversations_for_user(user):
    if user.role not in {"customer", "tailor"}:
        return
    from apps.tailoring.repository import list_tailoring_requests

    for request_document in list_tailoring_requests(user):
        ensure_tailor_request_conversation(request_document, actor=user)


def ensure_tailor_request_conversation(request_document, actor=None):
    tailor_user_id = _to_int_or_none(request_document.get("tailor_id") or request_document.get("assigned_tailor"))
    if not tailor_user_id:
        return None
    customer_user_id = _to_int_or_none(request_document.get("customer_id") or request_document.get("user"))
    if not customer_user_id:
        return None
    if actor and actor.role == "tailor" and tailor_user_id != int(actor.id):
        return None
    if actor and actor.role == "customer" and customer_user_id != int(actor.id):
        return None
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
    existing = _find_existing_conversation(payload)
    if existing:
        return clean_document(existing)
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
        "admin_user_id": None,
        "admin_detail": None,
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
        "custom_request_id": payload["tailoring_request_id"],
        "support_topic": "",
        "subject": "",
        "is_closed": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "last_message_at": None,
        "last_message_preview": "",
    }
    conversations_collection().insert_one(prepare_document_for_mongo(document))
    return document


def _vendor_user_ids_for_order(order):
    vendor_user_ids = set()
    for vendor_user_id in order.get("vendor_user_ids") or []:
        vendor_user_id = _to_int_or_none(vendor_user_id)
        if vendor_user_id:
            vendor_user_ids.add(vendor_user_id)
    for item in order.get("items") or []:
        vendor_user_id = (
            item.get("vendor_user_id")
            or item.get("vendor_user")
            or _mapping_or_empty(item.get("vendor_detail")).get("user")
            or _mapping_or_empty(_mapping_or_empty(item.get("product_detail")).get("vendor_detail")).get("user")
        )
        vendor_user_id = _to_int_or_none(vendor_user_id)
        if vendor_user_id:
            vendor_user_ids.add(vendor_user_id)
    if not vendor_user_ids:
        default_vendor_user_id = _default_vendor_user_id()
        if default_vendor_user_id:
            vendor_user_ids.add(default_vendor_user_id)
    return sorted(vendor_user_ids)


def _ensure_vendor_order_conversations_for_user(user):
    if user.role not in {"customer", "vendor"}:
        return
    from apps.orders.repository import list_orders

    for order in list_orders(user):
        customer_user_id = _to_int_or_none(order.get("customer_id") or order.get("user_id"))
        if not customer_user_id:
            continue
        for vendor_user_id in _vendor_user_ids_for_order(order):
            if user.role == "customer" and customer_user_id != int(user.id):
                continue
            if user.role == "vendor" and vendor_user_id != int(user.id):
                continue
            payload = {
                "kind": "customer_vendor",
                "customer_user_id": customer_user_id,
                "vendor_user_id": vendor_user_id,
                "tailor_user_id": None,
                "product_id": None,
                "order_id": int(order["id"]),
                "return_request_id": None,
                "tailoring_request_id": None,
            }
            if _find_existing_conversation(payload):
                continue
            details = _context_details(payload)
            document = {
                "id": next_sequence("chat_conversations"),
                "kind": "customer_vendor",
                "participant_user_ids": [payload["customer_user_id"], payload["vendor_user_id"]],
                "customer_user_id": payload["customer_user_id"],
                "customer_detail": details["customer_detail"],
                "vendor_user_id": payload["vendor_user_id"],
                "vendor_id": details.get("vendor_id"),
                "vendor_detail": details["vendor_detail"],
                "admin_user_id": None,
                "admin_detail": None,
                "tailor_user_id": None,
                "tailor_detail": None,
                "product_id": None,
                "product_detail": None,
                "order_id": payload["order_id"],
                "order_detail": details["order_detail"],
                "return_request_id": None,
                "return_request_detail": None,
                "tailoring_request_id": None,
                "tailoring_request_detail": None,
                "custom_request_id": None,
                "support_topic": "",
                "subject": "",
                "is_closed": False,
                "created_at": utcnow(),
                "updated_at": utcnow(),
                "last_message_at": None,
                "last_message_preview": "",
            }
            conversations_collection().insert_one(prepare_document_for_mongo(document))


def list_conversations(user, params=None):
    params = params or {}
    # Ensure workflow conversations exist even when the frontend did not
    # explicitly create them from a button click.
    _ensure_vendor_order_conversations_for_user(user)
    _ensure_tailor_request_conversations_for_user(user)
    documents = [clean_document(item) for item in conversations_collection().find({}, sort=[("updated_at", -1), ("id", -1)])]
    documents = [item for item in documents if _conversation_accessible(user, item)]
    kind = params.get("kind")
    if kind:
        documents = [item for item in documents if item.get("kind") == kind]
    documents = _dedupe_conversations(documents)
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
    existing = _find_existing_conversation(validated)
    if existing:
        return decorate_conversation_for_user(user, clean_document(existing))

    details = _context_details(validated)
    participant_user_ids = []
    if validated.get("customer_user_id"):
        participant_user_ids.append(validated["customer_user_id"])
    if validated.get("vendor_user_id"):
        participant_user_ids.append(validated["vendor_user_id"])
    if validated.get("admin_user_id"):
        participant_user_ids.append(validated["admin_user_id"])
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
        "admin_user_id": validated.get("admin_user_id"),
        "admin_detail": details["admin_detail"],
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
        "custom_request_id": validated.get("custom_request_id"),
        "support_topic": validated.get("support_topic", ""),
        "subject": validated.get("subject", ""),
        "is_closed": False,
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
    return [
        _decorate_message_for_user(user, item)
        for item in documents
        if user.id not in (item.get("deleted_for_user_ids") or [])
    ]


def send_message(user, conversation_id, payload):
    conversation_id = _to_int_or_none(conversation_id)
    if conversation_id is None:
        return None
    conversation = get_conversation_for_user(user, conversation_id)
    if not conversation:
        return None
    if conversation.get("is_closed"):
        raise ValueError("This conversation is closed.")
    attachment = payload.get("attachment", "")
    document = _message_document(conversation, user, payload["body"], attachment=attachment)
    messages_collection().insert_one(prepare_document_for_mongo(document))
    conversations_collection().update_one(
        {"id": conversation["id"]},
        {"$set": prepare_document_for_mongo({"updated_at": utcnow(), "last_message_at": document["created_at"], "last_message_preview": document["body"][:140]})},
    )
    return _decorate_message_for_user(user, document)


def set_conversation_closed(user, conversation_id, is_closed):
    conversation_id = _to_int_or_none(conversation_id)
    if conversation_id is None:
        return None
    conversation = get_conversation_for_user(user, conversation_id)
    if not conversation:
        return None
    if conversation.get("kind") != "vendor_admin":
        raise ValueError("Only vendor support conversations can be closed from this inbox.")
    if user.role not in {"admin", "super_admin"}:
        raise ValueError("Only admins can close or reopen vendor support conversations.")
    conversations_collection().update_one(
        {"id": conversation["id"]},
        {"$set": prepare_document_for_mongo({"is_closed": bool(is_closed), "updated_at": utcnow()})},
    )
    updated = conversations_collection().find_one({"id": conversation["id"]})
    return decorate_conversation_for_user(user, updated)


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
