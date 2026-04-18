from common.mongo import clean_document, get_collection, next_sequence, prepare_document_for_mongo, utcnow


def saved_outfits_collection():
    return get_collection("saved_outfits")


def style_preferences_collection():
    return get_collection("style_preferences")


def saved_design_concepts_collection():
    return get_collection("saved_design_concepts")


def save_outfit(user, payload):
    document = {
        "id": next_sequence("saved_outfits"),
        "user_id": user.id,
        "user_detail": {
            "id": user.id,
            "full_name": getattr(user, "full_name", ""),
            "email": getattr(user, "email", ""),
            "role": getattr(user, "role", ""),
        },
        "title": payload.get("title") or payload.get("outfit") or "Saved AI outfit",
        "occasion": payload.get("occasion", ""),
        "weather": payload.get("weather", ""),
        "mood": payload.get("mood", ""),
        "body_type": payload.get("body_type", ""),
        "budget": payload.get("budget", ""),
        "fabric": payload.get("fabric", ""),
        "outfit": payload.get("outfit", ""),
        "fit_type": payload.get("fit_type", ""),
        "comfort_score": payload.get("comfort_score"),
        "breathability": payload.get("breathability"),
        "search_query": payload.get("search_query", ""),
        "image_url": payload.get("image_url", ""),
        "notes": payload.get("notes", ""),
        "created_at": utcnow(),
    }
    mongo_document = prepare_document_for_mongo(document)
    saved_outfits_collection().insert_one(mongo_document)
    return clean_document(mongo_document)


def list_saved_outfits(user):
    return [
        clean_document(document)
        for document in saved_outfits_collection().find({"user_id": user.id}, sort=[("created_at", -1), ("id", -1)])
    ]


def update_style_preferences(user, payload):
    existing = style_preferences_collection().find_one({"user_id": user.id})
    updates = {
        "user_id": user.id,
        "favorite_occasion": payload.get("occasion", ""),
        "favorite_weather": payload.get("weather", ""),
        "favorite_mood": payload.get("mood", ""),
        "body_type": payload.get("body_type", ""),
        "budget": payload.get("budget", ""),
        "preferred_outfit": payload.get("outfit", ""),
        "preferred_fabric": payload.get("fabric", ""),
        "updated_at": utcnow(),
    }
    update_payload = {"$set": prepare_document_for_mongo(updates)}
    if not existing:
        update_payload["$setOnInsert"] = {"id": next_sequence("style_preferences"), "created_at": utcnow()}
    style_preferences_collection().update_one({"user_id": user.id}, update_payload, upsert=True)
    return clean_document(style_preferences_collection().find_one({"user_id": user.id}))


def get_style_preferences(user):
    return clean_document(style_preferences_collection().find_one({"user_id": user.id}))


def save_design_concept(user, payload):
    document = {
        "id": next_sequence("saved_design_concepts"),
        "user_id": user.id,
        "user_detail": {
            "id": user.id,
            "full_name": getattr(user, "full_name", ""),
            "email": getattr(user, "email", ""),
            "role": getattr(user, "role", ""),
        },
        "prompt": payload.get("prompt", ""),
        "title": payload.get("title") or "AI design concept",
        "garment_type": payload.get("garment_type", ""),
        "style_direction": payload.get("style_direction", ""),
        "colors": payload.get("colors", []),
        "fabric": payload.get("fabric", ""),
        "pattern_ideas": payload.get("pattern_ideas", []),
        "notes": payload.get("notes", ""),
        "occasion": payload.get("occasion", ""),
        "image_url": payload.get("image_url", ""),
        "image_source": payload.get("image_source", ""),
        "image_prompt": payload.get("image_prompt", ""),
        "image_generation_status": payload.get("image_generation_status", ""),
        "created_at": utcnow(),
    }
    mongo_document = prepare_document_for_mongo(document)
    saved_design_concepts_collection().insert_one(mongo_document)
    return clean_document(mongo_document)


def list_saved_design_concepts(user):
    return [
        clean_document(document)
        for document in saved_design_concepts_collection().find({"user_id": user.id}, sort=[("created_at", -1), ("id", -1)])
    ]
