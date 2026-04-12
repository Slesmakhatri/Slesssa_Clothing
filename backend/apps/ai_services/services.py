from collections import Counter
from decimal import Decimal
from io import BytesIO
import json
import re
from urllib.parse import quote_plus

import requests
from django.conf import settings

from common.mongo import clean_document, get_collection

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency guard
    Image = None


COLOR_ALIASES = {
    "black": {"black"},
    "white": {"white", "ivory", "offwhite", "off-white"},
    "red": {"red", "maroon", "burgundy", "crimson"},
    "blue": {"blue", "navy", "teal"},
    "green": {"green", "olive", "sage"},
    "yellow": {"yellow", "mustard"},
    "gold": {"gold", "golden"},
    "silver": {"silver", "grey", "gray"},
    "pink": {"pink", "rose", "blush"},
    "purple": {"purple", "lavender", "violet"},
    "beige": {"beige", "nude", "tan", "camel", "cream"},
    "brown": {"brown", "chocolate", "coffee"},
    "orange": {"orange", "rust", "terracotta"},
}

CATEGORY_ALIASES = {
    "kurta": {"kurta", "kurtas"},
    "dress": {"dress", "dresses", "gown", "gowns"},
    "shirt": {"shirt", "shirts"},
    "suit": {"suit", "suits", "tuxedo", "tuxedos"},
    "blazer": {"blazer", "blazers"},
    "jacket": {"jacket", "jackets", "coat", "coats"},
    "hoodie": {"hoodie", "hoodies"},
    "t-shirt": {"t-shirt", "tshirts", "tee", "tees"},
    "trouser": {"pant", "pants", "trouser", "trousers"},
    "jeans": {"denim", "jeans", "jean"},
    "skirt": {"skirt", "skirts"},
    "tracksuit": {"tracksuit", "track", "trackset", "track-set"},
}

OCCASION_ALIASES = {
    "casual": {"casual", "daily", "everyday", "weekend", "college"},
    "formal": {"formal", "office", "work", "corporate"},
    "party": {"party", "night", "evening"},
    "gym": {"gym", "workout", "training"},
    "wedding": {"wedding", "bridal", "marriage", "reception"},
    "festive": {"festive", "festival", "dashain", "tihar"},
}

BODY_TYPE_GUIDE = {
    "slim": {"fit": "regular", "note": "adds clean structure without looking too sharp"},
    "bulky": {"fit": "regular", "note": "keeps movement easy and avoids unnecessary bulk"},
    "average": {"fit": "regular", "note": "balances comfort and shape"},
    "tall": {"fit": "oversized", "note": "works well with longer proportions"},
    "short": {"fit": "slim-fit", "note": "keeps the look tidy and length-conscious"},
}

WEATHER_GUIDE = {
    "hot": {"fabric": "cotton", "comfort": 9, "breathability": 10},
    "cold": {"fabric": "wool", "comfort": 8, "breathability": 5},
    "rainy": {"fabric": "nylon blend", "comfort": 7, "breathability": 6},
    "mild": {"fabric": "linen blend", "comfort": 8, "breathability": 8},
}

MOOD_GUIDE = {
    "minimal": {"fit": "regular", "style": "clean lines and soft neutral tones"},
    "stylish": {"fit": "slim-fit", "style": "sharper silhouette with elevated details"},
    "comfy": {"fit": "oversized", "style": "easy layering and relaxed comfort"},
}

BUDGET_PRICE_CAP = {"low": Decimal("3000"), "medium": Decimal("5500"), "high": Decimal("12000")}

STOPWORDS = {
    "i",
    "want",
    "need",
    "show",
    "me",
    "a",
    "an",
    "the",
    "for",
    "with",
    "in",
    "on",
    "and",
    "or",
    "please",
    "suggest",
    "something",
    "some",
    "look",
    "looks",
    "outfit",
    "outfits",
    "clothes",
    "clothing",
}

DESIGN_COLOR_MAP = {
    "modern": ["Charcoal", "Ivory", "Deep Olive"],
    "traditional": ["Maroon", "Gold", "Cream"],
    "minimal": ["Stone", "Black", "Ivory"],
    "festive": ["Emerald", "Wine", "Antique Gold"],
    "wedding": ["Ivory", "Gold", "Rose"],
    "nepali": ["Crimson", "Cream", "Muted Gold"],
}

DESIGN_FABRIC_MAP = {
    "kurta": "Cotton-silk blend",
    "dress": "Soft silk blend",
    "shirt": "Premium cotton",
    "suit": "Structured wool blend",
    "blazer": "Structured wool blend",
    "jacket": "Textured wool blend",
    "default": "Linen-cotton blend",
}

DESIGN_PATTERN_MAP = {
    "modern": ["Clean placket lines", "Minimal contrast piping", "Structured cuff detail"],
    "traditional": ["Tone-on-tone embroidery", "Heritage border trim", "Handcrafted button loop accents"],
    "nepali": ["Dhaka-inspired neckline detail", "Subtle topi-pattern cuff accents", "Traditional woven panel highlight"],
    "festive": ["Metallic thread motifs", "Statement collar finish", "Occasion-ready hem detailing"],
    "minimal": ["Hidden button stand", "Monochrome stitch lines", "Sharp silhouette panels"],
}


