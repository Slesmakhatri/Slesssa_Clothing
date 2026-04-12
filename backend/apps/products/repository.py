from django.utils.text import slugify

from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow
from .sustainability import summarize_product_sustainability, sustainable_alternatives_for_product


def categories_collection():
    return get_collection("categories")


def products_collection():
    return get_collection("products")


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _normalize_product_vendor(document):
    if not document:
        return None
    product = clean_document(document) or {}
    vendor_detail = clean_document(product.get("vendor_detail")) if product.get("vendor_detail") else None
    product["vendor_detail"] = vendor_detail
    product["vendor_name"] = product.get("vendor_name") or _mapping_or_empty(vendor_detail).get("brand_name", "")
    product["vendor"] = product.get("vendor") or _mapping_or_empty(vendor_detail).get("id")
    return product


def _decorate_product_sustainability(product, *, products_pool=None, include_sustainable_alternatives=False):
    if not product:
        return None
    summary = summarize_product_sustainability(product)
    enriched = {**product, **summary}
    if include_sustainable_alternatives:
        alternatives_pool = products_pool if products_pool is not None else [_normalize_product_vendor(item) for item in products_collection().find({"is_active": True})]
        enriched["sustainable_alternatives"] = sustainable_alternatives_for_product(product, alternatives_pool)
    return enriched


def _ensure_unique_slug(collection, base_slug, exclude_id=None):
    candidate = base_slug or "item"
    index = 1
    while True:
        query = {"slug": candidate}
        if exclude_id is not None:
            query["id"] = {"$ne": exclude_id}
        if collection.find_one(query) is None:
            return candidate
        index += 1
        candidate = f"{base_slug}-{index}"


def category_summary(document):
    if not document:
        return None
    return {
        "id": document["id"],
        "name": document.get("name", ""),
        "slug": document.get("slug", ""),
        "description": document.get("description", ""),
        "image": document.get("image", ""),
    }


def get_category_by_id(category_id):
    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        return None
    return categories_collection().find_one({"id": category_id})


def list_categories():
    return [clean_document(document) for document in categories_collection().find({}, sort=[("name", 1), ("id", 1)])]


def create_category(data):
    slug = _ensure_unique_slug(categories_collection(), slugify(data["name"]) or "category")
    document = {
        "id": next_sequence("categories"),
        "name": data["name"],
        "slug": slug,
        "description": data.get("description", ""),
        "image": data.get("image", ""),
    }
    categories_collection().insert_one(document)
    return clean_document(document)


def update_category(category_id, data):
    category = get_category_by_id(category_id)
    if not category:
        return None
    updates = {key: data[key] for key in ("name", "description", "image") if key in data}
    if "name" in updates:
        updates["slug"] = _ensure_unique_slug(categories_collection(), slugify(updates["name"]) or category["slug"], exclude_id=category["id"])
    categories_collection().update_one({"id": category["id"]}, {"$set": updates})
    updated = get_category_by_id(category["id"])
    products_collection().update_many(
        {"category": updated["id"]},
        {"$set": {"category_detail": category_summary(updated), "category_name": updated["name"]}},
    )
    return clean_document(updated)


def delete_category(category_id):
    categories_collection().delete_one({"id": int(category_id)})


def get_product_by_id(product_id, *, include_sustainable_alternatives=False):
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return None
    product = _normalize_product_vendor(products_collection().find_one({"id": product_id}))
    return _decorate_product_sustainability(product, include_sustainable_alternatives=include_sustainable_alternatives)


def get_product_by_slug(slug, *, include_sustainable_alternatives=False):
    product = _normalize_product_vendor(products_collection().find_one({"slug": slug}))
    return _decorate_product_sustainability(product, include_sustainable_alternatives=include_sustainable_alternatives)


def product_snapshot(document):
    return _decorate_product_sustainability(_normalize_product_vendor(document))


def _product_search_text(item):
    category_detail = _mapping_or_empty(item.get("category_detail"))
    vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
    parts = [
        item.get("name", ""),
        item.get("description", ""),
        item.get("category_name", ""),
        category_detail.get("name", ""),
        category_detail.get("slug", ""),
        item.get("vendor_name", ""),
        vendor_detail.get("brand_name", ""),
        vendor_detail.get("slug", ""),
        item.get("badge", ""),
        item.get("product_type", ""),
        item.get("sustainability_guidance", ""),
        item.get("customization_note", ""),
        " ".join(item.get("tags", []) or []),
        " ".join(item.get("sizes", []) or []),
        " ".join(item.get("colors", []) or []),
        " ".join(item.get("fabric_options", []) or []),
    ]
    return " ".join(str(part) for part in parts if part).lower()


