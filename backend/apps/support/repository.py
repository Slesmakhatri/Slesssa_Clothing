from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


def support_messages_collection():
    return get_collection("support_messages")


def _user_summary(user):
    if not user:
        return None
    return {
        "id": getattr(user, "id", None),
        "full_name": getattr(user, "full_name", ""),
        "email": getattr(user, "email", ""),
        "role": getattr(user, "role", ""),
    }


def create_support_message(user, payload):
    document = {
        "id": next_sequence("support_messages"),
        "sender_user_id": getattr(user, "id", None),
        "sender_detail": _user_summary(user),
        "name": payload.get("name", ""),
        "email": payload.get("email", ""),
        "phone": payload.get("phone", ""),
        "subject": payload.get("subject", ""),
        "message": payload.get("message", ""),
        "status": "new",
        "target_type": payload.get("target_type", "admin"),
        "vendor_user_id": payload.get("vendor_user_id"),
        "product_id": payload.get("product_id"),
        "product_name": payload.get("product_name", ""),
        "vendor_name": payload.get("vendor_name", ""),
        "reply_note": "",
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    support_messages_collection().insert_one(prepare_document_for_mongo(document))
    return clean_document(document)


def list_support_messages(user):
    documents = [clean_document(item) for item in support_messages_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    if user.role in {"admin", "super_admin"}:
        return documents
    if user.role == "vendor":
        return [item for item in documents if item.get("target_type") == "vendor" and item.get("vendor_user_id") == user.id]
    return [item for item in documents if item.get("sender_user_id") == user.id or item.get("email") == user.email]


def get_support_message(message_id):
    try:
        message_id = int(message_id)
    except (TypeError, ValueError):
        return None
    document = support_messages_collection().find_one({"id": message_id})
    return clean_document(document) if document else None


def update_support_message(message_id, payload):
    document = get_support_message(message_id)
    if not document:
        return None
    updates = {key: payload[key] for key in ("status", "reply_note") if key in payload}
    if not updates:
        return document
    updates["updated_at"] = utcnow()
    support_messages_collection().update_one({"id": document["id"]}, {"$set": prepare_document_for_mongo(updates)})
    return get_support_message(document["id"])