def products_collection():
    return get_collection("products")


def orders_collection():
    return get_collection("orders")


def wishlists_collection():
    return get_collection("wishlists")


def carts_collection():
    return get_collection("carts")


def vendors_collection():
    return get_collection("vendors")


def _pick_design_colors(tokens, preferred_colors=None):
    preferred_colors = preferred_colors or []
    if preferred_colors:
        return preferred_colors[:3]
    for key, palette in DESIGN_COLOR_MAP.items():
        if key in tokens:
            return palette
    return ["Ivory", "Camel", "Muted Teal"]


def _detect_design_garment(tokens):
    for canonical, values in CATEGORY_ALIASES.items():
        if any(value in tokens for value in values):
            return canonical.title()
    return "Kurta"


def _detect_design_style(tokens):
    if "traditional" in tokens and "modern" in tokens:
        return "Modern-traditional fusion"
    if "traditional" in tokens:
        return "Refined traditional styling"
    if "minimal" in tokens:
        return "Minimal contemporary styling"
    if "festive" in tokens or "wedding" in tokens:
        return "Festive statement styling"
    return "Modern tailored styling"


def _pick_pattern_ideas(tokens):
    selected = []
    for key, values in DESIGN_PATTERN_MAP.items():
        if key in tokens:
            selected.extend(values)
    if not selected:
        selected.extend(DESIGN_PATTERN_MAP["modern"])
    deduped = []
    for item in selected:
        if item not in deduped:
            deduped.append(item)
    return deduped[:4]


def _detect_design_fit(tokens):
    if {"slim", "fitted", "tailored"} & tokens:
        return "Slim tailored fit"
    if {"relaxed", "loose", "comfortable", "comfy"} & tokens:
        return "Relaxed comfortable fit"
    if {"oversized", "boxy"} & tokens:
        return "Structured oversized fit"
    if {"formal", "office"} & tokens:
        return "Clean structured fit"
    return "Regular made-to-measure fit"


def _detect_design_neckline(tokens, garment_type):
    if "suit" in garment_type.lower() or "blazer" in garment_type.lower():
        return "Notched lapel with a clean shirt collar line"
    if {"vneck", "v-neck", "v"} & tokens:
        return "Soft V-neckline"
    if {"mandarin", "band", "collar"} & tokens:
        return "Mandarin collar neckline"
    if {"boat", "wide"} & tokens:
        return "Boat neckline"
    if {"round", "crew"} & tokens:
        return "Round neckline"
    if "kurta" in garment_type.lower():
        return "Mandarin collar with a short placket"
    return "Clean modest neckline"


def generate_design_suggestion(payload):
    prompt = (payload.get("prompt") or "").strip()
    lowered = prompt.lower()
    tokens = set(_tokenize(lowered))
    garment_type = _detect_design_garment(tokens)
    style_direction = _detect_design_style(tokens)
    colors = _pick_design_colors(tokens, payload.get("preferred_colors"))
    fabric = DESIGN_FABRIC_MAP.get(garment_type.lower(), DESIGN_FABRIC_MAP["default"])
    fit = _detect_design_fit(tokens)
    neckline = _detect_design_neckline(tokens, garment_type)
    pattern_ideas = _pick_pattern_ideas(tokens)
    occasion = payload.get("occasion") or ("Festive wear" if "festive" in tokens or "wedding" in tokens else "Versatile occasion wear")
    notes = (
        f"This concept keeps the {garment_type.lower()} visually current with {style_direction.lower()}, "
        f"uses {fabric.lower()} for comfort and structure, builds the look around {', '.join(colors[:2]).lower()} tones, "
        f"and finishes it with {fit.lower()} plus {neckline.lower()}."
    )
    title = f"{style_direction} {garment_type}".strip()
    return {
        "title": title,
        "garment_type": garment_type,
        "style_direction": style_direction,
        "colors": colors,
        "fabric": fabric,
        "fit": fit,
        "neckline": neckline,
        "pattern_ideas": pattern_ideas,
        "notes": notes,
        "occasion": occasion,
    }


def _active_products():
    return [clean_document(item) for item in products_collection().find({"is_active": True})]


def _safe_decimal(value):
    return Decimal(str(value or 0))


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _text_blob(product):
    parts = [
        product.get("name", ""),
        product.get("title", ""),
        product.get("description", ""),
        product.get("category_name", ""),
        (product.get("category_detail") or {}).get("name", ""),
        " ".join(product.get("colors", []) or []),
        " ".join(product.get("fabric_options", []) or []),
        product.get("badge", ""),
        product.get("vendor_name", ""),
    ]
    return " ".join(str(part) for part in parts if part).lower()