def list_products(params=None, *, include_inactive=False, vendor_user_id=None):
    params = params or {}
    documents = [_normalize_product_vendor(document) for document in products_collection().find({})]
    items = documents if include_inactive else [item for item in documents if item.get("is_active", True)]
    if vendor_user_id is not None:
        items = [item for item in items if _mapping_or_empty(item.get("vendor_detail")).get("user") == vendor_user_id]

    category = params.get("category")
    search = params.get("search")
    sort = params.get("sort")
    vendor = params.get("vendor")
    min_price = params.get("min_price")
    max_price = params.get("max_price")

    if category:
        items = [item for item in items if item.get("category_detail", {}).get("slug") == category]
    if search:
        lowered = search.lower()
        items = [item for item in items if lowered in _product_search_text(item)]
    if vendor:
        lowered = vendor.lower()
        items = [
            item for item in items
            if _mapping_or_empty(item.get("vendor_detail")).get("slug", "").lower() == lowered
            or _mapping_or_empty(item.get("vendor_detail")).get("brand_name", "").lower() == lowered
        ]
    if min_price:
        items = [item for item in items if float(item.get("price", 0)) >= float(min_price)]
    if max_price:
        items = [item for item in items if float(item.get("price", 0)) <= float(max_price)]

    if sort == "price_low":
        items.sort(key=lambda item: float(item.get("price", 0)))
    elif sort == "price_high":
        items.sort(key=lambda item: float(item.get("price", 0)), reverse=True)
    elif sort == "popularity":
        items.sort(key=lambda item: int(item.get("popularity", 0)), reverse=True)
    else:
        items.sort(key=lambda item: item.get("created_at"), reverse=True)

    return [_decorate_product_sustainability(item) for item in items]


def search_suggestions(query="", limit=8):
    query = str(query or "").strip().lower()
    active_products = [_normalize_product_vendor(document) for document in products_collection().find({"is_active": True})]
    if not query:
        active_products.sort(key=lambda item: int(item.get("popularity", 0)), reverse=True)
        product_hits = active_products[: min(limit, 5)]
    else:
        scored = []
        for item in active_products:
            text = _product_search_text(item)
            name = str(item.get("name", "")).lower()
            category_name = str(item.get("category_name") or _mapping_or_empty(item.get("category_detail")).get("name", "")).lower()
            vendor_name = str(item.get("vendor_name") or _mapping_or_empty(item.get("vendor_detail")).get("brand_name", "")).lower()
            if query not in text:
                continue
            score = 0
            if name.startswith(query):
                score += 50
            if query in name:
                score += 30
            if query in category_name:
                score += 16
            if query in vendor_name:
                score += 12
            score += int(item.get("popularity", 0) or 0) / 10
            scored.append((score, item))
        scored.sort(key=lambda entry: entry[0], reverse=True)
        product_hits = [item for _, item in scored[: min(limit, 5)]]

    categories = {}
    vendors = {}
    for item in active_products:
        category = _mapping_or_empty(item.get("category_detail"))
        category_name = item.get("category_name") or category.get("name", "")
        category_slug = category.get("slug", "")
        vendor = _mapping_or_empty(item.get("vendor_detail"))
        vendor_name = item.get("vendor_name") or vendor.get("brand_name", "")
        vendor_slug = vendor.get("slug", "")
        product_text = _product_search_text(item)
        if query and query not in product_text and query not in category_name.lower() and query not in vendor_name.lower():
            continue
        if category_name:
            key = category_slug or category_name.lower()
            categories.setdefault(key, {"type": "category", "label": category_name, "slug": category_slug, "count": 0})
            categories[key]["count"] += 1
        if vendor_name:
            key = vendor_slug or vendor_name.lower()
            vendors.setdefault(key, {"type": "vendor", "label": vendor_name, "slug": vendor_slug, "count": 0})
            vendors[key]["count"] += 1

    product_results = [
        {
            "type": "product",
            "id": item.get("id"),
            "label": item.get("name", ""),
            "slug": item.get("slug", ""),
            "image": item.get("main_image") or item.get("external_image_url", ""),
            "price": item.get("discount_price") or item.get("price"),
            "category": item.get("category_name") or _mapping_or_empty(item.get("category_detail")).get("name", ""),
            "vendor": item.get("vendor_name") or _mapping_or_empty(item.get("vendor_detail")).get("brand_name", ""),
        }
        for item in product_hits
    ]
    category_results = sorted(categories.values(), key=lambda item: item["count"], reverse=True)[:3]
    vendor_results = sorted(vendors.values(), key=lambda item: item["count"], reverse=True)[:3]
    popular_terms = ["kurta", "suit", "dress", "blazer", "wedding", "cotton", "silk"]

    return {
        "query": query,
        "products": product_results,
        "categories": category_results,
        "vendors": vendor_results,
        "popular": popular_terms,
        "total": len(product_results) + len(category_results) + len(vendor_results),
    }


