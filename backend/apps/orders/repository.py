from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from django.utils import timezone

from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


RETURN_WINDOW_DAYS = 14
RETURN_ELIGIBLE_ORDER_STATUSES = {"delivered", "completed"}
RETURN_MANAGED_STATUSES = {
    "pending",
    "under_review",
    "approved_refund",
    "approved_exchange",
    "approved_voucher",
    "rejected",
    "more_info_requested",
    "completed",
    "cancelled",
}


def carts_collection():
    return get_collection("carts")


def wishlists_collection():
    return get_collection("wishlists")


def orders_collection():
    return get_collection("orders")


def return_requests_collection():
    return get_collection("return_requests")


def vouchers_collection():
    return get_collection("vouchers")


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _parse_datetime(value):
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        try:
            value = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        except ValueError:
            return None
    elif not isinstance(value, datetime):
        return None
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _same_id(left, right):
    if left is None or right is None:
        return False
    try:
        return int(left) == int(right)
    except (TypeError, ValueError):
        return str(left) == str(right)


def _normalized_product_snapshot(product):
    if not product:
        return None
    snapshot = clean_document(product) or {}
    vendor_detail = clean_document(snapshot.get("vendor_detail")) if snapshot.get("vendor_detail") else None
    snapshot["vendor_detail"] = vendor_detail
    snapshot["vendor_name"] = snapshot.get("vendor_name") or (vendor_detail or {}).get("brand_name", "")
    snapshot["vendor"] = snapshot.get("vendor") or (vendor_detail or {}).get("id")
    return snapshot


def _user_summary(user):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
    }


def _order_item_vendor_user(item):
    vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
    product_detail = _mapping_or_empty(item.get("product_detail"))
    product_vendor_detail = _mapping_or_empty(product_detail.get("vendor_detail"))
    return item.get("vendor_user") or vendor_detail.get("user") or product_vendor_detail.get("user")


def _order_item_vendor_id(item):
    vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
    product_detail = _mapping_or_empty(item.get("product_detail"))
    return item.get("vendor") or vendor_detail.get("id") or product_detail.get("vendor")


def _order_matches_vendor(order, *, vendor_user_id=None, vendor_id=None):
    if vendor_user_id and any(_same_id(vendor_user_id, item) for item in order.get("vendor_user_ids", [])):
        return True
    if vendor_id and any(_same_id(vendor_id, item) for item in order.get("vendor_ids", [])):
        return True
    return any(
        (vendor_user_id and _same_id(_order_item_vendor_user(item), vendor_user_id))
        or (vendor_id and _same_id(_order_item_vendor_id(item), vendor_id))
        for item in order.get("items", [])
    )


def _item_matches_vendor(item, *, vendor_user_id=None, vendor_id=None):
    return _order_matches_vendor({"items": [item], "vendor_user_ids": [item.get("vendor_user")]}, vendor_user_id=vendor_user_id, vendor_id=vendor_id)


def _resolve_vendor_detail_from_item(item):
    vendor_detail = clean_document(_mapping_or_empty(item.get("vendor_detail")))
    if vendor_detail:
        return vendor_detail

    product_detail = clean_document(_mapping_or_empty(item.get("product_detail")))
    product_vendor_detail = clean_document(_mapping_or_empty(product_detail.get("vendor_detail")))
    if product_vendor_detail:
        return product_vendor_detail

    vendor_id = _order_item_vendor_id(item)
    if vendor_id:
        from apps.vendors.repository import get_vendor_by_id

        vendor = get_vendor_by_id(vendor_id)
        if vendor:
            return clean_document(vendor)

    vendor_user_id = _order_item_vendor_user(item)
    if vendor_user_id:
        from apps.vendors.repository import get_vendor_by_user_id

        vendor = get_vendor_by_user_id(vendor_user_id)
        if vendor:
            return clean_document(vendor)

    from apps.vendors.repository import vendors_collection

    fallback_vendor = vendors_collection().find_one({"approval_status": "approved"}, sort=[("id", 1)])
    return clean_document(fallback_vendor) if fallback_vendor else None