def _score_trending(product):
    score = 0
    score += _safe_int(product.get("popularity", 0)) * 2
    score += _safe_int(product.get("reviews_count", 0)) * 3
    score += int(float(product.get("rating", 0) or 0) * 10)
    if product.get("is_featured"):
        score += 20
    if product.get("is_new_arrival"):
        score += 16
    return score


def _tokenize(text):
    return [token for token in re.split(r"[^a-z0-9+-]+", (text or "").lower()) if token]


def _extract_keyword(tokens, aliases):
    joined = " ".join(tokens)
    for canonical, values in aliases.items():
        for value in values:
            if value in tokens or value in joined:
                return canonical
    return ""


def _extract_price_range(text):
    lowered = (text or "").lower()
    between = re.search(r"(?:between|from)\s*(\d{3,6})\s*(?:and|to|-)\s*(\d{3,6})", lowered)
    if between:
        low = Decimal(between.group(1))
        high = Decimal(between.group(2))
        return (min(low, high), max(low, high))

    under = re.search(r"(?:under|below|less than|max(?:imum)?|upto|up to)\s*(?:npr\s*)?(\d{3,6})", lowered)
    if under:
        return (None, Decimal(under.group(1)))

    above = re.search(r"(?:above|over|more than|starting at|from)\s*(?:npr\s*)?(\d{3,6})", lowered)
    if above:
        return (Decimal(above.group(1)), None)
    return (None, None)


def extract_product_keywords(message):
    tokens = _tokenize(message)
    min_price, max_price = _extract_price_range(message)
    query_terms = [token for token in tokens if token not in STOPWORDS and not token.isdigit()]
    return {
        "category": _extract_keyword(tokens, CATEGORY_ALIASES),
        "color": _extract_keyword(tokens, COLOR_ALIASES),
        "occasion": _extract_keyword(tokens, OCCASION_ALIASES),
        "gender": "women" if "women" in tokens else "men" if "men" in tokens else "",
        "min_price": min_price,
        "max_price": max_price,
        "terms": query_terms,
        "text": (message or "").strip().lower(),
    }


def _price_matches(product_price, *, min_price=None, max_price=None):
    if min_price is not None and product_price < min_price:
        return False
    if max_price is not None and product_price > max_price:
        return False
    return True


def _gender_matches(product, gender):
    if not gender:
        return True
    haystack = _text_blob(product)
    if gender == "women":
        return any(term in haystack for term in ("women", "woman", "ladies", "female", "dress", "skirt", "lehenga"))
    if gender == "men":
        return any(term in haystack for term in ("men", "man", "male", "shirt", "blazer", "kurta"))
    return True


def _recent_products(products, limit=8):
    ordered = sorted(products, key=lambda item: (item.get("created_at"), item.get("id", 0)), reverse=True)
    return ordered[:limit]


def _product_by_id(product_id):
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return None
    for product in _active_products():
        if product.get("id") == product_id:
            return product
    return None


def _user_history(user):
    if not getattr(user, "is_authenticated", False):
        return {"category_ids": set(), "product_ids": set(), "colors": set(), "average_price": None}

    orders = [clean_document(item) for item in orders_collection().find({"user_id": user.id})]
    wishlist = clean_document(wishlists_collection().find_one({"user_id": user.id}) or {"items": []})
    cart = clean_document(carts_collection().find_one({"user_id": user.id}) or {"items": []})

    category_ids = set()
    product_ids = set()
    colors = set()
    prices = []

    def consume_product(product, product_id=None, price=None):
        category_id = product.get("category")
        if category_id:
            category_ids.add(category_id)
        if product_id:
            product_ids.add(product_id)
        colors.update(color.lower() for color in product.get("colors", []) if color)
        if price is not None:
            prices.append(_safe_decimal(price))

    for order in orders:
        for item in order.get("items", []):
            consume_product(item.get("product_detail") or {}, item.get("product"), item.get("price"))
    for item in wishlist.get("items", []):
        consume_product(item.get("product_detail") or {}, item.get("product"), (item.get("product_detail") or {}).get("price"))
    for item in cart.get("items", []):
        consume_product(item.get("product_detail") or {}, item.get("product"), (item.get("product_detail") or {}).get("price"))

    average_price = (sum(prices) / Decimal(len(prices))) if prices else None
    return {"category_ids": category_ids, "product_ids": product_ids, "colors": colors, "average_price": average_price}


def _product_similarity_score(product, anchor):
    if not product or not anchor or product.get("id") == anchor.get("id"):
        return -1
    score = 0
    if product.get("category") and product.get("category") == anchor.get("category"):
        score += 40
    product_colors = {color.lower() for color in product.get("colors", []) if color}
    anchor_colors = {color.lower() for color in anchor.get("colors", []) if color}
    if product_colors.intersection(anchor_colors):
        score += 20
    product_fabrics = {str(item).lower() for item in product.get("fabric_options", []) if item}
    anchor_fabrics = {str(item).lower() for item in anchor.get("fabric_options", []) if item}
    if product_fabrics.intersection(anchor_fabrics):
        score += 16
    product_text = _text_blob(product)
    anchor_terms = {
        token for token in _tokenize(
            " ".join(
                [
                    anchor.get("name", ""),
                    anchor.get("description", ""),
                    anchor.get("badge", ""),
                    anchor.get("category_name", ""),
                ]
            )
        )
        if token not in STOPWORDS
    }
    score += min(18, sum(3 for token in anchor_terms if token in product_text))
    score += int(float(product.get("rating", 0) or 0) * 3)
    score += min(15, _safe_int(product.get("reviews_count", 0)))
    return score


