from decimal import Decimal
from statistics import mean

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole, IsSuperAdminRole, IsTailorOrAdmin, IsVendorOrAdmin
from apps.accounts.repository import list_users
from apps.chats.repository import list_conversations
from apps.orders.repository import list_orders, list_return_requests, list_wishlist_items
from apps.payments.repository import list_payments
from apps.products.repository import list_products
from apps.reviews.repository import list_reviews
from apps.support.repository import list_support_messages
from apps.tailoring.repository import list_tailoring_requests
from apps.vendors.repository import get_vendor_by_user_id, list_vendor_applications, list_vendors
from common.mongo import clean_document, get_collection, prepare_document_for_mongo, utcnow


PLATFORM_SETTINGS_ID = "platform_settings"
DEFAULT_PLATFORM_SETTINGS = {
    "id": PLATFORM_SETTINGS_ID,
    "commission_rates": {
        "customized": 0.15,
        "ready_made": 0.10,
    },
    "return_policy": "Return requests are reviewed by the responsible seller and monitored by admins.",
    "platform_config": {
        "maintenance_mode": False,
        "support_email": "support@slessaa.com",
    },
}


def _platform_settings_collection():
    return get_collection("platform_settings")


def get_platform_settings():
    document = _platform_settings_collection().find_one({"id": PLATFORM_SETTINGS_ID})
    if not document:
        now = utcnow()
        document = {
            **DEFAULT_PLATFORM_SETTINGS,
            "created_at": now,
            "updated_at": now,
        }
        _platform_settings_collection().insert_one(prepare_document_for_mongo(document))
    cleaned = clean_document(document)
    cleaned.setdefault("commission_rates", DEFAULT_PLATFORM_SETTINGS["commission_rates"].copy())
    cleaned.setdefault("return_policy", DEFAULT_PLATFORM_SETTINGS["return_policy"])
    cleaned.setdefault("platform_config", DEFAULT_PLATFORM_SETTINGS["platform_config"].copy())
    return cleaned


def _parse_commission_rate(value, field_name):
    rate = float(value)
    if rate < 0 or rate > 1:
        raise ValueError(f"{field_name} commission rate must be between 0 and 1.")
    return rate


def update_platform_settings(payload):
    current = get_platform_settings()
    commission_rates = {
        **DEFAULT_PLATFORM_SETTINGS["commission_rates"],
        **_mapping_or_empty(current.get("commission_rates")),
        **_mapping_or_empty(payload.get("commission_rates")),
    }
    platform_config = {
        **DEFAULT_PLATFORM_SETTINGS["platform_config"],
        **_mapping_or_empty(current.get("platform_config")),
        **_mapping_or_empty(payload.get("platform_config")),
    }
    updates = {
        "commission_rates": {
            "customized": _parse_commission_rate(commission_rates.get("customized"), "Customized"),
            "ready_made": _parse_commission_rate(commission_rates.get("ready_made"), "Ready-made"),
        },
        "return_policy": payload.get("return_policy", current.get("return_policy") or DEFAULT_PLATFORM_SETTINGS["return_policy"]),
        "platform_config": {
            "maintenance_mode": bool(platform_config.get("maintenance_mode", False)),
            "support_email": platform_config.get("support_email") or DEFAULT_PLATFORM_SETTINGS["platform_config"]["support_email"],
        },
        "updated_at": utcnow(),
    }
    _platform_settings_collection().update_one(
        {"id": PLATFORM_SETTINGS_ID},
        {"$set": prepare_document_for_mongo(updates), "$setOnInsert": {"id": PLATFORM_SETTINGS_ID, "created_at": utcnow()}},
        upsert=True,
    )
    return get_platform_settings()


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _item_matches_vendor(item, *, vendor_user_id, vendor_id):
    vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
    product_detail = _mapping_or_empty(item.get("product_detail"))
    product_vendor_detail = _mapping_or_empty(product_detail.get("vendor_detail"))
    item_vendor_user = item.get("vendor_user") or vendor_detail.get("user") or product_vendor_detail.get("user")
    item_vendor_id = item.get("vendor") or vendor_detail.get("id") or product_detail.get("vendor")
    return item_vendor_user == vendor_user_id or (vendor_id is not None and item_vendor_id == vendor_id)