def _order_return_anchor(order):
    tracking_updates = clean_document(order.get("tracking_updates", []))
    eligible_updates = [
        update
        for update in tracking_updates
        if str(update.get("status", "")).lower() in RETURN_ELIGIBLE_ORDER_STATUSES and _parse_datetime(update.get("timestamp"))
    ]
    if eligible_updates:
        latest = max(eligible_updates, key=lambda update: _parse_datetime(update.get("timestamp")))
        return _parse_datetime(latest.get("timestamp"))
    return _parse_datetime(order.get("created_at"))


def _return_deadline_for_order(order):
    anchor = _order_return_anchor(order)
    if not anchor:
        return None
    return anchor + timedelta(days=RETURN_WINDOW_DAYS)


def _is_return_window_open(order, *, now=None):
    now = _parse_datetime(now or utcnow())
    deadline = _return_deadline_for_order(order)
    return bool(deadline and now <= deadline)


def _build_cart_item(product, quantity, size="", color=""):
    return {
        "id": next_sequence("cart_items"),
        "product": product["id"],
        "product_detail": _normalized_product_snapshot(product),
        "quantity": quantity,
        "size": size,
        "color": color,
        "created_at": utcnow(),
    }


def list_cart_items(user_id):
    cart = carts_collection().find_one({"user_id": int(user_id)}) or {"items": []}
    return clean_document(cart.get("items", []))


def add_cart_item(user, product, quantity, size="", color=""):
    cart = carts_collection().find_one({"user_id": user.id})
    items = clean_document(cart.get("items", [])) if cart else []
    for item in items:
        if item["product"] == product["id"] and item.get("size", "") == size and item.get("color", "") == color:
            item["quantity"] += quantity
            if item["quantity"] > int(product.get("stock", 0)):
                raise ValueError(f"Only {product.get('stock', 0)} item(s) are available right now.")
            carts_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)
            return item
    item = _build_cart_item(product, quantity, size=size, color=color)
    items.append(item)
    carts_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)
    return item


def update_cart_item(user, item_id, quantity):
    cart = carts_collection().find_one({"user_id": user.id}) or {"items": []}
    items = clean_document(cart.get("items", []))
    for item in items:
        if item["id"] == int(item_id):
            stock = int(item.get("product_detail", {}).get("stock", 0))
            if quantity > stock:
                raise ValueError(f"Only {stock} item(s) are available right now.")
            item["quantity"] = quantity
            carts_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)
            return item
    return None


def remove_cart_item(user, item_id):
    cart = carts_collection().find_one({"user_id": user.id}) or {"items": []}
    items = [item for item in clean_document(cart.get("items", [])) if item["id"] != int(item_id)]
    carts_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)


def list_wishlist_items(user_id):
    wishlist = wishlists_collection().find_one({"user_id": int(user_id)}) or {"items": []}
    return clean_document(wishlist.get("items", []))


def add_wishlist_item(user, product):
    wishlist = wishlists_collection().find_one({"user_id": user.id}) or {"items": []}
    items = clean_document(wishlist.get("items", []))
    for item in items:
        if item["product"] == product["id"]:
            return item
    item = {
        "id": next_sequence("wishlist_items"),
        "product": product["id"],
        "product_detail": clean_document(product),
        "created_at": utcnow(),
    }
    items.append(item)
    wishlists_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)
    return item


def remove_wishlist_item(user, item_id):
    wishlist = wishlists_collection().find_one({"user_id": user.id}) or {"items": []}
    items = [item for item in clean_document(wishlist.get("items", [])) if item["id"] != int(item_id)]
    wishlists_collection().update_one({"user_id": user.id}, {"$set": {"items": items}}, upsert=True)


def _make_tracking_update(status_value, note):
    return {
        "id": next_sequence("tracking_updates"),
        "status": status_value,
        "note": note,
        "timestamp": utcnow(),
    }