def _trending_products(limit=8):
    products = _active_products()
    ranked = sorted(
        products,
        key=lambda item: (_score_trending(item), item.get("created_at"), item.get("id", 0)),
        reverse=True,
    )
    return ranked[:limit]


def _recent_view_products(recent_viewed_ids):
    recent_ids = []
    for value in recent_viewed_ids or []:
        try:
            recent_ids.append(int(value))
        except (TypeError, ValueError):
            continue
    products = []
    for product_id in recent_ids:
        product = _product_by_id(product_id)
        if product:
            products.append(product)
    return products


def _recommendation_profile(user=None, recent_viewed_ids=None):
    history = _user_history(user)
    recent_products = _recent_view_products(recent_viewed_ids)
    recent_categories = {item.get("category") for item in recent_products if item.get("category")}
    recent_colors = {
        color.lower()
        for item in recent_products
        for color in (item.get("colors", []) or [])
        if color
    }
    recent_product_ids = {item.get("id") for item in recent_products if item.get("id")}
    return {
        **history,
        "recent_products": recent_products,
        "recent_categories": recent_categories,
        "recent_colors": recent_colors,
        "recent_product_ids": recent_product_ids,
    }


def _personalized_score(product, *, preferences=None, profile=None):
    preferences = preferences or {}
    profile = profile or {}
    score = _score_trending(product)
    product_price = _safe_decimal(product.get("price", 0))
    product_colors = {color.lower() for color in product.get("colors", []) if color}
    product_text = _text_blob(product)

    if product.get("category") in profile.get("category_ids", set()):
        score += 26
    if product.get("category") in profile.get("recent_categories", set()):
        score += 22
    if product_colors.intersection(profile.get("colors", set())):
        score += 12
    if product_colors.intersection(profile.get("recent_colors", set())):
        score += 14
    if profile.get("average_price") is not None:
        diff = abs(product_price - profile["average_price"])
        if diff <= Decimal("1000"):
            score += 14
        elif diff <= Decimal("2500"):
            score += 7

    for anchor in profile.get("recent_products", []):
        similarity = _product_similarity_score(product, anchor)
        if similarity > 0:
            score += min(24, int(similarity / 4))

    category_value = (preferences.get("category") or "").strip().lower()
    color_value = (preferences.get("color_preference") or "").strip().lower()
    style_value = (preferences.get("style_preference") or "").strip().lower()
    occasion_value = (preferences.get("occasion") or "").strip().lower()
    gender_value = (preferences.get("gender") or "").strip().lower()
    min_price = _safe_decimal(preferences["min_price"]) if preferences.get("min_price") not in (None, "") else None
    max_price = _safe_decimal(preferences["max_price"]) if preferences.get("max_price") not in (None, "") else None

    if category_value and category_value in product_text:
        score += 18
    if color_value:
        accepted = COLOR_ALIASES.get(color_value, {color_value})
        if product_colors.intersection(accepted) or any(term in product_text for term in accepted):
            score += 18
    if style_value and style_value in product_text:
        score += 12
    if occasion_value and occasion_value in product_text:
        score += 12
    if gender_value and _gender_matches(product, gender_value):
        score += 6
    if not _price_matches(product_price, min_price=min_price, max_price=max_price):
        return None
    return score


def recommend_products(user=None, preferences=None, limit=8):
    preferences = preferences or {}
    products = _active_products()
    history = _user_history(user)

    category_value = (preferences.get("category") or "").strip().lower()
    color_value = (preferences.get("color_preference") or "").strip().lower()
    occasion_value = (preferences.get("occasion") or "").strip().lower()
    style_value = (preferences.get("style_preference") or "").strip().lower()
    gender_value = (preferences.get("gender") or "").strip().lower()
    min_price = _safe_decimal(preferences["min_price"]) if preferences.get("min_price") not in (None, "") else None
    max_price = _safe_decimal(preferences["max_price"]) if preferences.get("max_price") not in (None, "") else None

    scored = []
    for product in products:
        if product.get("id") in history["product_ids"]:
            continue

        text = _text_blob(product)
        product_price = _safe_decimal(product.get("price", 0))
        product_colors = {color.lower() for color in product.get("colors", []) if color}
        score = _score_trending(product)

        if history["category_ids"] and product.get("category") in history["category_ids"]:
            score += 28
        if history["colors"] and product_colors.intersection(history["colors"]):
            score += 12
        if history["average_price"] is not None:
            diff = abs(product_price - history["average_price"])
            if diff <= Decimal("1000"):
                score += 15
            elif diff <= Decimal("2500"):
                score += 8

        if category_value and category_value in text:
            score += 28
        if color_value:
            accepted = COLOR_ALIASES.get(color_value, {color_value})
            if product_colors.intersection(accepted) or any(term in text for term in accepted):
                score += 24
        if occasion_value and occasion_value in text:
            score += 20
        if style_value and style_value in text:
            score += 12
        if gender_value and _gender_matches(product, gender_value):
            score += 8
        if not _price_matches(product_price, min_price=min_price, max_price=max_price):
            continue
        scored.append((score, product))

    scored.sort(key=lambda item: (item[0], _score_trending(item[1]), item[1].get("created_at"), item[1].get("id", 0)), reverse=True)
    ranked = [product for _, product in scored[:limit]]
    return ranked or _recent_products(products, limit=limit)