def _order_counts_for_revenue(order):
    payment_status = str(order.get("payment_status") or "").lower()
    order_status = str(order.get("status") or "").lower()
    payment_method = str(order.get("payment_method") or "").lower()
    if payment_status == "failed":
        return False
    if payment_status == "paid":
        return True
    return payment_method == "cod" and order_status in {"completed", "delivered"}


def _decimal_to_float(value):
    return float(value or 0)


def _month_key(value):
    if not value:
        return "Unknown"
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m")
    text = str(value)
    return text[:7] if len(text) >= 7 else "Unknown"


def _increment_bucket(buckets, key, field, amount=1):
    entry = buckets.setdefault(key, {"period": key})
    entry[field] = entry.get(field, 0) + amount
    return entry


def _status_breakdown(orders):
    counts = {}
    for order in orders:
        status_value = str(order.get("status") or "unknown").lower()
        counts[status_value] = counts.get(status_value, 0) + 1
    return [{"status": key, "count": value} for key, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


def _top_products_from_orders(orders, *, limit=5, vendor_user_id=None, vendor_id=None):
    leaderboard = {}
    for order in orders:
        for item in order.get("items", []):
            if vendor_user_id is not None and not _item_matches_vendor(item, vendor_user_id=vendor_user_id, vendor_id=vendor_id):
                continue
            product_id = item.get("product") or item.get("id")
            entry = leaderboard.setdefault(
                product_id,
                {
                    "product_id": product_id,
                    "product_name": item.get("product_name") or _mapping_or_empty(item.get("product_detail")).get("name", "Product"),
                    "quantity_sold": 0,
                    "revenue": Decimal("0"),
                    "orders_count": 0,
                },
            )
            quantity = int(item.get("quantity", 0) or 0)
            entry["quantity_sold"] += quantity
            entry["orders_count"] += 1
            entry["revenue"] += Decimal(str(item.get("price", 0) or 0)) * quantity
    ranked = sorted(
        leaderboard.values(),
        key=lambda item: (item["quantity_sold"], item["revenue"], item["orders_count"]),
        reverse=True,
    )[:limit]
    return [{**item, "revenue": _decimal_to_float(item["revenue"])} for item in ranked]


def _top_vendors_from_orders(orders, *, limit=5):
    leaderboard = {}
    vendor_records = {vendor.get("id"): vendor for vendor in list_vendors()}
    for order in orders:
        for item in order.get("items", []):
            vendor_detail = _mapping_or_empty(item.get("vendor_detail"))
            vendor_id = item.get("vendor") or vendor_detail.get("id")
            entry = leaderboard.setdefault(
                vendor_id,
                {
                    "vendor_id": vendor_id,
                    "vendor_name": item.get("vendor_name") or vendor_detail.get("brand_name") or _mapping_or_empty(vendor_records.get(vendor_id)).get("brand_name") or "Vendor",
                    "sales_count": 0,
                    "revenue": Decimal("0"),
                },
            )
            quantity = int(item.get("quantity", 0) or 0)
            entry["sales_count"] += quantity
            entry["revenue"] += Decimal(str(item.get("price", 0) or 0)) * quantity
    ranked = sorted(leaderboard.values(), key=lambda item: (item["revenue"], item["sales_count"]), reverse=True)[:limit]
    return [{**item, "revenue": _decimal_to_float(item["revenue"])} for item in ranked]


def _vendor_product_performance(products, orders, *, vendor_user_id, vendor_id, limit=8):
    review_lookup = {}
    for review in list_reviews(vendor_user_id=vendor_user_id, include_hidden=True):
        key = review.get("product")
        review_lookup.setdefault(key, []).append(float(review.get("rating", 0) or 0))

    performance = []
    for product in products:
        quantity_sold = 0
        revenue = Decimal("0")
        orders_count = 0
        for order in orders:
            for item in order.get("items", []):
                if not _item_matches_vendor(item, vendor_user_id=vendor_user_id, vendor_id=vendor_id):
                    continue
                if item.get("product") != product.get("id"):
                    continue
                quantity = int(item.get("quantity", 0) or 0)
                quantity_sold += quantity
                orders_count += 1
                revenue += Decimal(str(item.get("price", 0) or 0)) * quantity
        ratings = review_lookup.get(product.get("id"), [])
        performance.append(
            {
                "product_id": product.get("id"),
                "product_name": product.get("name", "Product"),
                "quantity_sold": quantity_sold,
                "orders_count": orders_count,
                "revenue": _decimal_to_float(revenue),
                "rating": round(mean(ratings), 2) if ratings else float(product.get("rating", 0) or 0),
                "stock": int(product.get("stock", 0) or 0),
            }
        )
    performance.sort(key=lambda item: (item["quantity_sold"], item["revenue"], item["rating"]), reverse=True)
    return performance[:limit]


class CustomerDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = list_orders(request.user)
        return Response(
            {
                "recent_orders": [
                    {"id": order["id"], "status": order["status"], "total": order["total"], "created_at": order["created_at"]}
                    for order in orders[:5]
                ],
                "saved_items_count": len(list_wishlist_items(request.user.id)),
                "tailoring_requests_count": len(list_tailoring_requests(request.user)),
                "reviews_count": len([review for review in list_reviews() if review["user"] == request.user.id]),
            }
        )


class VendorDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorOrAdmin]

    def get(self, request):
        vendor = get_vendor_by_user_id(request.user.id)
        vendor_id = vendor.get("id") if vendor else None
        products = [product for product in list_products(include_inactive=True) if _mapping_or_empty(product.get("vendor_detail")).get("user") == request.user.id]
        orders = list_orders(request.user)
        vendor_orders = [
            order
            for order in orders
            if any(_item_matches_vendor(item, vendor_user_id=request.user.id, vendor_id=vendor_id) for item in order.get("items", []))
        ]
        orders_count = sum(
            1
            for order in vendor_orders
        )
        revenue = Decimal("0")
        commission_total = Decimal("0")
        payout_total = Decimal("0")
        payout_breakdown = {"on_hold": 0, "eligible": 0, "paid": 0, "pending": 0}
        for order in vendor_orders:
            if not _order_counts_for_revenue(order):
                continue
            for item in order.get("items", []):
                if _item_matches_vendor(item, vendor_user_id=request.user.id, vendor_id=vendor_id):
                    revenue += Decimal(str(item.get("price", 0) or 0)) * int(item.get("quantity", 0) or 0)
                    commission_total += Decimal(str(item.get("platform_commission", 0) or 0))
                    payout_total += Decimal(str(item.get("vendor_payout_amount", 0) or 0))
                    payout_status = str(item.get("payout_status") or "pending").lower()
                    payout_breakdown[payout_status] = payout_breakdown.get(payout_status, 0) + 1
        return Response(
            {
                "products_count": len(products),
                "orders_count": orders_count,
                "revenue": _decimal_to_float(revenue),
                "recent_orders": vendor_orders[:8],
                "overview": {
                    "total_sales": sum(int(item.get("quantity", 0) or 0) for order in vendor_orders for item in order.get("items", []) if _item_matches_vendor(item, vendor_user_id=request.user.id, vendor_id=vendor_id)),
                    "total_revenue": _decimal_to_float(revenue),
                    "total_products": len(products),
                    "total_orders": orders_count,
                    "platform_commission": _decimal_to_float(commission_total),
                    "vendor_payout_amount": _decimal_to_float(payout_total),
                },
                "product_performance": _vendor_product_performance(products, vendor_orders, vendor_user_id=request.user.id, vendor_id=vendor_id),
                "recent_orders_table": vendor_orders[:10],
                "payout_overview": {
                    "on_hold": payout_breakdown.get("on_hold", 0),
                    "eligible": payout_breakdown.get("eligible", 0),
                    "paid": payout_breakdown.get("paid", 0),
                    "pending": payout_breakdown.get("pending", 0),
                },
            }
        )


class TailorDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTailorOrAdmin]

    def get(self, request):
        requests = list_tailoring_requests(request.user)
        conversations = list_conversations(request.user, {"kind": "customer_tailor"})
        total_requests = len(requests)
        completed_requests = len([item for item in requests if item.get("status") == "completed"])
        active_statuses = {"accepted", "in_progress", "cutting", "stitching", "fitting", "discussion_ongoing"}
        completion_rate = round((completed_requests / total_requests) * 100, 1) if total_requests else 0
        return Response(
            {
                "assigned_requests": total_requests,
                "pending_requests": len([item for item in requests if item.get("status") in {"pending", "request_sent"}]),
                "assigned_status_requests": len([item for item in requests if item.get("status") == "assigned"]),
                "discussion_requests": len(conversations),
                "accepted_requests": len([item for item in requests if item.get("status") == "accepted"]),
                "in_progress_requests": len([item for item in requests if item.get("status") in active_statuses]),
                "completed_requests": completed_requests,
                "completion_rate": completion_rate,
                "status_breakdown": [
                    {"status": "pending", "count": len([item for item in requests if item.get("status") in {"pending", "request_sent"}])},
                    {"status": "assigned", "count": len([item for item in requests if item.get("status") == "assigned"])},
                    {"status": "discussion_ongoing", "count": len([item for item in requests if item.get("status") == "discussion_ongoing"])},
                    {"status": "accepted", "count": len([item for item in requests if item.get("status") == "accepted"])},
                    {"status": "in_progress", "count": len([item for item in requests if item.get("status") == "in_progress"])},
                    {"status": "cutting", "count": len([item for item in requests if item.get("status") == "cutting"])},
                    {"status": "stitching", "count": len([item for item in requests if item.get("status") == "stitching"])},
                    {"status": "fitting", "count": len([item for item in requests if item.get("status") == "fitting"])},
                    {"status": "completed", "count": completed_requests},
                ],
                "recent_requests": requests[:8],
                "conversation_count": len(conversations),
            }
        )


class AdminDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        users = list_users()
        orders = list_orders(request.user)
        tailoring_requests = list_tailoring_requests(request.user)
        total_revenue = sum(Decimal(str(payment.get("amount", 0))) for payment in list_payments(request.user) if payment.get("status") == "paid")
        vendors = [user for user in users if user.get("role") == "vendor"]
        tailors = [user for user in users if user.get("role") == "tailor"]
        vendor_applications = list_vendor_applications(request.user)
        support_messages = list_support_messages(request.user)
        total_platform_commission = Decimal("0")
        total_vendor_payout = Decimal("0")
        payout_breakdown = {"on_hold": 0, "eligible": 0, "paid": 0, "pending": 0}
        for order in orders:
            for item in order.get("items", []):
                total_platform_commission += Decimal(str(item.get("platform_commission", 0) or 0))
                total_vendor_payout += Decimal(str(item.get("vendor_payout_amount", 0) or 0))
                payout_status = str(item.get("payout_status") or "pending").lower()
                payout_breakdown[payout_status] = payout_breakdown.get(payout_status, 0) + 1
        return Response(
            {
                "total_users": len(users),
                "total_products": len(list_products(include_inactive=True)),
                "total_orders": len(orders),
                "total_reviews": len(list_reviews()),
                "total_tailoring_requests": len(tailoring_requests),
                "total_revenue": _decimal_to_float(total_revenue),
                "total_vendors": len(vendors),
                "total_tailors": len(tailors),
                "overview": {
                    "total_users": len(users),
                    "total_orders": len(orders),
                    "total_revenue": _decimal_to_float(total_revenue),
                    "total_vendors": len(vendors),
                    "total_tailors": len(tailors),
                    "total_tailoring_requests": len(tailoring_requests),
                    "pending_tailoring_requests": len([item for item in tailoring_requests if item.get("status") in {"pending", "request_sent"}]),
                    "assigned_tailoring_requests": len([item for item in tailoring_requests if item.get("status") == "assigned"]),
                    "pending_vendor_applications": len([item for item in vendor_applications if item.get("status") == "pending"]),
                    "new_support_messages": len([item for item in support_messages if item.get("status") == "new"]),
                    "platform_commission": _decimal_to_float(total_platform_commission),
                    "vendor_payout_amount": _decimal_to_float(total_vendor_payout),
                },
                "order_status_breakdown": _status_breakdown(orders),
                "top_products": _top_products_from_orders(orders),
                "top_vendors": _top_vendors_from_orders(orders),
                "recent_orders": orders[:10],
                "recent_tailoring_requests": tailoring_requests[:10],
                "payout_overview": payout_breakdown,
            }
        )


class SuperAdminDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminRole]

    def get(self, request):
        platform_settings = get_platform_settings()
        commission_rates = _mapping_or_empty(platform_settings.get("commission_rates"))
        users = list_users()
        orders = list_orders(request.user)
        tailoring_requests = list_tailoring_requests(request.user)
        payments = list_payments(request.user)
        total_revenue = sum(Decimal(str(payment.get("amount", 0))) for payment in payments if payment.get("status") == "paid")
        total_platform_commission = Decimal("0")
        total_vendor_payout = Decimal("0")
        payout_breakdown = {"on_hold": 0, "eligible": 0, "paid": 0, "pending": 0}
        customized_commission = Decimal("0")
        ready_made_commission = Decimal("0")

        for order in orders:
            for item in order.get("items", []):
                commission = Decimal(str(item.get("platform_commission", 0) or 0))
                total_platform_commission += commission
                total_vendor_payout += Decimal(str(item.get("vendor_payout_amount", 0) or 0))
                if item.get("is_customized"):
                    customized_commission += commission
                else:
                    ready_made_commission += commission
                payout_status = str(item.get("payout_status") or "pending").lower()
                payout_breakdown[payout_status] = payout_breakdown.get(payout_status, 0) + 1

        return Response(
            {
                "role": "super_admin",
                "total_users": len(users),
                "total_admins": len([user for user in users if user.get("role") == "admin"]),
                "total_super_admins": len([user for user in users if user.get("role") == "super_admin"]),
                "total_vendors": len([user for user in users if user.get("role") == "vendor"]),
                "total_tailors": len([user for user in users if user.get("role") == "tailor"]),
                "total_customers": len([user for user in users if user.get("role") == "customer"]),
                "total_orders": len(orders),
                "total_tailoring_requests": len(tailoring_requests),
                "total_revenue": _decimal_to_float(total_revenue),
                "platform_commission": _decimal_to_float(total_platform_commission),
                "vendor_payout_amount": _decimal_to_float(total_vendor_payout),
                "commission_summary": {
                    "total_platform_commission": _decimal_to_float(total_platform_commission),
                    "customized_commission": _decimal_to_float(customized_commission),
                    "ready_made_commission": _decimal_to_float(ready_made_commission),
                    "vendor_payout_amount": _decimal_to_float(total_vendor_payout),
                    "customized_rate": float(commission_rates.get("customized") or 0.15),
                    "ready_made_rate": float(commission_rates.get("ready_made") or 0.10),
                },
                "commission_rates": {
                    "customized": float(commission_rates.get("customized") or 0.15),
                    "ready_made": float(commission_rates.get("ready_made") or 0.10),
                    "customized_commission": _decimal_to_float(customized_commission),
                    "ready_made_commission": _decimal_to_float(ready_made_commission),
                },
                "platform_settings": platform_settings,
                "payout_overview": payout_breakdown,
                "recent_orders": orders[:10],
                "recent_tailoring_requests": tailoring_requests[:10],
                "users": users[:20],
                "vendor_applications": list_vendor_applications(request.user)[:10],
            }
        )


class SuperAdminAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminRole]

    def get(self, request):
        users = list_users()
        orders = list_orders(request.user)
        return_requests = list_return_requests(request.user)
        tailoring_requests = list_tailoring_requests(request.user)

        revenue_buckets = {}
        order_buckets = {}
        commission_buckets = {}
        vendor_sales = {}
        tailor_work = {}
        order_status = {}
        tailoring_status = {}

        total_revenue = Decimal("0")
        total_commission = Decimal("0")
        ready_made_commission = Decimal("0")
        customized_commission = Decimal("0")

        for order in orders:
            period = _month_key(order.get("created_at"))
            order_total = Decimal(str(order.get("total", 0) or 0))
            total_revenue += order_total
            _increment_bucket(revenue_buckets, period, "revenue", _decimal_to_float(order_total))
            _increment_bucket(order_buckets, period, "orders", 1)
            order_status[str(order.get("status") or "unknown").lower()] = order_status.get(str(order.get("status") or "unknown").lower(), 0) + 1

            has_customized = False
            for item in order.get("items", []):
                quantity = int(item.get("quantity", 0) or 0)
                item_revenue = Decimal(str(item.get("price", 0) or 0)) * quantity
                commission = Decimal(str(item.get("platform_commission", 0) or 0))
                total_commission += commission
                vendor_key = item.get("vendor") or item.get("vendor_user") or "unknown"
                vendor_name = item.get("vendor_name") or _mapping_or_empty(item.get("vendor_detail")).get("brand_name") or f"Vendor {vendor_key}"
                vendor_entry = vendor_sales.setdefault(vendor_key, {"label": vendor_name, "sales": 0, "revenue": 0})
                vendor_entry["sales"] += quantity
                vendor_entry["revenue"] += _decimal_to_float(item_revenue)
                if item.get("is_customized"):
                    has_customized = True
                    customized_commission += commission
                    _increment_bucket(order_buckets, period, "customized", 1)
                    _increment_bucket(commission_buckets, period, "customized_commission", _decimal_to_float(commission))
                else:
                    ready_made_commission += commission
                    _increment_bucket(order_buckets, period, "ready_made", 1)
                    _increment_bucket(commission_buckets, period, "ready_made_commission", _decimal_to_float(commission))
            if not has_customized:
                order_buckets.setdefault(period, {"period": period}).setdefault("customized", 0)

        for request_document in tailoring_requests:
            status_value = str(request_document.get("status") or "unknown").lower()
            tailoring_status[status_value] = tailoring_status.get(status_value, 0) + 1
            tailor_detail = _mapping_or_empty(request_document.get("assigned_tailor_detail"))
            tailor_id = request_document.get("tailor_id") or request_document.get("assigned_tailor")
            if tailor_id:
                entry = tailor_work.setdefault(
                    tailor_id,
                    {
                        "label": tailor_detail.get("full_name") or tailor_detail.get("email") or f"Tailor {tailor_id}",
                        "completed": 0,
                        "assigned": 0,
                    },
                )
                entry["assigned"] += 1
                if status_value == "completed":
                    entry["completed"] += 1

        user_distribution = {
            "customers": len([user for user in users if user.get("role") == "customer"]),
            "vendors": len([user for user in users if user.get("role") == "vendor"]),
            "tailors": len([user for user in users if user.get("role") == "tailor"]),
            "admins": len([user for user in users if user.get("role") in {"admin", "super_admin"}]),
        }
        status_breakdown = {
            "pending_orders": len([order for order in orders if str(order.get("status") or "").lower() in {"pending", "processing"}]),
            "delivered_orders": len([order for order in orders if str(order.get("status") or "").lower() in {"delivered", "completed"}]),
            "return_requests": len(return_requests),
            "tailoring_in_progress": len([item for item in tailoring_requests if str(item.get("status") or "").lower() in {"accepted", "in_progress", "discussion_ongoing"}]),
            "tailoring_completed": len([item for item in tailoring_requests if str(item.get("status") or "").lower() == "completed"]),
        }

        return Response(
            {
                "summary": {
                    "total_revenue": _decimal_to_float(total_revenue),
                    "total_orders": len(orders),
                    "total_users": len(users),
                    "total_tailoring_requests": len(tailoring_requests),
                    "total_commission": _decimal_to_float(total_commission),
                    "ready_made_commission": _decimal_to_float(ready_made_commission),
                    "customized_commission": _decimal_to_float(customized_commission),
                },
                "revenue_trend": [revenue_buckets[key] for key in sorted(revenue_buckets)],
                "orders_trend": [order_buckets[key] for key in sorted(order_buckets)],
                "commission_trend": [commission_buckets[key] for key in sorted(commission_buckets)],
                "user_distribution": [{"label": key.replace("_", " ").title(), "value": value} for key, value in user_distribution.items()],
                "status_breakdown": [{"label": key.replace("_", " ").title(), "value": value} for key, value in status_breakdown.items()],
                "order_status_breakdown": [{"label": key.replace("_", " ").title(), "value": value} for key, value in sorted(order_status.items())],
                "tailoring_status_breakdown": [{"label": key.replace("_", " ").title(), "value": value} for key, value in sorted(tailoring_status.items())],
                "top_vendors": sorted(vendor_sales.values(), key=lambda item: (item["revenue"], item["sales"]), reverse=True)[:8],
                "top_tailors": sorted(tailor_work.values(), key=lambda item: (item["completed"], item["assigned"]), reverse=True)[:8],
            }
        )


class PlatformSettingsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminRole]

    def get(self, request):
        return Response(get_platform_settings())

    def patch(self, request):
        try:
            settings = update_platform_settings(request.data)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc) or "Commission rates must be valid numbers."}, status=400)
        return Response(settings)
