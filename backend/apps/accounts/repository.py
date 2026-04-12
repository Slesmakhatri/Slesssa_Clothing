from django.contrib.auth.hashers import check_password, make_password
from django.utils.text import slugify

from common.mongo import clean_document, get_collection, next_sequence, utcnow


ROLE_CUSTOMER = "customer"
ROLE_VENDOR = "vendor"
ROLE_TAILOR = "tailor"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"
ROLE_CHOICES = (
    (ROLE_CUSTOMER, "Customer"),
    (ROLE_VENDOR, "Vendor"),
    (ROLE_TAILOR, "Tailor"),
    (ROLE_ADMIN, "Admin"),
    (ROLE_SUPER_ADMIN, "Super Admin"),
)


def users_collection():
    return get_collection("users")


def user_to_public(document):
    if not document:
        return None
    user = clean_document(document)
    user.pop("password", None)
    return user


def user_summary(document):
    if not document:
        return None
    return {
        "id": document["id"],
        "full_name": document.get("full_name", ""),
        "email": document.get("email", ""),
        "role": document.get("role", ROLE_CUSTOMER),
    }


def get_user_by_id(user_id):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    return users_collection().find_one({"id": user_id})


def get_user_by_email(email):
    if not email:
        return None
    return users_collection().find_one({"email": email.strip().lower()})


def get_user_by_phone(phone):
    if not phone:
        return None
    return users_collection().find_one({"phone": phone})


def get_user_by_google_account_id(google_account_id):
    if not google_account_id:
        return None
    return users_collection().find_one({"google_account_id": google_account_id})


def list_users():
    return [user_to_public(document) for document in users_collection().find({}, sort=[("date_joined", -1), ("id", -1)])]


def email_exists(email, exclude_user_id=None):
    query = {"email": email.strip().lower()}
    if exclude_user_id is not None:
        query["id"] = {"$ne": exclude_user_id}
    return users_collection().find_one(query) is not None


def phone_exists(phone, exclude_user_id=None):
    if not phone:
        return False
    query = {"phone": phone}
    if exclude_user_id is not None:
        query["id"] = {"$ne": exclude_user_id}
    return users_collection().find_one(query) is not None


def username_exists(username):
    return users_collection().find_one({"username": username}) is not None


def generate_username(email):
    base = slugify((email or "").split("@")[0]) or "slessaa-user"
    candidate = base
    index = 1
    while username_exists(candidate):
        index += 1
        candidate = f"{base}-{index}"
    return candidate


def create_user(*, name, email, phone, password, role, auth_provider="email", google_account_id=None, first_name="", last_name="", avatar=""):
    email = email.strip().lower()
    now = utcnow()
    full_name = name.strip()
    if not first_name and full_name:
        parts = full_name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else last_name

    document = {
        "id": next_sequence("users"),
        "username": generate_username(email),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "role": role,
        "avatar": avatar,
        "auth_provider": auth_provider,
        "google_account_id": google_account_id,
        "is_active": True,
        "is_staff": role in {ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "date_joined": now,
        "password": make_password(password) if password else "!",
    }
    users_collection().insert_one(document)
    provision_role_profile(document, full_name=full_name)
    return get_user_by_id(document["id"])


def update_user(user_id, updates):
    allowed = {"full_name", "first_name", "last_name", "phone", "avatar", "role", "email", "is_active", "is_staff"}
    payload = {key: value for key, value in updates.items() if key in allowed}
    if payload.get("role"):
        payload["is_staff"] = payload["role"] in {ROLE_ADMIN, ROLE_SUPER_ADMIN}
    if not payload:
        return get_user_by_id(user_id)
    users_collection().update_one({"id": int(user_id)}, {"$set": payload})
    return get_user_by_id(user_id)


def delete_user(user_id):
    users_collection().delete_one({"id": int(user_id)})


def update_user_password(user_id, password):
    users_collection().update_one({"id": int(user_id)}, {"$set": {"password": make_password(password)}})
    return get_user_by_id(user_id)


def sync_google_user_profile(user_id, *, google_account_id="", full_name="", first_name="", last_name="", avatar=""):
    payload = {}
    if google_account_id:
        payload["google_account_id"] = google_account_id
    if full_name:
        payload["full_name"] = full_name
    if first_name:
        payload["first_name"] = first_name
    if last_name:
        payload["last_name"] = last_name
    if avatar:
        payload["avatar"] = avatar
    if not payload:
        return get_user_by_id(user_id)
    users_collection().update_one({"id": int(user_id)}, {"$set": payload})
    return get_user_by_id(user_id)


def verify_password(user, password):
    return bool(user and check_password(password, user.get("password", "")))


def provision_role_profile(user, full_name=""):
    if user["role"] == ROLE_VENDOR:
        from apps.vendors.repository import ensure_vendor_profile_for_user
        from apps.vendors.repository import find_vendor_application_by_email

        approved_application = find_vendor_application_by_email(user.get("email"), approved_only=True)
        ensure_vendor_profile_for_user(
            user,
            defaults={
                "brand_name": (approved_application or {}).get("business_name") or full_name or user.get("full_name") or user.get("username"),
                "description": (approved_application or {}).get("business_description", ""),
                "specialization": (approved_application or {}).get("specialization", ""),
                "location": (approved_application or {}).get("location", ""),
                "contact_email": user.get("email", ""),
                "contact_phone": user.get("phone", ""),
                "approval_status": "approved" if approved_application else "pending",
            },
        )
    if user["role"] == ROLE_TAILOR:
        from apps.tailoring.repository import ensure_tailor_profile_for_user

        ensure_tailor_profile_for_user(
            user,
            defaults={
                "full_name": full_name or user.get("full_name") or user.get("username"),
                "specialization": "Custom tailoring",
                "design_capabilities": ["shirts", "kurtas", "blazers"],
                "style_categories": ["formal", "casual"],
                "supported_clothing_types": ["shirt", "kurta", "blazer"],
                "short_bio": "Tailor profile ready for enrichment.",
                "years_of_experience": 1,
                "rating": 4.5,
            },
        )