def build_recommendation_sections(user=None, preferences=None, *, limit=8):
    preferences = preferences or {}
    current_product_id = preferences.get("current_product_id") or preferences.get("product_id")
    recent_viewed_ids = preferences.get("recent_viewed_ids") or []
    current_product = _product_by_id(current_product_id) if current_product_id else None
    profile = _recommendation_profile(user=user, recent_viewed_ids=recent_viewed_ids)
    products = _active_products()

    personalized_scored = []
    for product in products:
        if product.get("id") in profile.get("product_ids", set()):
            continue
        if product.get("id") in profile.get("recent_product_ids", set()):
            continue
        score = _personalized_score(product, preferences=preferences, profile=profile)
        if score is None:
            continue
        personalized_scored.append((score, product))
    personalized_scored.sort(key=lambda item: (item[0], _score_trending(item[1]), item[1].get("created_at"), item[1].get("id", 0)), reverse=True)

    if personalized_scored:
        recommended_for_you = [product for _, product in personalized_scored[:limit]]
        recommended_reason = "Ranked from browsing history, cart/order patterns, and live trending signals."
    else:
        recommended_for_you = _trending_products(limit=limit)
        recommended_reason = "New-user fallback based on live trending products."

    similar_items = []
    if current_product:
        similar_scored = []
        for product in products:
            similarity = _product_similarity_score(product, current_product)
            if similarity > 0:
                similar_scored.append((similarity + _score_trending(product), product))
        similar_scored.sort(key=lambda item: (item[0], item[1].get("created_at"), item[1].get("id", 0)), reverse=True)
        similar_items = [product for _, product in similar_scored[:limit]]

    trending_now = _trending_products(limit=limit)
    fallback_recommended = recommended_for_you or trending_now
    return {
        "recommended": fallback_recommended,
        "sections": {
            "recommended_for_you": {
                "title": "Recommended for You",
                "description": recommended_reason,
                "items": recommended_for_you,
            },
            "similar_items": {
                "title": "Similar Items",
                "description": "Matched by category, colors, fabric cues, and product-style overlap." if current_product else "Open a product to unlock similar-item ranking.",
                "items": similar_items,
            },
            "trending_now": {
                "title": "Trending Now",
                "description": "Ranked from popularity, ratings, reviews, and featured freshness.",
                "items": trending_now,
            },
        },
    }


def chatbot_product_search(message, limit=8):
    extracted = extract_product_keywords(message)
    products = _active_products()
    matched = []

    for product in products:
        text = _text_blob(product)
        product_price = _safe_decimal(product.get("price", 0))
        score = _score_trending(product)

        if extracted["category"] and extracted["category"] in text:
            score += 40
        if extracted["color"]:
            accepted = COLOR_ALIASES.get(extracted["color"], {extracted["color"]})
            product_colors = {entry.lower() for entry in product.get("colors", []) if entry}
            if product_colors.intersection(accepted) or any(term in text for term in accepted):
                score += 30
        if extracted["occasion"] and extracted["occasion"] in text:
            score += 22
        if extracted["gender"] and _gender_matches(product, extracted["gender"]):
            score += 10
        if not _price_matches(product_price, min_price=extracted["min_price"], max_price=extracted["max_price"]):
            continue

        for term in extracted["terms"]:
            if term in text:
                score += 5

        if score > _score_trending(product):
            matched.append((score, product))

    matched.sort(key=lambda item: (item[0], item[1].get("created_at"), item[1].get("id", 0)), reverse=True)
    exact_products = [product for _, product in matched[:limit]]
    if exact_products:
        return {
            "message": "Here are some matching products.",
            "products": exact_products,
            "filters": extracted,
        }

    return {
        "message": "I could not find an exact match, so here are some close recommendations.",
        "products": recommend_products(
            preferences={
                "category": extracted["category"],
                "color_preference": extracted["color"],
                "occasion": extracted["occasion"],
                "gender": extracted["gender"],
                "min_price": extracted["min_price"],
                "max_price": extracted["max_price"],
            },
            limit=limit,
        ),
        "filters": extracted,
    }


