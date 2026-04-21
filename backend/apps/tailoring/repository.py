import logging
import math
from datetime import date, datetime

from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


logger = logging.getLogger(__name__)


DEMO_TAILOR_LOCATIONS = [
    {"location_name": "Durbar Marg Studio", "address": "Durbar Marg, Kathmandu", "city": "Kathmandu", "latitude": 27.7132, "longitude": 85.3150},
    {"location_name": "Jawalakhel Atelier", "address": "Jawalakhel, Lalitpur", "city": "Lalitpur", "latitude": 27.6736, "longitude": 85.3136},
    {"location_name": "Suryabinayak Fit Lab", "address": "Suryabinayak, Bhaktapur", "city": "Bhaktapur", "latitude": 27.6616, "longitude": 85.4285},
    {"location_name": "Lakeside Bespoke Hub", "address": "Lakeside, Pokhara", "city": "Pokhara", "latitude": 28.2096, "longitude": 83.9596},
    {"location_name": "Traffic Chowk Tailor Point", "address": "Traffic Chowk, Butwal", "city": "Butwal", "latitude": 27.7000, "longitude": 83.4482},
    {"location_name": "Adarsha Studio", "address": "Adarsha Nagar, Biratnagar", "city": "Biratnagar", "latitude": 26.4525, "longitude": 87.2718},
]


def measurements_collection():
    return get_collection("measurements")


def tailor_profiles_collection():
    return get_collection("tailor_profiles")


def tailoring_requests_collection():
    return get_collection("tailoring_requests")


def _safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _coerce_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _coerce_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _normalize_tailoring_request_document(document):
    document = clean_document(document)
    if not document:
        return document
    if document.get("preferred_delivery_date"):
        document["preferred_delivery_date"] = _coerce_date(document.get("preferred_delivery_date"))
    return document


def _user_summary_from_document(user_document):
    user_document = clean_document(user_document) if user_document else None
    if not user_document:
        return None
    return {
        "id": user_document.get("id"),
        "full_name": user_document.get("full_name", ""),
        "email": user_document.get("email", ""),
        "role": user_document.get("role", ""),
    }


def _user_id(user):
    return user.get("id") if isinstance(user, dict) else getattr(user, "id", None)


def _user_role(user):
    return user.get("role") if isinstance(user, dict) else getattr(user, "role", None)


def _haversine_km(lat1, lon1, lat2, lon2):
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return radius_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _default_location_for_profile(profile_id):
    if not profile_id:
        return DEMO_TAILOR_LOCATIONS[0]
    return DEMO_TAILOR_LOCATIONS[(int(profile_id) - 1) % len(DEMO_TAILOR_LOCATIONS)]


def _hydrate_tailor_location(profile):
    default_location = _default_location_for_profile(profile.get("id"))
    updates = {}
    for key in ("location_name", "address", "city", "latitude", "longitude"):
        if profile.get(key) in (None, ""):
            updates[key] = default_location[key]
    if updates:
        tailor_profiles_collection().update_one({"id": profile["id"]}, {"$set": updates})
        profile = {**profile, **updates}
    return profile