def _create_order_notification(order, *, event_key, title, body):
    from apps.notifications.repository import create_notification

    create_notification(
        user_id=order["user_id"],
        title=title,
        body=body,
        kind="order",
        event_key=event_key,
        entity_type="order",
        entity_id=order["id"],
        action_url=f"/track-order?order={order['id']}",
        metadata={"order_number": order.get("order_number", "")},
    )


def _create_order_routing_notifications(order):
    from apps.accounts.repository import list_users
    from apps.notifications.repository import create_notification

    for vendor_user_id in order.get("vendor_user_ids", []):
        create_notification(
            user_id=vendor_user_id,
            title="New Vendor Order",
            body=f"Order {order.get('order_number', '')} includes item(s) from your shop.",
            kind="order",
            event_key="vendor_order_created",
            entity_type="order",
            entity_id=order["id"],
            action_url="/dashboard/vendor/orders",
            metadata={"order_number": order.get("order_number", "")},
        )

    for admin in [user for user in list_users() if user.get("role") in {"admin", "super_admin"}]:
        create_notification(
            user_id=admin["id"],
            title="New Marketplace Order",
            body=f"Order {order.get('order_number', '')} was placed.",
            kind="order",
            event_key="admin_order_created",
            entity_type="order",
            entity_id=order["id"],
            action_url="/dashboard/admin/orders",
            metadata={"order_number": order.get("order_number", "")},
        )


def _notify_order_status(order, status_value):
    normalized = str(status_value or "").lower()
    if normalized == "completed":
        _create_order_notification(
            order,
            event_key="order_ready",
            title="Order Ready",
            body=f"Your order {order.get('order_number', '')} is ready for handoff or delivery.",
        )
    elif normalized == "delivered":
        _create_order_notification(
            order,
            event_key="order_delivered",
            title="Order Delivered",
            body=f"Your order {order.get('order_number', '')} has been marked as delivered.",
        )


def _build_order_item(item_data, product=None):
    from apps.vendors.repository import get_vendor_by_id

    product_detail = _normalized_product_snapshot(product)
    vendor_detail = clean_document(product_detail.get("vendor_detail")) if product_detail else None
    vendor_id = (vendor_detail or {}).get("id") or item_data.get("vendor")
    if vendor_id and not vendor_detail:
        vendor_detail = clean_document(get_vendor_by_id(vendor_id))
    if not vendor_detail and item_data.get("vendor_user"):
        from apps.vendors.repository import get_vendor_by_user_id

        vendor_detail = clean_document(get_vendor_by_user_id(item_data.get("vendor_user")))
        vendor_id = (vendor_detail or {}).get("id") or vendor_id
    if not vendor_detail:
        from apps.vendors.repository import vendors_collection

        vendor_detail = clean_document(vendors_collection().find_one({"approval_status": "approved"}, sort=[("id", 1)]))
        vendor_id = (vendor_detail or {}).get("id") or vendor_id
    vendor_user_id = (vendor_detail or {}).get("user") or item_data.get("vendor_user")
    vendor_name = (vendor_detail or {}).get("brand_name", "") or item_data.get("vendor_name", "")
    product_type = item_data.get("product_type") or (product_detail or {}).get("product_type") or "ready_made"
    is_customized = bool(item_data.get("is_customized")) or bool(item_data.get("customization_request_id"))
    order_type = "custom" if is_customized else "ready_made"
    commission_rate = Decimal("0.15") if is_customized else Decimal("0.10")
    quantity = int(item_data["quantity"])
    unit_price = Decimal(str(item_data["price"]))
    item_subtotal = unit_price * quantity
    platform_commission = (item_subtotal * commission_rate).quantize(Decimal("0.01"))
    vendor_payout_amount = (item_subtotal - platform_commission).quantize(Decimal("0.01"))
    return {
        "id": next_sequence("order_items"),
        "product": product["id"] if product else None,
        "product_id": product["id"] if product else item_data.get("product"),
        "product_name": item_data.get("product_name") or (product.get("name") if product else ""),
        "product_detail": product_detail,
        "vendor": vendor_id,
        "vendor_id": vendor_id,
        "vendor_detail": vendor_detail,
        "vendor_user": vendor_user_id,
        "vendor_user_id": vendor_user_id,
        "vendor_name": vendor_name,
        "quantity": quantity,
        "size": item_data.get("size", ""),
        "color": item_data.get("color", ""),
        "price": unit_price,
        "product_type": product_type,
        "order_type": order_type,
        "is_customized": is_customized,
        "item_subtotal": item_subtotal,
        "commission_rate": commission_rate,
        "platform_commission": platform_commission,
        "vendor_payout_amount": vendor_payout_amount,
        "payout_status": "on_hold",
        "customization_request_id": item_data.get("customization_request_id"),
    }