def _recent_user_orders(user, limit=3):
    if not getattr(user, "is_authenticated", False):
        return []
    orders = [clean_document(item) for item in orders_collection().find({"user_id": user.id}, sort=[("created_at", -1), ("id", -1)])]
    return orders[:limit]


def _approved_vendors():
    return [clean_document(item) for item in vendors_collection().find({"approval_status": "approved"})]


def chatbot_assistant_reply(message, user=None, limit=6):
    lowered = (message or "").strip().lower()
    reply = {"message": "", "products": [], "filters": {}, "vendors": [], "intent": "general", "actions": []}

    if any(term in lowered for term in ["track my order", "track order", "where is my order", "order status"]):
        reply["intent"] = "order_tracking"
        if not getattr(user, "is_authenticated", False):
            reply["message"] = "Log in first, then ask me to track your order. I can show your latest order status or help you use the order tracking page."
            reply["actions"] = ["Log in", "Open order tracking"]
            return reply
        latest_order = _recent_user_orders(user, limit=1)
        if latest_order:
            order = latest_order[0]
            reply["message"] = f"Your latest order {order.get('order_number', '')} is currently {str(order.get('status', 'pending')).replace('_', ' ')} with payment marked as {order.get('payment_status', 'pending')}."
        else:
            reply["message"] = "I could not find any order yet. You can place one from the cart, then I can help you track it."
        reply["actions"] = ["Track another order", "Open customer dashboard"]
        return reply

    if any(term in lowered for term in ["payment", "esewa", "khalti", "refund", "pay"]):
        reply["intent"] = "payment_help"
        reply["message"] = "Slessaa supports cash on delivery plus eSewa and Khalti sandbox payments. If payment verification fails, check the payment page again or contact support with your order number."
        reply["actions"] = ["Checkout help", "Contact support"]
        return reply

    if any(term in lowered for term in ["customize", "customisation", "customization", "tailor", "measurement", "measurements", "fit estimate"]):
        reply["intent"] = "customization_help"
        reply["message"] = "For customization, start with a design reference or describe your idea, use the smart measurement assistant to estimate editable measurements, then choose the recommended tailor or let the workflow assign one. The tailor score uses rating, workload, experience, delivery speed, and location where available."
        reply["actions"] = ["Open tailoring page", "Estimate my measurements", "Recommend a tailor", "Generate design suggestion"]
        return reply

    if any(term in lowered for term in ["vendor", "shop", "seller", "which vendor"]):
        reply["intent"] = "vendor_recommendation"
        extracted = extract_product_keywords(message)
        vendors = _approved_vendors()
        category_hint = extracted.get("category") or ""
        ranked = []
        for vendor in vendors:
            vendor_text = " ".join(
                [
                    vendor.get("brand_name", ""),
                    vendor.get("description", ""),
                    vendor.get("specialization", ""),
                    vendor.get("location", ""),
                ]
            ).lower()
            score = 0
            if category_hint and category_hint in vendor_text:
                score += 20
            score += sum(4 for token in extracted.get("terms", []) if token in vendor_text)
            if vendor.get("is_shop_setup_complete"):
                score += 10
            ranked.append((score, vendor))
        ranked.sort(key=lambda item: item[0], reverse=True)
        reply["vendors"] = [
            {
                "id": item["id"],
                "user": item.get("user"),
                "brand_name": item.get("brand_name", ""),
                "slug": item.get("slug", ""),
                "specialization": item.get("specialization", ""),
                "location": item.get("location") or item.get("address", ""),
            }
            for _, item in ranked[:3]
        ]
        if reply["vendors"]:
            reply["message"] = "Here are vendors that look most suitable based on your request and approved shop profiles."
        else:
            reply["message"] = "I could not match a specific vendor yet. Try mentioning the product type, occasion, or whether you need customization."
        reply["actions"] = ["Recommend a vendor", "Show customizable products"]
        return reply

    if any(term in lowered for term in ["design", "choose a design", "style help", "what should i buy", "help me choose", "kurta", "neckline", "fabric", "wedding look"]):
        reply["intent"] = "design_help"
        reply["message"] = "Share the occasion, garment type, color mood, and fit preference. For example, 'modern kurta for wedding in ivory'. I can turn that into a structured design brief with style, fabric, color, fit, neckline, and pattern ideas on the tailoring page."
        reply["actions"] = ["Open tailoring page", "Generate design suggestion", "Recommend festive products", "Recommend a vendor"]
        return reply

    payload = chatbot_product_search(message, limit=limit)
    reply["intent"] = "product_search"
    reply["message"] = payload["message"]
    reply["products"] = payload["products"]
    reply["filters"] = payload.get("filters", {})
    reply["actions"] = ["Help me customize a product", "Track my order", "Recommend a vendor"]
    return reply


def _coarse_weather_label(temperature, precipitation):
    if precipitation > 0.8:
        return "rainy"
    if temperature >= 28:
        return "hot"
    if temperature <= 14:
        return "cold"
    return "mild"