def create_product(data, vendor_document, category_document):
    now = utcnow()
    name = data["name"]
    document = {
        "id": next_sequence("products"),
        "vendor": vendor_document["id"],
        "vendor_detail": clean_document(vendor_document),
        "vendor_name": vendor_document.get("brand_name", ""),
        "category": category_document["id"],
        "category_detail": category_summary(category_document),
        "category_name": category_document.get("name", ""),
        "name": name,
        "slug": _ensure_unique_slug(products_collection(), slugify(name) or "product"),
        "description": data.get("description", ""),
        "price": data.get("price", 0),
        "discount_price": data.get("discount_price"),
        "stock": data.get("stock", 0),
        "sizes": data.get("sizes", []),
        "colors": data.get("colors", []),
        "fabric_options": data.get("fabric_options", []),
        "product_type": data.get("product_type", "ready_made"),
        "is_customizable": data.get("is_customizable", False),
        "sustainability_guidance": data.get("sustainability_guidance", ""),
        "customization_note": data.get("customization_note", ""),
        "badge": data.get("badge", ""),
        "rating": data.get("rating", 0),
        "reviews_count": data.get("reviews_count", 0),
        "popularity": data.get("popularity", 0),
        "is_featured": data.get("is_featured", False),
        "is_new_arrival": data.get("is_new_arrival", False),
        "is_active": data.get("is_active", True),
        "main_image": data.get("main_image", ""),
        "external_image_url": data.get("external_image_url", ""),
        "images": data.get("images", []),
        "created_at": now,
        "updated_at": now,
    }
    mongo_document = prepare_document_for_mongo(document)
    products_collection().insert_one(mongo_document)
    return _decorate_product_sustainability(_normalize_product_vendor(mongo_document))


def update_product(product_id, data, vendor_document=None, category_document=None):
    product = get_product_by_id(product_id)
    if not product:
        return None
    updates = {key: data[key] for key in (
        "name", "description", "price", "discount_price", "stock", "sizes", "colors", "fabric_options", "badge",
        "product_type", "is_customizable", "sustainability_guidance", "customization_note", "rating", "reviews_count", "popularity", "is_featured", "is_new_arrival", "is_active", "main_image", "external_image_url", "images"
    ) if key in data}
    if "name" in updates:
        updates["slug"] = _ensure_unique_slug(products_collection(), slugify(updates["name"]) or product["slug"], exclude_id=product["id"])
    if vendor_document is not None:
        updates["vendor"] = vendor_document["id"]
        updates["vendor_detail"] = clean_document(vendor_document)
        updates["vendor_name"] = vendor_document.get("brand_name", "")
    if category_document is not None:
        updates["category"] = category_document["id"]
        updates["category_detail"] = category_summary(category_document)
        updates["category_name"] = category_document.get("name", "")
    updates["updated_at"] = utcnow()
    products_collection().update_one({"id": product["id"]}, {"$set": prepare_document_for_mongo(updates)})
    return get_product_by_id(product["id"])


def delete_product(product_id):
    products_collection().delete_one({"id": int(product_id)})


def update_product_review_stats(product_id):
    from apps.reviews.repository import list_reviews

    reviews = list_reviews(product_id=product_id)
    count = len(reviews)
    rating = round(sum(float(item["rating"]) for item in reviews) / count, 2) if count else 0
    products_collection().update_one({"id": int(product_id)}, {"$set": prepare_document_for_mongo({"reviews_count": count, "rating": rating})})