def ensure_tailor_profile_for_user(user, defaults=None):
    existing = tailor_profiles_collection().find_one({"user": user["id"]})
    if existing:
        return existing
    defaults = defaults or {}
    profile_id = next_sequence("tailor_profiles")
    seeded_location = _default_location_for_profile(profile_id)
    document = {
        "id": profile_id,
        "user": user["id"],
        "user_detail": {
            "id": user["id"],
            "full_name": user.get("full_name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "tailor"),
        },
        "vendor": None,
        "vendor_detail": None,
        "full_name": defaults.get("full_name", ""),
        "years_of_experience": defaults.get("years_of_experience", 0),
        "specialization": defaults.get("specialization", ""),
        "design_capabilities": defaults.get("design_capabilities", []),
        "style_categories": defaults.get("style_categories", []),
        "supported_clothing_types": defaults.get("supported_clothing_types", []),
        "short_bio": defaults.get("short_bio", ""),
        "rating": defaults.get("rating"),
        "profile_image": defaults.get("profile_image", ""),
        "is_available": defaults.get("is_available", True),
        "approval_status": defaults.get("approval_status", "pending"),
        "location_name": defaults.get("location_name", seeded_location["location_name"]),
        "address": defaults.get("address", seeded_location["address"]),
        "city": defaults.get("city", seeded_location["city"]),
        "latitude": defaults.get("latitude", seeded_location["latitude"]),
        "longitude": defaults.get("longitude", seeded_location["longitude"]),
        "created_at": utcnow(),
    }
    tailor_profiles_collection().insert_one(document)
    return document


def create_measurement(user, data):
    document = {
        "id": next_sequence("measurements"),
        "user": user.id,
        "chest": data.get("chest"),
        "waist": data.get("waist"),
        "hip": data.get("hip"),
        "shoulder": data.get("shoulder"),
        "sleeve_length": data.get("sleeve_length"),
        "inseam": data.get("inseam"),
        "neck": data.get("neck"),
        "height": data.get("height"),
        "source": data.get("source", "manual"),
        "confidence_score": data.get("confidence_score"),
        "suggestion_explanation": data.get("suggestion_explanation", ""),
        "suggestion_basis": data.get("suggestion_basis", []),
        "body_profile": data.get("body_profile", {}),
        "photo_reference": data.get("photo_reference", ""),
        "notes": data.get("notes", ""),
        "created_at": utcnow(),
    }
    measurements_collection().insert_one(prepare_document_for_mongo(document))
    return clean_document(document)


def _measurement_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _round_measurement(value):
    return round(max(value, 0), 2)


def _size_anchor(standard_size):
    size_key = str(standard_size or "").strip().upper()
    anchors = {
        "XS": {"chest": 32.0, "waist": 26.0, "hip": 34.0, "shoulder": 14.0, "neck": 13.5},
        "S": {"chest": 34.0, "waist": 28.0, "hip": 36.0, "shoulder": 14.5, "neck": 14.0},
        "M": {"chest": 37.0, "waist": 31.0, "hip": 39.0, "shoulder": 15.25, "neck": 15.0},
        "L": {"chest": 40.0, "waist": 34.0, "hip": 42.0, "shoulder": 16.0, "neck": 16.0},
        "XL": {"chest": 44.0, "waist": 38.0, "hip": 46.0, "shoulder": 17.0, "neck": 17.0},
        "XXL": {"chest": 48.0, "waist": 42.0, "hip": 50.0, "shoulder": 18.0, "neck": 18.0},
    }
    return anchors.get(size_key)


def suggest_measurements_for_profile(user, data):
    height_cm = _measurement_float(data.get("height"))
    weight_kg = _measurement_float(data.get("weight"))
    gender = data.get("gender") or "other"
    body_type = data.get("body_type") or "average"
    fit_preference = data.get("fit_preference") or "regular"
    standard_size = data.get("standard_size") or ""
    base = _size_anchor(standard_size) or {}

    if height_cm and weight_kg:
        bmi = weight_kg / ((height_cm / 100) ** 2)
        gender_offset = {"female": -1.0, "male": 1.5, "other": 0.0}.get(gender, 0.0)
        chest = base.get("chest") or 23.5 + (height_cm * 0.08) + (weight_kg * 0.16) + gender_offset
        waist = base.get("waist") or chest - 5.5 + max(bmi - 22, -3) * 0.7
        hip = base.get("hip") or chest + (2.5 if gender == "female" else 0.5)
        shoulder = base.get("shoulder") or 9.2 + (height_cm * 0.035) + (1.0 if gender == "male" else 0.0)
        neck = base.get("neck") or 9.0 + (height_cm * 0.018) + (weight_kg * 0.025)
    else:
        chest = base.get("chest", 37.0)
        waist = base.get("waist", 31.0)
        hip = base.get("hip", 39.0)
        shoulder = base.get("shoulder", 15.25)
        neck = base.get("neck", 15.0)
        bmi = None

    body_adjustments = {
        "lean": {"chest": -1.0, "waist": -1.5, "hip": -1.0},
        "average": {},
        "curvy": {"chest": 1.0, "waist": 0.5, "hip": 2.0},
        "athletic": {"chest": 1.5, "waist": -0.5, "shoulder": 0.8},
        "broad": {"chest": 2.0, "shoulder": 1.0, "neck": 0.5},
        "petite": {"chest": -1.0, "waist": -1.0, "hip": -1.0, "shoulder": -0.5},
        "plus-size": {"chest": 2.5, "waist": 2.5, "hip": 2.5},
    }
    fit_adjustments = {"slim": -0.5, "regular": 0.0, "relaxed": 1.0}
    adjustment = body_adjustments.get(body_type, {})
    ease = fit_adjustments.get(fit_preference, 0.0)

    sleeve_length = _measurement_float(data.get("sleeve_length"))
    inseam = _measurement_float(data.get("inseam"))
    estimated_height = height_cm or _measurement_float(data.get("height")) or None
    measurements = {
        "user": user.id,
        "chest": data.get("chest") or _round_measurement(chest + adjustment.get("chest", 0) + ease),
        "waist": data.get("waist") or _round_measurement(waist + adjustment.get("waist", 0) + ease),
        "hip": data.get("hip") or _round_measurement(hip + adjustment.get("hip", 0) + ease),
        "shoulder": data.get("shoulder") or _round_measurement(shoulder + adjustment.get("shoulder", 0)),
        "sleeve_length": data.get("sleeve_length") or _round_measurement(sleeve_length or ((height_cm or 165) * 0.145)),
        "inseam": data.get("inseam") or _round_measurement(inseam or ((height_cm or 165) * 0.46)),
        "neck": data.get("neck") or _round_measurement(neck + adjustment.get("neck", 0)),
        "height": estimated_height,
        "source": "smart_measurement_assistant",
        "confidence_score": 0.74 if height_cm and weight_kg else 0.58,
        "suggestion_basis": [],
        "body_profile": {
            "gender": gender,
            "height": height_cm,
            "weight": weight_kg,
            "body_type": body_type,
            "fit_preference": fit_preference,
            "standard_size": standard_size,
            "bmi": round(bmi, 1) if bmi else None,
        },
        "notes": "Smart estimate. Customer should review and edit before final stitching.",
    }

    basis = [
        "Height and weight estimate" if height_cm and weight_kg else "Standard size fallback",
        f"{body_type.replace('-', ' ')} body-type adjustment",
        f"{fit_preference} fit ease",
    ]
    if standard_size:
        basis.append(f"{standard_size.upper()} size anchor")
    explanation = (
        "Measurements were estimated with transparent sizing rules using height, weight, body type, and preferred fit. "
        "They are intentionally editable because final tailoring should still be verified by the customer or tailor."
    )
    measurements["suggestion_basis"] = basis
    measurements["suggestion_explanation"] = explanation
    return {
        "measurements": measurements,
        "confidence_label": "Medium" if measurements["confidence_score"] >= 0.7 else "Low",
        "explanation": explanation,
        "basis": basis,
        "input_summary": measurements["body_profile"],
    }


def list_measurements(user):
    query = {} if user.role in {"admin", "super_admin"} else {"user": user.id}
    return [clean_document(document) for document in measurements_collection().find(query, sort=[("created_at", -1), ("id", -1)])]


def get_measurement_for_user(user, measurement_id):
    try:
        measurement_id = int(measurement_id)
    except (TypeError, ValueError):
        return None
    measurement = measurements_collection().find_one({"id": measurement_id})
    if not measurement:
        return None
    if user.role in {"admin", "super_admin"} or measurement.get("user") == user.id:
        return clean_document(measurement)
    if user.role == "tailor":
        request_match = tailoring_requests_collection().find_one(
            {
                "measurement": measurement_id,
                "$or": [{"assigned_tailor": user.id}, {"tailor_id": user.id}],
            }
        )
        if request_match:
            return clean_document(measurement)
    return None


def update_measurement(user, measurement_id, data):
    measurement = get_measurement_for_user(user, measurement_id)
    if not measurement:
        return None
    allowed_fields = {
        "chest",
        "waist",
        "hip",
        "shoulder",
        "sleeve_length",
        "inseam",
        "neck",
        "height",
        "source",
        "confidence_score",
        "suggestion_explanation",
        "suggestion_basis",
        "body_profile",
        "photo_reference",
        "notes",
    }
    payload = {key: value for key, value in data.items() if key in allowed_fields}
    if not payload:
        return measurement
    measurements_collection().update_one({"id": measurement["id"]}, {"$set": prepare_document_for_mongo(payload)})
    updated = clean_document(measurements_collection().find_one({"id": measurement["id"]}))
    for request_document in tailoring_requests_collection().find({"measurement": measurement["id"]}):
        clean_request = clean_document(request_document)
        if user.role not in {"admin", "super_admin"} and not _request_accessible(user, clean_request):
            continue
        tailoring_requests_collection().update_one(
            {"id": clean_request["id"]},
            {"$set": prepare_document_for_mongo({"measurement_detail": updated})},
        )
    return updated


def list_tailor_profiles(user, params=None):
    params = params or {}
    profiles = [_hydrate_tailor_location(clean_document(document)) for document in tailor_profiles_collection().find({}, sort=[("created_at", -1), ("id", -1)])]
    vendor_id = params.get("vendor")
    available_only = params.get("available")
    capability = (params.get("capability") or "").lower()
    style = (params.get("style") or "").lower()
    min_experience = params.get("min_experience")
    search = (params.get("search") or "").lower()
    city = (params.get("city") or "").lower()
    latitude = _safe_float(params.get("latitude"))
    longitude = _safe_float(params.get("longitude"))
    max_distance_km = _safe_float(params.get("max_distance_km"))

    if vendor_id:
        vendor_id = int(vendor_id)
        profiles = [profile for profile in profiles if profile.get("vendor") in {None, vendor_id}]
    if available_only:
        profiles = [profile for profile in profiles if profile.get("is_available")]
    if min_experience:
        profiles = [profile for profile in profiles if int(profile.get("years_of_experience", 0)) >= int(min_experience)]
    if search:
        profiles = [
            profile for profile in profiles
            if search in profile.get("full_name", "").lower()
            or search in profile.get("specialization", "").lower()
            or search in profile.get("short_bio", "").lower()
            or search in profile.get("user_detail", {}).get("full_name", "").lower()
            or search in profile.get("user_detail", {}).get("email", "").lower()
        ]
    if capability:
        profiles = [
            profile for profile in profiles
            if any(capability in str(item).lower() for item in profile.get("design_capabilities", []))
            or any(capability in str(item).lower() for item in profile.get("supported_clothing_types", []))
        ]
    if style:
        profiles = [profile for profile in profiles if any(style in str(item).lower() for item in profile.get("style_categories", []))]
    if city:
        profiles = [
            profile for profile in profiles
            if city in profile.get("city", "").lower() or city in profile.get("address", "").lower()
        ]

    if latitude is not None and longitude is not None:
        enriched = []
        for profile in profiles:
            profile_latitude = _safe_float(profile.get("latitude"))
            profile_longitude = _safe_float(profile.get("longitude"))
            if profile_latitude is None or profile_longitude is None:
                continue
            distance_km = round(_haversine_km(latitude, longitude, profile_latitude, profile_longitude), 2)
            if max_distance_km is not None and distance_km > max_distance_km:
                continue
            enriched.append({**profile, "distance_km": distance_km})
        profiles = sorted(enriched, key=lambda item: (item.get("distance_km", 999999), -int(item.get("years_of_experience", 0))))

    if user.role in {"admin", "super_admin"}:
        return profiles
    if user.role == "vendor":
        return [profile for profile in profiles if profile.get("vendor_detail", {}).get("user") == user.id or profile.get("vendor") is None]
    if user.role == "tailor":
        return [profile for profile in profiles if profile.get("user") == user.id]
    return [profile for profile in profiles if profile.get("is_available") and profile.get("approval_status", "pending") == "approved"]


def get_tailor_profile_for_user(user, profile_id):
    try:
        profile_id = int(profile_id)
    except (TypeError, ValueError):
        return None
    for profile in list_tailor_profiles(user):
        if profile["id"] == profile_id:
            return profile
    return None


def update_tailor_profile(user, profile_id, data):
    profile = get_tailor_profile_for_user(user, profile_id)
    if not profile:
        return None
    if user.role in {"admin", "super_admin"}:
        allowed_fields = (
            "full_name",
            "years_of_experience",
            "specialization",
            "design_capabilities",
            "style_categories",
            "supported_clothing_types",
            "short_bio",
            "rating",
            "profile_image",
            "is_available",
            "approval_status",
            "location_name",
            "address",
            "city",
            "latitude",
            "longitude",
        )
    elif user.role == "tailor" and profile.get("user") == user.id:
        allowed_fields = (
            "full_name",
            "years_of_experience",
            "specialization",
            "design_capabilities",
            "style_categories",
            "supported_clothing_types",
            "short_bio",
            "profile_image",
            "is_available",
            "location_name",
            "address",
            "city",
            "latitude",
            "longitude",
        )
    else:
        return None

    updates = {key: data[key] for key in allowed_fields if key in data}
    if updates:
        tailor_profiles_collection().update_one({"id": profile["id"]}, {"$set": prepare_document_for_mongo(updates)})
    return get_tailor_profile_for_user(user, profile["id"])


def _resolve_tailor_assignment(value):
    from apps.accounts.repository import get_user_by_id

    tailor_user = None
    tailor_profile = None
    assignment_id = _safe_int_or_none(value)
    if assignment_id is None:
        return None, None, None

    user_document = get_user_by_id(assignment_id)
    if user_document and user_document.get("role") == "tailor":
        tailor_user = clean_document(user_document)
        tailor_profile = clean_document(tailor_profiles_collection().find_one({"user": tailor_user["id"]}))
    else:
        profile_document = clean_document(tailor_profiles_collection().find_one({"id": assignment_id}))
        if profile_document:
            tailor_profile = profile_document
            user_document = get_user_by_id(profile_document.get("user"))
            if user_document and user_document.get("role") == "tailor":
                tailor_user = clean_document(user_document)

    if tailor_profile:
        tailor_profile = _hydrate_tailor_location(tailor_profile)

    return tailor_user, _user_summary_from_document(tailor_user), tailor_profile


def _hydrate_tailoring_request_relationships(document, persist=False):
    from apps.products.repository import get_product_by_slug
    from apps.vendors.repository import get_vendor_by_id

    document = _normalize_tailoring_request_document(document)
    if not document:
        return document

    updates = {}

    measurement_id = _safe_int_or_none(document.get("measurement"))
    if measurement_id:
        measurement_detail = clean_document(measurements_collection().find_one({"id": measurement_id}))
        if measurement_detail and document.get("measurement_detail") != measurement_detail:
            updates["measurement_detail"] = measurement_detail

    vendor_id = _safe_int_or_none(document.get("vendor_id") or document.get("vendor"))
    if vendor_id is None and document.get("reference_product_slug"):
        product = get_product_by_slug(document.get("reference_product_slug"))
        vendor_id = _safe_int_or_none((product or {}).get("vendor"))
    if vendor_id is not None:
        vendor = get_vendor_by_id(vendor_id)
        vendor_clean = clean_document(vendor) if vendor else None
        if vendor_clean:
            if document.get("vendor") != vendor_clean.get("id"):
                updates["vendor"] = vendor_clean.get("id")
            if document.get("vendor_id") != vendor_clean.get("id"):
                updates["vendor_id"] = vendor_clean.get("id")
            if document.get("vendor_detail") != vendor_clean:
                updates["vendor_detail"] = vendor_clean

    assigned_value = document.get("assigned_tailor") or document.get("tailor_id")
    tailor_user, tailor_summary, tailor_profile = _resolve_tailor_assignment(assigned_value)
    if assigned_value and tailor_user:
        if document.get("assigned_tailor") != tailor_user["id"]:
            updates["assigned_tailor"] = tailor_user["id"]
        if document.get("tailor_id") != tailor_user["id"]:
            updates["tailor_id"] = tailor_user["id"]
        if document.get("assigned_tailor_detail") != tailor_summary:
            updates["assigned_tailor_detail"] = tailor_summary
        if document.get("tailor_profile_detail") != tailor_profile:
            updates["tailor_profile_detail"] = tailor_profile

    if document.get("reference_product_id") and document.get("product_id") != document.get("reference_product_id"):
        updates["product_id"] = document.get("reference_product_id")

    if updates and persist:
        tailoring_requests_collection().update_one(
            {"id": document["id"]},
            {"$set": prepare_document_for_mongo(updates)},
        )
        document = {**document, **updates}
    elif updates:
        document = {**document, **updates}

    return _normalize_tailoring_request_document(document)


def _message_entry(request_document, sender, data):
    return {
        "id": next_sequence("tailoring_messages"),
        "request": request_document["id"],
        "sender": sender.id,
        "sender_role": sender.role,
        "sender_detail": {
            "id": sender.id,
            "full_name": sender.full_name,
            "email": sender.email,
            "role": sender.role,
        },
        "body": data.get("body", ""),
        "design_notes": data.get("design_notes", ""),
        "measurement_snapshot": data.get("measurement_snapshot", {}),
        "fabric_preference": data.get("fabric_preference", ""),
        "color_preference": data.get("color_preference", ""),
        "price_estimate": data.get("price_estimate"),
        "delivery_estimate": data.get("delivery_estimate", ""),
        "status_snapshot": data.get("status_snapshot", ""),
        "attachments": data.get("attachments", []),
        "created_at": utcnow(),
    }


def _build_request_doc(user, data, measurement=None, vendor=None, assigned_tailor=None, tailor_profile=None):
    measurement_detail = measurement or None
    vendor_detail = clean_document(vendor) if vendor else None
    assigned_tailor_detail = {
        "id": assigned_tailor["id"],
        "full_name": assigned_tailor.get("full_name", ""),
        "email": assigned_tailor.get("email", ""),
        "role": assigned_tailor.get("role", ""),
    } if assigned_tailor else None
    status_value = data.get("status") or ("assigned" if assigned_tailor else "pending")
    document = {
        "id": next_sequence("tailoring_requests"),
        "user": user.id,
        "customer_id": user.id,
        "user_detail": {"id": user.id, "full_name": user.full_name, "email": user.email, "role": user.role},
        "vendor": vendor_detail["id"] if vendor_detail else None,
        "vendor_id": vendor_detail["id"] if vendor_detail else None,
        "vendor_detail": vendor_detail,
        "assigned_tailor": assigned_tailor_detail["id"] if assigned_tailor_detail else None,
        "tailor_id": assigned_tailor_detail["id"] if assigned_tailor_detail else None,
        "assigned_tailor_detail": assigned_tailor_detail,
        "tailor_profile_detail": tailor_profile,
        "order_type": "custom",
        "is_self_tailor": data.get("is_self_tailor", False),
        "self_tailor_name": data.get("self_tailor_name", ""),
        "self_tailor_phone": data.get("self_tailor_phone", ""),
        "self_tailor_address": data.get("self_tailor_address", ""),
        "self_tailor_notes": data.get("self_tailor_notes", ""),
        "reference_product_slug": data.get("reference_product_slug", ""),
        "product_id": data.get("reference_product_id"),
        "reference_product_name": data.get("reference_product_name", ""),
        "reference_product_image": data.get("reference_product_image", ""),
        "clothing_type": data["clothing_type"],
        "fabric": data["fabric"],
        "color": data["color"],
        "standard_size": data.get("standard_size", ""),
        "occasion_preference": data.get("occasion_preference", ""),
        "style_preference": data.get("style_preference", ""),
        "delivery_preference": data.get("delivery_preference", ""),
        "design_notes": data["design_notes"],
        "inspiration_image": data.get("inspiration_image", ""),
        "measurement": measurement_detail["id"] if measurement_detail else None,
        "measurement_detail": measurement_detail,
        "preferred_delivery_date": data.get("preferred_delivery_date"),
        "status": status_value,
        "messages": [],
        "created_at": utcnow(),
    }
    initial_message = _message_entry(
        document,
        user,
        {
            "body": "Tailoring request created.",
            "design_notes": document["design_notes"],
            "measurement_snapshot": measurement_detail or {},
            "fabric_preference": document["fabric"],
            "color_preference": document["color"],
            "status_snapshot": document["status"],
            "attachments": (
                [{"id": next_sequence("tailoring_message_attachments"), "reference_image": document["inspiration_image"], "caption": "Initial reference image", "created_at": utcnow()}]
                if document["inspiration_image"] else []
            ),
        },
    )
    document["messages"] = [initial_message]
    return document


def _request_accessible(user, document):
    user_role = _user_role(user)
    user_id = _user_id(user)
    if user_role in {"admin", "super_admin"}:
        return True
    if user_role == "tailor":
        return document.get("assigned_tailor") == user_id or document.get("tailor_id") == user_id
    if user_role == "vendor":
        return document.get("vendor_detail", {}).get("user") == user_id
    return document.get("user") == user_id


def _active_statuses():
    return {"pending", "assigned", "request_sent", "discussion_ongoing", "accepted", "in_progress"}


def _notify_tailoring_created(document):
    from apps.accounts.repository import list_users
    from apps.notifications.repository import create_notification

    customer_body = f"Your tailoring request for {document.get('clothing_type', 'your item')} was created."
    if document.get("assigned_tailor_detail"):
        customer_body = f"Your tailoring request was assigned to {document['assigned_tailor_detail'].get('full_name') or document['assigned_tailor_detail'].get('email') or 'a tailor'}."
    elif document.get("vendor_detail"):
        customer_body = f"Your tailoring request was routed to {document['vendor_detail'].get('brand_name') or 'the selected vendor'}."

    create_notification(
        user_id=document["user"],
        title="Tailoring Request Created",
        body=customer_body,
        kind="tailoring",
        event_key="tailoring_request_created",
        entity_type="tailoring_request",
        entity_id=document["id"],
        action_url=f"/tailoring/requests/{document['id']}",
    )

    if document.get("assigned_tailor"):
        create_notification(
            user_id=document["assigned_tailor"],
            title="New Tailoring Assignment",
            body=f"You have a new {document.get('clothing_type', 'tailoring')} request from {document.get('user_detail', {}).get('full_name') or document.get('user_detail', {}).get('email')}.",
            kind="tailoring",
            event_key="tailoring_request_assigned",
            entity_type="tailoring_request",
            entity_id=document["id"],
            action_url=f"/dashboard/tailor/assigned-requests",
        )

    vendor_user_id = document.get("vendor_detail", {}).get("user") if isinstance(document.get("vendor_detail"), dict) else None
    if vendor_user_id:
        create_notification(
            user_id=vendor_user_id,
            title="New Vendor Customization Request",
            body=f"A customization request for {document.get('clothing_type', 'an item')} was routed to your shop.",
            kind="tailoring",
            event_key="vendor_tailoring_request_created",
            entity_type="tailoring_request",
            entity_id=document["id"],
            action_url="/dashboard/vendor/customized",
        )

    for admin in [user for user in list_users() if user.get("role") in {"admin", "super_admin"}]:
        create_notification(
            user_id=admin["id"],
            title="New Tailoring Request",
            body=f"{document.get('user_detail', {}).get('full_name') or 'A customer'} created a tailoring request.",
            kind="tailoring",
            event_key="admin_tailoring_request_created",
            entity_type="tailoring_request",
            entity_id=document["id"],
            action_url="/dashboard/admin/analytics",
        )


def _completed_statuses():
    return {"completed"}


def _latest_request_timestamp(document):
    latest = _coerce_datetime(document.get("created_at"))
    for message in document.get("messages", []):
        candidate = _coerce_datetime(message.get("created_at"))
        if candidate and (latest is None or candidate > latest):
            latest = candidate
    return latest


def _tailor_delivery_metrics(tailor_user_id):
    requests = [
        clean_document(document)
        for document in tailoring_requests_collection().find(
            {"$or": [{"assigned_tailor": tailor_user_id}, {"tailor_id": tailor_user_id}]}
        )
    ]
    active_requests = 0
    completed_requests = 0
    turnaround_days = []
    for document in requests:
        status = str(document.get("status") or "").lower()
        if status in _active_statuses():
            active_requests += 1
        if status in _completed_statuses():
            completed_requests += 1
            created_at = _coerce_datetime(document.get("created_at"))
            completed_at = _latest_request_timestamp(document)
            if created_at and completed_at and completed_at >= created_at:
                turnaround_days.append(max((completed_at - created_at).days, 1))
    average_turnaround_days = round(sum(turnaround_days) / len(turnaround_days), 1) if turnaround_days else None
    return {
        "active_requests": active_requests,
        "completed_requests": completed_requests,
        "average_turnaround_days": average_turnaround_days,
    }


def _rating_score(profile):
    rating_value = _safe_float(profile.get("rating"))
    if rating_value is None:
        return 20.0, None
    normalized = min(max((rating_value - 3.0) / 2.0, 0.0), 1.0)
    return round(12 + normalized * 28, 2), rating_value


def _workload_score(active_requests):
    if active_requests <= 0:
        return 25.0
    if active_requests == 1:
        return 21.0
    if active_requests == 2:
        return 17.0
    if active_requests == 3:
        return 13.0
    if active_requests == 4:
        return 9.0
    return 5.0


def _experience_score(years_of_experience):
    years = max(_safe_int(years_of_experience), 0)
    return round(min(years, 12) / 12 * 20, 2)


def _delivery_speed_score(average_turnaround_days, preferred_delivery_date=None):
    urgency_bonus = 0
    if preferred_delivery_date:
        delivery_date = preferred_delivery_date
        if isinstance(delivery_date, datetime):
            delivery_date = delivery_date.date()
        if isinstance(delivery_date, str):
            try:
                delivery_date = date.fromisoformat(delivery_date)
            except ValueError:
                delivery_date = None
        if isinstance(delivery_date, date):
            days_until_due = (delivery_date - utcnow().date()).days
            if days_until_due <= 7:
                urgency_bonus = 1.5
            elif days_until_due <= 14:
                urgency_bonus = 0.75

    if average_turnaround_days is None:
        return round(8.0 + urgency_bonus, 2)
    if average_turnaround_days <= 4:
        return round(15.0 + urgency_bonus, 2)
    if average_turnaround_days <= 6:
        return round(13.0 + urgency_bonus, 2)
    if average_turnaround_days <= 8:
        return round(11.0 + urgency_bonus, 2)
    if average_turnaround_days <= 11:
        return round(8.0 + urgency_bonus, 2)
    if average_turnaround_days <= 14:
        return round(6.0 + urgency_bonus, 2)
    return round(3.0 + urgency_bonus, 2)


def _top_recommendation_reasons(profile, metrics, breakdown):
    reasons = []
    rating_value = breakdown.get("rating_value")
    if rating_value is not None and rating_value >= 4.5:
        reasons.append(f"High customer rating of {rating_value:.1f}/5")
    elif rating_value is not None:
        reasons.append(f"Solid customer rating of {rating_value:.1f}/5")
    if metrics["active_requests"] <= 1:
        reasons.append("Currently has a light active workload")
    elif metrics["active_requests"] <= 3:
        reasons.append(f"Managing a balanced workload with {metrics['active_requests']} active requests")
    if _safe_int(profile.get("years_of_experience")) >= 8:
        reasons.append(f"{profile.get('years_of_experience')} years of tailoring experience")
    elif _safe_int(profile.get("years_of_experience")) > 0:
        reasons.append(f"{profile.get('years_of_experience')} years of hands-on tailoring experience")
    turnaround_days = metrics.get("average_turnaround_days")
    if turnaround_days is not None and turnaround_days <= 7:
        reasons.append(f"Fast average completion time of about {turnaround_days} days")
    elif turnaround_days is None:
        reasons.append("Available now, with room to take on a new request")
    return reasons[:4]


def _recommendation_explanation(profile, metrics, reasons):
    tailor_name = profile.get("full_name") or profile.get("user_detail", {}).get("full_name") or "This tailor"
    summary_bits = []
    if metrics["active_requests"] <= 1:
        summary_bits.append("a lighter current workload")
    if _safe_float(profile.get("rating")) is not None:
        summary_bits.append("a strong rating")
    if _safe_int(profile.get("years_of_experience")) > 0:
        summary_bits.append("solid experience")
    if metrics.get("average_turnaround_days") is not None:
        summary_bits.append("a reliable delivery pace")
    if not summary_bits:
        summary_bits.append("good overall availability")
    return f"Recommended because {tailor_name} shows {', '.join(summary_bits[:-1]) + (' and ' if len(summary_bits) > 1 else '') + summary_bits[-1]}."


def recommend_tailor_for_request(user, data):
    recommendation_params = {"available": True}
    if data.get("city"):
        recommendation_params["city"] = data.get("city")
    if data.get("latitude") is not None and data.get("longitude") is not None:
        recommendation_params["latitude"] = data.get("latitude")
        recommendation_params["longitude"] = data.get("longitude")

    profiles = list_tailor_profiles(user, recommendation_params)
    if not profiles:
        return None

    scored_profiles = []
    preferred_delivery_date = data.get("preferred_delivery_date")
    for profile in profiles:
        metrics = _tailor_delivery_metrics(profile["user"])
        rating_component, rating_value = _rating_score(profile)
        workload_component = _workload_score(metrics["active_requests"])
        experience_component = _experience_score(profile.get("years_of_experience"))
        speed_component = _delivery_speed_score(metrics.get("average_turnaround_days"), preferred_delivery_date)
        total_score = round(rating_component + workload_component + experience_component + speed_component, 2)
        breakdown = {
            "rating": rating_component,
            "workload": workload_component,
            "experience": experience_component,
            "delivery_time": speed_component,
            "rating_value": rating_value,
            "active_requests": metrics["active_requests"],
            "average_turnaround_days": metrics.get("average_turnaround_days"),
            "completed_requests": metrics["completed_requests"],
        }
        scored_profiles.append(
            {
                "tailor": profile,
                "score": total_score,
                "breakdown": breakdown,
                "reasons": _top_recommendation_reasons(profile, metrics, breakdown),
                "explanation": _recommendation_explanation(profile, metrics, _top_recommendation_reasons(profile, metrics, breakdown)),
            }
        )

    scored_profiles.sort(
        key=lambda item: (
            -item["score"],
            item["breakdown"]["active_requests"],
            -(item["breakdown"]["rating_value"] or 0),
            -_safe_int(item["tailor"].get("years_of_experience")),
        )
    )
    best = scored_profiles[0]
    alternatives = scored_profiles[1:4]
    return {
        "recommended_tailor": best["tailor"],
        "score": best["score"],
        "explanation": best["explanation"],
        "reasons": best["reasons"],
        "score_breakdown": {
            "rating": best["breakdown"]["rating"],
            "workload": best["breakdown"]["workload"],
            "experience": best["breakdown"]["experience"],
            "delivery_time": best["breakdown"]["delivery_time"],
        },
        "delivery_metrics": {
            "active_requests": best["breakdown"]["active_requests"],
            "average_turnaround_days": best["breakdown"]["average_turnaround_days"],
            "completed_requests": best["breakdown"]["completed_requests"],
        },
        "alternatives": [
            {
                "tailor": item["tailor"],
                "score": item["score"],
                "reasons": item["reasons"],
            }
            for item in alternatives
        ],
    }


def _notify_tailoring_status(document, status_value):
    from apps.notifications.repository import create_notification

    normalized = str(status_value or "").lower()
    if normalized == "in_progress":
        create_notification(
            user_id=document["user"],
            title="Tailoring Started",
            body=f"Your tailoring request for {document.get('clothing_type', 'your item')} is now in progress.",
            kind="tailoring",
            event_key="tailoring_started",
            entity_type="tailoring_request",
            entity_id=document["id"],
            action_url=f"/tailoring/requests/{document['id']}",
        )


def list_tailoring_requests(user):
    documents = [
        _hydrate_tailoring_request_relationships(document, persist=True)
        for document in tailoring_requests_collection().find({}, sort=[("created_at", -1), ("id", -1)])
    ]
    visible = [document for document in documents if _request_accessible(user, document)]
    logger.debug(
        "Tailoring requests for user %s role %s -> %s visible records",
        getattr(user, "id", None),
        getattr(user, "role", None),
        len(visible),
    )
    return visible


def get_tailoring_request_for_user(user, request_id):
    try:
        request_id = int(request_id)
    except (TypeError, ValueError):
        return None
    document = tailoring_requests_collection().find_one({"id": request_id})
    if not document:
        return None
    document = _hydrate_tailoring_request_relationships(document, persist=True)
    return document if _request_accessible(user, document) else None


def create_tailoring_request(user, data):
    from apps.accounts.repository import get_user_by_id
    from apps.vendors.repository import get_vendor_by_id
    from apps.products.repository import get_product_by_slug

    measurement = get_measurement_for_user(user, data.get("measurement")) if data.get("measurement") else None
    vendor = get_vendor_by_id(data.get("vendor")) if data.get("vendor") else None
    if not vendor and data.get("reference_product_slug"):
        product = get_product_by_slug(data.get("reference_product_slug"))
        vendor_id = _safe_int_or_none((product or {}).get("vendor"))
        vendor = get_vendor_by_id(vendor_id) if vendor_id else None
    assigned_tailor, _, tailor_profile = _resolve_tailor_assignment(data.get("assigned_tailor"))
    document = _build_request_doc(user, data, measurement=measurement, vendor=vendor, assigned_tailor=assigned_tailor, tailor_profile=tailor_profile)
    tailoring_requests_collection().insert_one(prepare_document_for_mongo(document))
    created = _hydrate_tailoring_request_relationships(document, persist=True)
    if created.get("tailor_id") or created.get("assigned_tailor"):
        from apps.chats.repository import sync_tailoring_request_conversation

        sync_tailoring_request_conversation(created)
    _notify_tailoring_created(created)
    return created


def update_tailoring_request(user, request_id, updates):
    document = get_tailoring_request_for_user(user, request_id)
    if not document:
        return None
    if user.role not in {"admin", "super_admin", "vendor", "tailor"} and document["user"] != user.id:
        return None
    allowed = {
        "assigned_tailor", "status", "vendor", "vendor_id", "is_self_tailor", "self_tailor_name", "self_tailor_phone",
        "self_tailor_address", "self_tailor_notes", "reference_product_slug", "reference_product_name",
        "reference_product_id", "product_id", "reference_product_image", "clothing_type", "fabric", "color", "standard_size", "occasion_preference",
        "style_preference", "delivery_preference", "design_notes", "inspiration_image", "measurement",
        "preferred_delivery_date",
    }
    payload = {key: value for key, value in updates.items() if key in allowed}
    if "assigned_tailor" in payload and payload.get("assigned_tailor"):
        assigned_tailor, assigned_tailor_detail, tailor_profile = _resolve_tailor_assignment(payload.get("assigned_tailor"))
        if assigned_tailor:
            payload["assigned_tailor"] = assigned_tailor["id"]
            payload["tailor_id"] = assigned_tailor["id"]
            payload["assigned_tailor_detail"] = assigned_tailor_detail
            payload["tailor_profile_detail"] = tailor_profile
    if "assigned_tailor" in payload and payload.get("assigned_tailor") and "status" not in payload:
        payload["status"] = "assigned"
    if "measurement" in payload and payload.get("measurement"):
        measurement_detail = clean_document(measurements_collection().find_one({"id": _safe_int_or_none(payload.get("measurement"))}))
        if measurement_detail:
            payload["measurement_detail"] = measurement_detail
    tailoring_requests_collection().update_one({"id": document["id"]}, {"$set": prepare_document_for_mongo(payload)})
    updated_raw = tailoring_requests_collection().find_one({"id": document["id"]})
    updated = _hydrate_tailoring_request_relationships(updated_raw, persist=True)
    if not _request_accessible(user, updated):
        return None
    if updated and (updated.get("tailor_id") or updated.get("assigned_tailor")):
        from apps.chats.repository import sync_tailoring_request_conversation

        sync_tailoring_request_conversation(updated)
    return updated


def list_tailoring_messages(user, request_id=None):
    messages = []
    for document in list_tailoring_requests(user):
        if request_id and document["id"] != int(request_id):
            continue
        messages.extend(document.get("messages", []))
    messages.sort(key=lambda item: item.get("created_at"))
    return messages


def add_tailoring_message(user, data):
    document = get_tailoring_request_for_user(user, data["request"])
    if not document:
        return None
    previous_status = document.get("status")
    attachments = data.get("attachments", [])
    entry = _message_entry(document, user, {**data, "attachments": attachments})
    messages = document.get("messages", [])
    messages.append(entry)
    update_payload = {"messages": messages}
    if entry.get("status_snapshot"):
        update_payload["status"] = entry["status_snapshot"]
    elif document.get("status") == "request_sent":
        update_payload["status"] = "discussion_ongoing"
    tailoring_requests_collection().update_one({"id": document["id"]}, {"$set": prepare_document_for_mongo(update_payload)})
    next_status = update_payload.get("status", previous_status)
    if next_status != previous_status:
        _notify_tailoring_status(document, next_status)
    updated_document = tailoring_requests_collection().find_one({"id": document["id"]})
    updated_document = _hydrate_tailoring_request_relationships(updated_document, persist=False)
    if updated_document and (updated_document.get("tailor_id") or updated_document.get("assigned_tailor")):
        from apps.chats.repository import sync_tailoring_request_conversation

        sync_tailoring_request_conversation(updated_document, actor=user)
    return entry
