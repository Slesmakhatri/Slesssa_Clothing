from django.utils.text import slugify

from common.mongo import clean_document, get_collection, next_sequence, utcnow


def vendors_collection():
    return get_collection("vendors")


def vendor_applications_collection():
    return get_collection("vendor_applications")


def vendor_to_public(document):
    return clean_document(document)


def vendor_summary(document):
    if not document:
        return None
    return {
        "id": document["id"],
        "user": document["user"],
        "brand_name": document.get("brand_name", ""),
        "slug": document.get("slug", ""),
        "description": document.get("description", ""),
        "specialization": document.get("specialization", ""),
        "contact_email": document.get("contact_email", ""),
        "contact_phone": document.get("contact_phone", ""),
        "address": document.get("address", ""),
        "location": document.get("location", ""),
        "logo": document.get("logo", ""),
        "banner": document.get("banner", ""),
        "approval_status": document.get("approval_status", "pending"),
        "is_shop_setup_complete": document.get("is_shop_setup_complete", False),
        "customization_services": document.get("customization_services", {}),
        "created_at": document.get("created_at"),
        "user_detail": document.get("user_detail"),
    }


def _is_vendor_profile_complete(document):
    vendor = clean_document(document) or {}
    required_values = [
        vendor.get("brand_name"),
        vendor.get("description"),
        vendor.get("address"),
        vendor.get("contact_email"),
        vendor.get("contact_phone"),
        vendor.get("specialization"),
    ]
    return all(str(value or "").strip() for value in required_values)


def find_vendor_application_by_email(email, *, approved_only=False):
    if not email:
        return None
    query = {"email": str(email).strip().lower()}
    if approved_only:
        query["status"] = "approved"
    return clean_document(vendor_applications_collection().find_one(query))


def _ensure_unique_slug(base_slug, exclude_id=None):
    candidate = base_slug or "vendor"
    index = 1
    while True:
        query = {"slug": candidate}
        if exclude_id is not None:
            query["id"] = {"$ne": exclude_id}
        if vendors_collection().find_one(query) is None:
            return candidate
        index += 1
        candidate = f"{base_slug}-{index}"


def get_vendor_by_id(vendor_id):
    try:
        vendor_id = int(vendor_id)
    except (TypeError, ValueError):
        return None
    return vendors_collection().find_one({"id": vendor_id})


def get_vendor_by_slug(slug):
    return vendors_collection().find_one({"slug": slug})


def get_vendor_by_user_id(user_id):
    return vendors_collection().find_one({"user": int(user_id)})


def list_vendors(include_unapproved=False, user=None):
    query = {}
    if not include_unapproved:
        query["approval_status"] = "approved"
    elif user and user.role not in {"admin", "super_admin"}:
        query["user"] = user.id
    return [vendor_to_public(document) for document in vendors_collection().find(query, sort=[("brand_name", 1), ("id", 1)])]


def ensure_vendor_profile_for_user(user, defaults=None):
    existing = get_vendor_by_user_id(user["id"])
    if existing:
        return existing
    defaults = defaults or {}
    approved_application = find_vendor_application_by_email(user.get("email"), approved_only=True)
    brand_name = defaults.get("brand_name") or user.get("full_name") or user.get("username") or "Vendor"
    slug = _ensure_unique_slug(slugify(brand_name) or f"vendor-{user['id']}")
    document = {
        "id": next_sequence("vendors"),
        "user": user["id"],
        "user_detail": {
            "id": user["id"],
            "username": user.get("username", ""),
            "full_name": user.get("full_name", ""),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", ""),
            "avatar": user.get("avatar", ""),
            "auth_provider": user.get("auth_provider", "email"),
            "google_account_id": user.get("google_account_id"),
            "is_active": user.get("is_active", True),
            "is_staff": user.get("is_staff", False),
            "date_joined": user.get("date_joined"),
        },
        "brand_name": brand_name,
        "slug": slug,
        "description": defaults.get("description", ""),
        "specialization": defaults.get("specialization", ""),
        "contact_email": defaults.get("contact_email") or user.get("email", ""),
        "contact_phone": defaults.get("contact_phone") or user.get("phone", ""),
        "address": defaults.get("address", ""),
        "location": defaults.get("location", ""),
        "logo": defaults.get("logo", ""),
        "banner": defaults.get("banner", ""),
        "approval_status": defaults.get("approval_status", "approved" if approved_application else "pending"),
        "customization_services": defaults.get(
            "customization_services",
            {
                "customization_specialty": "",
                "supported_product_types": [],
                "fabrics_materials": [],
                "design_specialties": [],
                "measurement_requirements": [],
                "customization_notes": "",
                "starting_price": "",
            },
        ),
        "created_at": utcnow(),
    }
    document["is_shop_setup_complete"] = _is_vendor_profile_complete(document)
    vendors_collection().insert_one(document)
    return get_vendor_by_id(document["id"])


