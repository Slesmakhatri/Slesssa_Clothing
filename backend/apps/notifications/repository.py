from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


def notifications_collection():
    return get_collection("notifications")


def create_notification(*, user_id, title, body, kind="system", event_key="", entity_type="", entity_id=None, action_url="", metadata=None):
    document = {
        "id": next_sequence("notifications"),
        "user_id": int(user_id),
        "title": title,
        "body": body,
        "kind": kind,
        "event_key": event_key,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action_url": action_url,
        "metadata": metadata or {},
        "is_read": False,
        "created_at": utcnow(),
        "read_at": None,
    }
    notifications_collection().insert_one(prepare_document_for_mongo(document))
    return clean_document(document)


def list_notifications(user, *, unread_only=False, limit=20):
    query = {"user_id": user.id}
    if unread_only:
        query["is_read"] = False
    documents = notifications_collection().find(query, sort=[("created_at", -1), ("id", -1)])
    items = [clean_document(document) for document in documents]
    return items[: int(limit)]


def get_notification_for_user(user, notification_id):
    try:
        notification_id = int(notification_id)
    except (TypeError, ValueError):
        return None
    document = notifications_collection().find_one({"id": notification_id, "user_id": user.id})
    return clean_document(document) if document else None


def mark_notification_read(user, notification_id):
    document = get_notification_for_user(user, notification_id)
    if not document:
        return None
    if not document.get("is_read"):
        notifications_collection().update_one(
            {"id": document["id"], "user_id": user.id},
            {"$set": {"is_read": True, "read_at": utcnow()}},
        )
    return get_notification_for_user(user, document["id"])


def mark_all_notifications_read(user):
    notifications_collection().update_many(
        {"user_id": user.id, "is_read": False},
        {"$set": {"is_read": True, "read_at": utcnow()}},
    )