def _validate_order_item_payload(item_data):
    if not item_data.get("quantity"):
        raise ValueError("Each order item must include quantity.")
    if item_data.get("price") in (None, ""):
        raise ValueError("Each order item must include price.")
    if not item_data.get("product") and not item_data.get("product_name"):
        raise ValueError("Each order item must include a product or product_name.")


def create_order(user, validated_data):
    items_data = validated_data["items"]
    if not items_data:
        raise ValueError("At least one order item is required.")

    from apps.products.repository import get_product_by_id

    shipping_fee = Decimal(str(validated_data.get("shipping_fee", 0) or 0))
    order_items = []
    subtotal = Decimal("0")
    vendor_user_ids = set()
    for item in items_data:
        _validate_order_item_payload(item)
        product = get_product_by_id(item.get("product")) if item.get("product") else None
        order_item = _build_order_item(item, product=product)
        subtotal += Decimal(str(order_item["price"])) * int(order_item["quantity"])
        if order_item.get("vendor_user"):
            vendor_user_ids.add(order_item["vendor_user"])
        order_items.append(order_item)

    order_id = next_sequence("orders")
    total = Decimal(str(validated_data.get("total", subtotal + shipping_fee)))
    vendor_ids = sorted({item.get("vendor") for item in order_items if item.get("vendor") is not None})
    item_order_types = {item.get("order_type", "ready_made") for item in order_items}
    order_type = item_order_types.pop() if len(item_order_types) == 1 else "mixed"
    document = {
        "id": order_id,
        "order_number": f"SL-{order_id:05d}",
        "user_id": user.id,
        "customer_id": user.id,
        "user_detail": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
        "full_name": validated_data["full_name"],
        "phone": validated_data["phone"],
        "email": validated_data["email"],
        "shipping_address": validated_data["shipping_address"],
        "city": validated_data["city"],
        "province": validated_data.get("province", ""),
        "postal_code": validated_data.get("postal_code", ""),
        "billing_address": validated_data.get("billing_address", ""),
        "delivery_option": validated_data.get("delivery_option", ""),
        "payment_method": validated_data["payment_method"],
        "payment_status": "pending",
        "subtotal": subtotal,
        "shipping_fee": shipping_fee,
        "total": total,
        "status": "pending",
        "order_type": order_type,
        "estimated_delivery": validated_data.get("estimated_delivery"),
        "billing_detail": None,
        "payment_record": None,
        "items": order_items,
        "tracking_updates": [_make_tracking_update("pending", "Order placed successfully.")],
        "vendor_user_ids": list(vendor_user_ids),
        "vendor_ids": vendor_ids,
        "vendor_id": vendor_ids[0] if len(vendor_ids) == 1 else None,
        "payout_status": "on_hold",
        "created_at": utcnow(),
    }
    mongo_document = prepare_document_for_mongo(document)
    orders_collection().insert_one(mongo_document)
    created = clean_document(mongo_document)
    _create_order_notification(
        created,
        event_key="order_placed",
        title="Order Placed",
        body=f"Your order {created.get('order_number', '')} was placed successfully.",
    )
    _create_order_routing_notifications(created)
    return created