def fetch_weather_insight(*, city="", latitude=None, longitude=None):
    if latitude is None or longitude is None:
        if city:
            geocode = requests.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": city, "count": 1, "language": "en", "format": "json"},
                timeout=8,
            )
            geocode.raise_for_status()
            result = (geocode.json().get("results") or [{}])[0]
            latitude = result.get("latitude")
            longitude = result.get("longitude")
            city = result.get("name") or city
    if latitude is None or longitude is None:
        return {
            "city": city or "Kathmandu",
            "temperature_c": 22,
            "weather": "mild",
            "summary": "Mild weather detected.",
        }

    forecast = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,precipitation,weather_code",
            "timezone": "auto",
        },
        timeout=8,
    )
    forecast.raise_for_status()
    current = (forecast.json() or {}).get("current", {})
    temperature = _safe_float(current.get("temperature_2m"), 22)
    precipitation = _safe_float(current.get("precipitation"), 0)
    weather = _coarse_weather_label(temperature, precipitation)
    return {
        "city": city or "Current location",
        "temperature_c": round(temperature, 1),
        "weather": weather,
        "summary": f"{weather.title()} weather around {round(temperature, 1)}°C.",
    }


def _fallback_recommendation(preferences, weather_hint=""):
    occasion = (preferences.get("occasion") or "casual").strip().lower()
    weather = (preferences.get("weather") or weather_hint or "mild").strip().lower()
    mood = (preferences.get("mood") or "minimal").strip().lower()
    body_type = (preferences.get("body_type") or "average").strip().lower()

    weather_rule = WEATHER_GUIDE.get(weather, WEATHER_GUIDE["mild"])
    mood_rule = MOOD_GUIDE.get(mood, MOOD_GUIDE["minimal"])
    body_rule = BODY_TYPE_GUIDE.get(body_type, BODY_TYPE_GUIDE["average"])

    outfit = {
        "casual": "t-shirt and straight jeans",
        "formal": "shirt with tailored trousers",
        "party": "dressy blazer set",
        "gym": "tracksuit and breathable tee",
        "wedding": "kurta set",
        "festive": "embroidered kurta or statement dress",
    }.get(occasion, "smart casual layers")

    fit_type = mood_rule["fit"] if mood == "comfy" else body_rule["fit"]
    search_query = f"{weather} {occasion} {outfit} {weather_rule['fabric']}"
    return {
        "fabric": weather_rule["fabric"],
        "outfit": outfit,
        "fit_type": fit_type,
        "comfort_score": max(6, min(10, weather_rule["comfort"] + (1 if mood == "comfy" else 0))),
        "breathability": max(4, min(10, weather_rule["breathability"] + (1 if weather == "hot" else 0))),
        "search_query": search_query,
        "style_note": f"Best for {body_type} frames and {mood_rule['style']}.",
    }


def _openrouter_headers():
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    if settings.OPENROUTER_APP_TITLE:
        headers["X-Title"] = settings.OPENROUTER_APP_TITLE
    return headers