def create_vendor(user, data):
    existing = get_vendor_by_user_id(user.id)
    if existing:
        return existing
    return ensure_vendor_profile_for_user(
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "avatar": user.avatar,
            "auth_provider": user.auth_provider,
            "google_account_id": user.google_account_id,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "date_joined": user.date_joined,
        },
        defaults={
            "brand_name": data.get("brand_name") or user.full_name or user.username,
            "description": data.get("description", ""),
            "specialization": data.get("specialization", ""),
            "contact_email": data.get("contact_email") or user.email,
            "contact_phone": data.get("contact_phone") or user.phone,
            "address": data.get("address", ""),
            "location": data.get("location", ""),
            "logo": data.get("logo", ""),
            "banner": data.get("banner", ""),
            "approval_status": data.get("approval_status", "approved"),
            "customization_services": data.get("customization_services", {}),
        },
    )


def update_vendor(vendor_id, data):
    vendor = get_vendor_by_id(vendor_id)
    if not vendor:
        return None
    updates = {
        key: data[key]
        for key in (
            "brand_name",
            "description",
            "specialization",
            "contact_email",
            "contact_phone",
            "address",
            "location",
            "logo",
            "banner",
            "approval_status",
            "customization_services",
        )
        if key in data
    }
    if "brand_name" in updates:
        updates["slug"] = _ensure_unique_slug(slugify(updates["brand_name"]) or vendor["slug"], exclude_id=vendor["id"])
    merged = {**vendor, **updates}
    updates["is_shop_setup_complete"] = _is_vendor_profile_complete(merged)
    if updates:
        vendors_collection().update_one({"id": vendor["id"]}, {"$set": updates})
    return get_vendor_by_id(vendor["id"])


def delete_vendor(vendor_id):
    vendors_collection().delete_one({"id": int(vendor_id)})


def create_vendor_application(data):
    document = {
        "id": next_sequence("vendor_applications"),
        "full_name": data.get("full_name", ""),
        "email": str(data.get("email") or "").strip().lower(),
        "phone": data.get("phone", ""),
        "business_name": data.get("business_name", ""),
        "business_description": data.get("business_description", ""),
        "specialization": data.get("specialization", ""),
        "location": data.get("location", ""),
        "documents": data.get("documents", []),
        "status": "pending",
        "review_note": "",
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    vendor_applications_collection().insert_one(document)
    return clean_document(document)


def list_vendor_applications(user=None):
    query = {}
    if user and getattr(user, "role", "") not in {"admin", "super_admin"}:
        query["email"] = getattr(user, "email", "").lower()
    return [
        clean_document(document)
        for document in vendor_applications_collection().find(query, sort=[("created_at", -1), ("id", -1)])
    ]


def get_vendor_application(application_id):
    try:
        application_id = int(application_id)
    except (TypeError, ValueError):
        return None
    document = vendor_applications_collection().find_one({"id": application_id})
    return clean_document(document) if document else None


def update_vendor_application(application_id, data):
    application = get_vendor_application(application_id)
    if not application:
        return None
    updates = {key: data[key] for key in ("status", "review_note") if key in data}
    if not updates:
        return application
    updates["updated_at"] = utcnow()
    vendor_applications_collection().update_one({"id": application["id"]}, {"$set": updates})
    updated = get_vendor_application(application["id"])
    if updated and updated.get("status") in {"approved", "rejected"}:
        vendor = vendors_collection().find_one({"contact_email": updated["email"]}) or vendors_collection().find_one({"user_detail.email": updated["email"]})
        if vendor:
            vendor_updates = {"approval_status": updated["status"]}
            if updated.get("status") == "approved":
                vendor_updates.update(
                    {
                        "brand_name": vendor.get("brand_name") or updated.get("business_name", ""),
                        "description": vendor.get("description") or updated.get("business_description", ""),
                        "specialization": vendor.get("specialization") or updated.get("specialization", ""),
                        "location": vendor.get("location") or updated.get("location", ""),
                    }
                )
            vendors_collection().update_one(
                {"id": vendor["id"]},
                {"$set": vendor_updates},
            )
    return updated