def list_orders(user):
    documents = [clean_document(document) for document in orders_collection().find({})]
    if user.role in {"admin", "super_admin"}:
        return documents
    if user.role == "vendor":
        from apps.vendors.repository import get_vendor_by_user_id

        vendor = get_vendor_by_user_id(user.id)
        vendor_id = vendor.get("id") if vendor else None
        return [document for document in documents if _order_matches_vendor(document, vendor_user_id=user.id, vendor_id=vendor_id)]
    return [document for document in documents if document.get("user_id") == user.id]


def get_order_by_id(order_id):
    try:
        order_id = int(order_id)
    except (TypeError, ValueError):
        return None
    return orders_collection().find_one({"id": order_id})


def get_order_for_user(user, order_id):
    order = get_order_by_id(order_id)
    if not order:
        return None
    if user.role in {"admin", "super_admin"}:
        return clean_document(order)
    if user.role == "vendor":
        from apps.vendors.repository import get_vendor_by_user_id

        vendor = get_vendor_by_user_id(user.id)
        vendor_id = vendor.get("id") if vendor else None
        if _order_matches_vendor(order, vendor_user_id=user.id, vendor_id=vendor_id):
            return clean_document(order)
    if order.get("user_id") == user.id:
        return clean_document(order)
    return None


def list_tracking_updates(user):
    updates = []
    for order in list_orders(user):
        updates.extend(order.get("tracking_updates", []))
    updates.sort(key=lambda item: item.get("timestamp"))
    return updates


def find_tracking_update(user, tracking_id):
    tracking_id = int(tracking_id)
    for order in list_orders(user):
        for update in order.get("tracking_updates", []):
            if update["id"] == tracking_id:
                return update
    return None


def update_order_after_payment(order_id, *, payment_status=None, status_value=None, billing_detail=None, payment_record=None):
    current_order = clean_document(get_order_by_id(order_id)) or {}
    updates = {}
    if payment_status is not None:
        updates["payment_status"] = payment_status
    if status_value is not None:
        updates["status"] = status_value
    if billing_detail is not None:
        updates["billing_detail"] = billing_detail
    if payment_record is not None:
        updates["payment_record"] = payment_record
    if status_value in {"completed", "delivered"}:
        updated_items = []
        for item in current_order.get("items", []):
            next_item = {**item}
            if item.get("payout_status") in {"on_hold", "pending"}:
                next_item["payout_status"] = "eligible"
            updated_items.append(next_item)
        updates["items"] = updated_items
        updates["payout_status"] = "eligible"
    if updates:
        orders_collection().update_one({"id": int(order_id)}, {"$set": prepare_document_for_mongo(updates)})
    updated = clean_document(get_order_by_id(order_id))
    if status_value and current_order.get("status") != status_value:
        _notify_order_status(updated, status_value)
    return updated


def append_tracking_update(order_id, status_value, note):
    order = get_order_by_id(order_id)
    if not order:
        return None
    updates = clean_document(order.get("tracking_updates", []))
    entry = _make_tracking_update(status_value, note)
    updates.append(entry)
    orders_collection().update_one({"id": order["id"]}, {"$set": prepare_document_for_mongo({"tracking_updates": updates})})
    if str(order.get("status", "")).lower() != str(status_value or "").lower():
        status_updates = {"status": status_value}
        if str(status_value or "").lower() in {"completed", "delivered"}:
            next_items = []
            for item in clean_document(order.get("items", [])):
                next_item = {**item}
                if next_item.get("payout_status") in {"on_hold", "pending"}:
                    next_item["payout_status"] = "eligible"
                next_items.append(next_item)
            status_updates["items"] = next_items
            status_updates["payout_status"] = "eligible"
        orders_collection().update_one({"id": order["id"]}, {"$set": prepare_document_for_mongo(status_updates)})
        order = get_order_by_id(order_id)
    _notify_order_status(clean_document(order), status_value)
    return entry