def _extract_json_payload(text):
    if not text:
        return {}
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _call_openrouter_recommendation(preferences):
    if not settings.OPENROUTER_API_KEY:
        return {}

    prompt = (
        "Suggest the best outfit based on:\n"
        f"Occasion: {preferences.get('occasion', '')}\n"
        f"Weather: {preferences.get('weather', '')}\n"
        f"Mood: {preferences.get('mood', '')}\n"
        f"Body Type: {preferences.get('body_type', '')}\n"
        f"Budget: {preferences.get('budget', '')}\n\n"
        "Return strict JSON only with keys:\n"
        "{fabric, outfit, fit_type, comfort_score, breathability, search_query}"
    )

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=_openrouter_headers(),
        json={
            "model": settings.OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": "You are a fashion stylist that returns concise valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()
    content = (((payload.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
    return _extract_json_payload(content)


def fetch_style_image(search_query, fallback_products=None):
    fallback_products = fallback_products or []
    try:
        if settings.PEXELS_API_KEY:
            response = requests.get(
                "https://api.pexels.com/v1/search",
                headers={"Authorization": settings.PEXELS_API_KEY},
                params={"query": search_query, "per_page": 1, "orientation": "portrait"},
                timeout=12,
            )
            response.raise_for_status()
            photo = (response.json().get("photos") or [{}])[0]
            if photo.get("src", {}).get("large"):
                return {"image_url": photo["src"]["large"], "image_source": "pexels"}

        if settings.UNSPLASH_ACCESS_KEY:
            response = requests.get(
                "https://api.unsplash.com/search/photos",
                headers={"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"},
                params={"query": search_query, "per_page": 1, "orientation": "portrait"},
                timeout=12,
            )
            response.raise_for_status()
            photo = (response.json().get("results") or [{}])[0]
            if photo.get("urls", {}).get("regular"):
                return {"image_url": photo["urls"]["regular"], "image_source": "unsplash"}
    except requests.RequestException:
        pass

    if fallback_products:
        first = fallback_products[0]
        return {"image_url": first.get("image_url") or first.get("image") or first.get("main_image") or "", "image_source": "catalog"}

    return {
        "image_url": f"https://source.unsplash.com/featured/1200x1600/?{quote_plus(search_query or 'fashion outfit')}",
        "image_source": "unsplash-source",
    }


def generate_fashion_recommendation(user=None, preferences=None):
    preferences = preferences or {}
    weather_hint = (preferences.get("weather") or "").strip().lower()
    ai_payload = {}
    try:
        ai_payload = _call_openrouter_recommendation(preferences)
    except requests.RequestException:
        ai_payload = {}

    recommendation = _fallback_recommendation(preferences, weather_hint=weather_hint)
    recommendation.update({key: value for key, value in ai_payload.items() if value not in (None, "")})
    recommendation["comfort_score"] = int(_safe_float(recommendation.get("comfort_score"), 8))
    recommendation["breathability"] = int(_safe_float(recommendation.get("breathability"), 8))

    budget = (preferences.get("budget") or "").strip().lower()
    product_preferences = {
        "occasion": preferences.get("occasion", ""),
        "category": recommendation.get("outfit", "").split(" and ")[0].split()[-1] if recommendation.get("outfit") else "",
        "style_preference": preferences.get("mood", ""),
    }
    if budget in BUDGET_PRICE_CAP:
        product_preferences["max_price"] = BUDGET_PRICE_CAP[budget]
    products = recommend_products(user=user, preferences=product_preferences, limit=6)
    image = fetch_style_image(recommendation.get("search_query", ""), fallback_products=products)
    recommendation.update(image)
    recommendation["products"] = products
    return recommendation


def _nearest_color_name(rgb):
    palette = {
        "black": (35, 35, 35),
        "white": (240, 240, 240),
        "beige": (210, 190, 160),
        "blue": (90, 120, 180),
        "green": (90, 130, 90),
        "red": (180, 70, 70),
        "brown": (125, 92, 72),
        "pink": (215, 150, 170),
        "grey": (150, 150, 150),
    }
    return min(palette.items(), key=lambda item: sum(abs(channel - target) for channel, target in zip(rgb, item[1])))[0]


def analyze_uploaded_outfit(upload):
    if not upload:
        raise ValueError("Please upload an outfit image.")
    if Image is None:
        raise ValueError("Image analysis is unavailable because Pillow is not installed.")

    image = Image.open(BytesIO(upload.read())).convert("RGB")
    image.thumbnail((180, 180))
    pixels = list(image.getdata())
    dominant = Counter(_nearest_color_name(pixel) for pixel in pixels).most_common(3)
    average_brightness = sum(sum(pixel) / 3 for pixel in pixels) / max(len(pixels), 1)
    average_contrast = max(sum(pixel) / 3 for pixel in pixels) - min(sum(pixel) / 3 for pixel in pixels)

    if average_brightness < 95:
        style = "moody streetwear"
    elif average_contrast > 120:
        style = "bold statement"
    elif dominant and dominant[0][0] in {"white", "beige", "grey", "black"}:
        style = "minimal clean"
    else:
        style = "casual contemporary"

    color_names = [name for name, _ in dominant]
    suggestions = [
        f"Lean into the {style} mood with cleaner layering." if style else "Keep the silhouette balanced.",
        f"Accent the palette with {' and '.join(color_names[:2])} friendly accessories." if color_names else "Use one accent color to make the look pop.",
    ]
    if "minimal" in style:
        suggestions.append("A sharper trouser or structured overshirt would elevate the look.")
    elif "bold" in style:
        suggestions.append("Keep one hero color and simplify the rest of the outfit for better balance.")
    else:
        suggestions.append("A better fabric contrast such as denim with cotton or wool would improve depth.")

    return {
        "style": style,
        "colors": color_names,
        "suggestions": suggestions,
    }


def generate_weekly_plan(user=None, preferences=None, days=7):
    base = preferences or {}
    weather_cycle = ["mild", "hot", "rainy", "mild", "cold", "mild", "mild"]
    occasion_cycle = ["casual", "formal", "party", "casual", "formal", "wedding", "casual"]
    used_outfits = set()
    plan = []

    for index in range(days):
        day_preferences = {
            **base,
            "weather": base.get("weather") or weather_cycle[index % len(weather_cycle)],
            "occasion": occasion_cycle[index % len(occasion_cycle)],
            "mood": base.get("mood") or ("minimal" if index % 2 == 0 else "comfy"),
        }
        recommendation = generate_fashion_recommendation(user=user, preferences=day_preferences)
        if recommendation["outfit"] in used_outfits:
            recommendation["fit_type"] = "regular" if recommendation["fit_type"] != "regular" else "oversized"
            recommendation["outfit"] = f"{recommendation['outfit']} variation"
        used_outfits.add(recommendation["outfit"])
        plan.append(
            {
                "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index % 7],
                "weather": day_preferences["weather"],
                "occasion": day_preferences["occasion"],
                "outfit": recommendation["outfit"],
                "fabric": recommendation["fabric"],
                "fit_type": recommendation["fit_type"],
                "image_url": recommendation.get("image_url", ""),
            }
        )
    return plan
