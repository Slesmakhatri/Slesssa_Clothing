from common.mongo import clean_document, get_collection, next_sequence, utcnow


REVIEW_STATUS_ACTIVE = "active"
REVIEW_STATUS_HIDDEN = "hidden"

QUESTION_STATUS_PENDING = "pending"
QUESTION_STATUS_ANSWERED = "answered"
QUESTION_STATUS_MODERATED = "moderated"


def reviews_collection():
    return get_collection("reviews")


def product_questions_collection():
    return get_collection("product_questions")


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _vendor_user_id_from_product(product):
    vendor_detail = _mapping_or_empty(product.get("vendor_detail"))
    return vendor_detail.get("user")


def _normalize_review(review):
    normalized = clean_document(review)
    if normalized:
        normalized["status"] = normalized.get("status", REVIEW_STATUS_ACTIVE)
    return normalized


def _normalize_question(question):
    normalized = clean_document(question)
    if normalized:
        normalized["status"] = normalized.get("status", QUESTION_STATUS_PENDING)
    return normalized


def list_reviews(*, product_id=None, user_id=None, vendor_user_id=None, include_hidden=False):
    reviews = [_normalize_review(document) for document in reviews_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    if product_id is not None:
        reviews = [review for review in reviews if review.get("product") == int(product_id)]
    if user_id is not None:
        reviews = [review for review in reviews if review.get("user") == int(user_id)]
    if vendor_user_id is not None:
        reviews = [review for review in reviews if review.get("vendor_user_id") == int(vendor_user_id)]
    if not include_hidden:
        reviews = [review for review in reviews if review.get("status", REVIEW_STATUS_ACTIVE) == REVIEW_STATUS_ACTIVE]
    return reviews


def get_review_by_id(review_id):
    try:
        review_id = int(review_id)
    except (TypeError, ValueError):
        return None
    review = reviews_collection().find_one({"id": review_id})
    return _normalize_review(review) if review else None


def _find_delivered_order_item(user, product_id, order_id):
    from apps.orders.repository import get_order_for_user

    order = get_order_for_user(user, order_id)
    if not order:
        raise ValueError("Eligible delivered order not found.")
    if str(order.get("status", "")).lower() not in {"delivered", "completed"}:
        raise ValueError("You can only review products from delivered orders.")

    for item in order.get("items", []):
        if item.get("product") == int(product_id):
            return order, item
    raise ValueError("This product was not found in the selected order.")


def create_review(user, product, data):
    order, order_item = _find_delivered_order_item(user, product["id"], data["order"])
    existing = reviews_collection().find_one(
        {
            "user": user.id,
            "product": product["id"],
            "order": order["id"],
            "order_item": order_item["id"],
        }
    )
    if existing:
        raise ValueError("You have already reviewed this delivered item.")

    document = {
        "id": next_sequence("reviews"),
        "user": user.id,
        "user_name": user.full_name or user.email,
        "product": product["id"],
        "product_name": product.get("name", ""),
        "order": order["id"],
        "order_number": order.get("order_number", ""),
        "order_item": order_item["id"],
        "vendor_user_id": _vendor_user_id_from_product(product),
        "rating": data["rating"],
        "comment": data.get("comment", ""),
        "status": REVIEW_STATUS_ACTIVE,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    reviews_collection().insert_one(document)
    from apps.products.repository import update_product_review_stats

    update_product_review_stats(product["id"])
    return _normalize_review(document)


def update_review(review_id, data):
    review = get_review_by_id(review_id)
    if not review:
        return None
    updates = {key: data[key] for key in ("rating", "comment", "status") if key in data}
    updates["updated_at"] = utcnow()
    reviews_collection().update_one({"id": review["id"]}, {"$set": updates})
    from apps.products.repository import update_product_review_stats

    update_product_review_stats(review["product"])
    return get_review_by_id(review["id"])


def delete_review(review_id):
    review = get_review_by_id(review_id)
    if not review:
        return
    reviews_collection().delete_one({"id": review["id"]})
    from apps.products.repository import update_product_review_stats

    update_product_review_stats(review["product"])


def list_product_questions(*, product_id=None, user_id=None, vendor_user_id=None, include_moderated=True):
    questions = [_normalize_question(document) for document in product_questions_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    if product_id is not None:
        questions = [question for question in questions if question.get("product") == int(product_id)]
    if user_id is not None:
        questions = [question for question in questions if question.get("user") == int(user_id)]
    if vendor_user_id is not None:
        questions = [question for question in questions if question.get("vendor_user_id") == int(vendor_user_id)]
    if not include_moderated:
        questions = [question for question in questions if question.get("status") != QUESTION_STATUS_MODERATED]
    return questions


def get_product_question_by_id(question_id):
    try:
        question_id = int(question_id)
    except (TypeError, ValueError):
        return None
    question = product_questions_collection().find_one({"id": question_id})
    return _normalize_question(question) if question else None


def create_product_question(user, product, data):
    document = {
        "id": next_sequence("product_questions"),
        "user": user.id,
        "user_name": user.full_name or user.email,
        "product": product["id"],
        "product_name": product.get("name", ""),
        "vendor_user_id": _vendor_user_id_from_product(product),
        "question": data["question"],
        "answer": "",
        "status": QUESTION_STATUS_PENDING,
        "moderation_note": "",
        "answered_by": None,
        "answered_by_name": "",
        "answered_at": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    product_questions_collection().insert_one(document)
    return _normalize_question(document)


def update_product_question(question_id, data):
    question = get_product_question_by_id(question_id)
    if not question:
        return None

    updates = {}
    if "question" in data:
        updates["question"] = data["question"]
    if "answer" in data:
        updates["answer"] = data["answer"]
    if "status" in data:
        updates["status"] = data["status"]
    if "moderation_note" in data:
        updates["moderation_note"] = data["moderation_note"]
    if "answered_by" in data:
        updates["answered_by"] = data["answered_by"]
    if "answered_by_name" in data:
        updates["answered_by_name"] = data["answered_by_name"]
    if "answered_at" in data:
        updates["answered_at"] = data["answered_at"]
    updates["updated_at"] = utcnow()

    product_questions_collection().update_one({"id": question["id"]}, {"$set": updates})
    return get_product_question_by_id(question["id"])


def delete_product_question(question_id):
    question = get_product_question_by_id(question_id)
    if not question:
        return
    product_questions_collection().delete_one({"id": question["id"]})