def vendor_update_order_status(user, order_id, status_value, note=""):
    order = get_order_for_user(user, order_id)
    if not order or user.role != "vendor":
        return None
    normalized = str(status_value or "").lower()
    allowed_statuses = {"pending", "processing", "ready", "completed", "delivered"}
    if normalized not in allowed_statuses:
        raise ValueError("Unsupported order status.")
    entry = append_tracking_update(order["id"], normalized, note or f"Vendor updated order status to {normalized}.")
    return get_order_for_user(user, order["id"]), entry


def get_order_item_for_user(user, order_id, order_item_id):
    order = get_order_for_user(user, order_id)
    if not order:
        return None, None
    for item in order.get("items", []):
        if item.get("id") == int(order_item_id):
            return order, item
    return order, None


def _return_request_accessible(user, document):
    if user.role in {"admin", "super_admin"}:
        return True
    if user.role == "vendor":
        return document.get("vendor_user_id") == user.id
    return document.get("user_id") == user.id


def _voucher_accessible(user, document):
    if user.role in {"admin", "super_admin"}:
        return True
    return document.get("user_id") == user.id


def list_return_requests(user):
    documents = [clean_document(document) for document in return_requests_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    return [document for document in documents if _return_request_accessible(user, document)]


def get_return_request_for_user(user, return_request_id):
    try:
        return_request_id = int(return_request_id)
    except (TypeError, ValueError):
        return None
    document = return_requests_collection().find_one({"id": return_request_id})
    if not document:
        return None
    document = clean_document(document)
    return document if _return_request_accessible(user, document) else None


def _get_return_request_by_id(return_request_id):
    try:
        return_request_id = int(return_request_id)
    except (TypeError, ValueError):
        return None
    document = return_requests_collection().find_one({"id": return_request_id})
    return clean_document(document) if document else None


def _build_return_history_entry(actor, status_value, note):
    return {
        "id": next_sequence("return_request_updates"),
        "status": status_value,
        "note": note,
        "actor": _user_summary(actor),
        "created_at": utcnow(),
    }


def create_return_request(user, validated_data):
    order, item = get_order_item_for_user(user, validated_data["order"], validated_data["order_item"])
    if not order or not item:
        raise ValueError("Eligible delivered order item not found.")
    if str(order.get("status", "")).lower() not in RETURN_ELIGIBLE_ORDER_STATUSES:
        raise ValueError("Only delivered orders are eligible for returns.")
    if not _is_return_window_open(order):
        raise ValueError(f"Return period expired. Returns must be requested within {RETURN_WINDOW_DAYS} days of delivery.")
    existing = return_requests_collection().find_one({"order": order["id"], "order_item": item["id"], "user_id": user.id})
    if existing:
        existing = clean_document(existing)
        if str(existing.get("status", "")).lower() != "cancelled":
            raise ValueError("A return request already exists for this order item.")

    requested_resolution = validated_data["requested_resolution"]
    amount = Decimal(str(item.get("price", 0) or 0)) * int(item.get("quantity", 0) or 0)
    note = f"Return request created with requested resolution: {requested_resolution.replace('_', ' ')}."
    vendor_detail = _resolve_vendor_detail_from_item(item)
    vendor_user_id = _order_item_vendor_user(item) or (vendor_detail or {}).get("user")
    document = {
        "id": next_sequence("return_requests"),
        "order": order["id"],
        "order_number": order.get("order_number", ""),
        "order_item": item["id"],
        "user_id": user.id,
        "user_detail": _user_summary(user),
        "vendor_user_id": vendor_user_id,
        "vendor_detail": vendor_detail,
        "product": item.get("product"),
        "product_name": item.get("product_name") or _mapping_or_empty(item.get("product_detail")).get("name", ""),
        "product_detail": clean_document(item.get("product_detail")) if item.get("product_detail") else None,
        "quantity": item.get("quantity", 0),
        "amount": amount,
        "reason": validated_data["reason"],
        "description": validated_data.get("description", ""),
        "image_proof": validated_data.get("image_proof", ""),
        "requested_resolution": requested_resolution,
        "return_window_days": RETURN_WINDOW_DAYS,
        "eligible_until": _return_deadline_for_order(order),
        "status": "pending",
        "vendor_note": "",
        "decision_resolution": "",
        "voucher_id": None,
        "history": [_build_return_history_entry(user, "pending", note)],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    return_requests_collection().insert_one(prepare_document_for_mongo(document))
    return clean_document(document)


def _create_voucher_for_return(document, actor):
    existing_voucher_id = document.get("voucher_id")
    if existing_voucher_id:
        voucher = vouchers_collection().find_one({"id": int(existing_voucher_id)})
        return clean_document(voucher) if voucher else None

    voucher_id = next_sequence("vouchers")
    amount = Decimal(str(document.get("amount", 0) or 0))
    voucher = {
        "id": voucher_id,
        "user_id": document["user_id"],
        "user_detail": document.get("user_detail"),
        "return_request": document["id"],
        "order": document["order"],
        "order_number": document.get("order_number", ""),
        "amount": amount,
        "balance": amount,
        "status": "active",
        "kind": "store_credit",
        "note": f"Store credit issued from return request #{document['id']}.",
        "history": [
            {
                "id": next_sequence("voucher_history"),
                "type": "issued",
                "amount": amount,
                "note": f"Voucher issued by {actor.full_name or actor.email}.",
                "created_at": utcnow(),
            }
        ],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    vouchers_collection().insert_one(prepare_document_for_mongo(voucher))
    return_requests_collection().update_one({"id": document["id"]}, {"$set": {"voucher_id": voucher_id, "updated_at": utcnow()}})
    return clean_document(voucher)


def update_return_request(user, return_request_id, updates):
    document = get_return_request_for_user(user, return_request_id)
    if not document:
        return None
    next_status = updates.get("status", document.get("status"))
    if next_status not in RETURN_MANAGED_STATUSES:
        raise ValueError("Unsupported return request status.")
    current_status = str(document.get("status", "")).lower()
    if current_status == "cancelled":
        raise ValueError("Cancelled return requests cannot be updated.")

    payload = {}
    if "status" in updates:
        payload["status"] = next_status
    if "vendor_note" in updates:
        payload["vendor_note"] = updates["vendor_note"]
    if "decision_resolution" in updates:
        payload["decision_resolution"] = updates["decision_resolution"]
    payload["updated_at"] = utcnow()

    history = clean_document(document.get("history", []))
    if "status" in updates or "vendor_note" in updates:
        note = updates.get("vendor_note") or f"Return request updated to {next_status.replace('_', ' ')}."
        history.append(_build_return_history_entry(user, next_status, note))
        payload["history"] = history

    return_requests_collection().update_one({"id": document["id"]}, {"$set": prepare_document_for_mongo(payload)})
    updated = _get_return_request_by_id(document["id"])
    if next_status == "approved_voucher":
        _create_voucher_for_return(updated, user)
        updated = _get_return_request_by_id(document["id"])
    return updated


def cancel_return_request(user, return_request_id):
    document = get_return_request_for_user(user, return_request_id)
    if not document:
        return None
    if document.get("user_id") != user.id:
        raise ValueError("Only the customer who created the return request can cancel it.")
    if str(document.get("status", "")).lower() != "pending":
        raise ValueError("Only pending return requests can be cancelled.")

    history = clean_document(document.get("history", []))
    history.append(_build_return_history_entry(user, "cancelled", "Customer cancelled the pending return request."))
    payload = {
        "status": "cancelled",
        "updated_at": utcnow(),
        "history": history,
    }
    return_requests_collection().update_one({"id": document["id"]}, {"$set": prepare_document_for_mongo(payload)})
    return _get_return_request_by_id(document["id"])


def list_vouchers(user):
    documents = [clean_document(document) for document in vouchers_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    return [document for document in documents if _voucher_accessible(user, document)]
