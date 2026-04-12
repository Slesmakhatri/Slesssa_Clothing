FABRIC_SUSTAINABILITY_PROFILES = [
    {
        "keywords": ["linen", "luxe linen", "textured linen", "linen blend"],
        "leaf_score": 5,
        "impact_band": "Lower impact",
        "badge": "Lower-impact fabric",
        "note": "Linen-based fabrics are treated as a stronger eco-conscious option because they are breathable and typically lower-impact than synthetic-heavy alternatives.",
    },
    {
        "keywords": ["handloom cotton", "structured cotton", "textured cotton", "premium cotton", "cotton twill", "cotton"],
        "leaf_score": 4,
        "impact_band": "Lower impact",
        "badge": "Natural fiber",
        "note": "Cotton-based fabrics are treated as a practical lower-impact option in this educational model because they are natural fibers and widely reusable across seasons.",
    },
    {
        "keywords": ["wool blend", "wool"],
        "leaf_score": 3,
        "impact_band": "Moderate impact",
        "badge": "Long-wear fabric",
        "note": "Wool blends are treated as moderate impact because they can support durability and colder-weather longevity, but they are not scored as highly as lighter natural fibers.",
    },
    {
        "keywords": ["soft denim", "denim"],
        "leaf_score": 3,
        "impact_band": "Moderate impact",
        "badge": "Durable staple",
        "note": "Denim is treated as moderate impact in this simplified model because it is durable and versatile, but not automatically low-impact.",
    },
    {
        "keywords": ["silk touch", "raw silk blend", "silk blend", "silk"],
        "leaf_score": 3,
        "impact_band": "Moderate impact",
        "badge": "Occasion fabric",
        "note": "Silk-based fabrics are treated as moderate impact in this model. They can be long-lasting for occasion wear, but they are not presented as a low-impact default.",
    },
    {
        "keywords": ["jacquard", "brocade", "crepe", "tech crepe"],
        "leaf_score": 2,
        "impact_band": "Higher impact",
        "badge": "Special finish",
        "note": "Heavily finished fabrics are treated as a higher-impact choice in this simplified guide because they tend to involve more processing than core natural-fiber staples.",
    },
    {
        "keywords": ["satin luxe", "satin finish", "satin"],
        "leaf_score": 2,
        "impact_band": "Higher impact",
        "badge": "Higher-impact finish",
        "note": "Satin-style finishes are treated as a lower sustainability option in this educational model because they are often more processed or synthetic-feeling choices.",
    },
]


def _normalized(value):
    return str(value or "").strip().lower()


def _unique_list(items):
    seen = set()
    ordered = []
    for item in items:
        key = _normalized(item)
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append(item)
    return ordered


def get_fabric_sustainability(fabric_name):
    normalized = _normalized(fabric_name)
    if not normalized:
        return {
            "fabric": "",
            "leaf_score": 0,
            "impact_band": "Unknown impact",
            "badge": "",
            "note": "Not enough fabric information is available to estimate sustainability guidance for this option.",
        }

    for profile in FABRIC_SUSTAINABILITY_PROFILES:
        if any(keyword in normalized for keyword in profile["keywords"]):
            return {
                "fabric": fabric_name,
                "leaf_score": profile["leaf_score"],
                "impact_band": profile["impact_band"],
                "badge": profile["badge"],
                "note": profile["note"],
            }

    return {
        "fabric": fabric_name,
        "leaf_score": 2,
        "impact_band": "Moderate impact",
        "badge": "Material guidance limited",
        "note": "This fabric is shown with a cautious default score because the catalog does not yet include enough material sourcing detail for a stronger sustainability claim.",
    }


def summarize_product_sustainability(product):
    fabrics = _unique_list(product.get("fabric_options") or [])
    if not fabrics:
        return {
            "sustainability_score": None,
            "sustainability_leaf_score": 0,
            "sustainability_label": "Guidance unavailable",
            "impact_band": "Unknown impact",
            "eco_badges": ["Material data limited"],
            "sustainability_note": "This product does not yet include enough fabric data for a meaningful sustainability estimate.",
            "fabric_guidance": [],
        }

    evaluations = [get_fabric_sustainability(fabric) for fabric in fabrics]
    average_leaf_score = round(sum(item["leaf_score"] for item in evaluations) / len(evaluations))
    sustainability_score = int(round((average_leaf_score / 5) * 100))
    if average_leaf_score >= 4:
        label = "Better fabric choice"
        impact_band = "Lower impact"
    elif average_leaf_score >= 3:
        label = "Balanced fabric choice"
        impact_band = "Moderate impact"
    else:
        label = "Style-first fabric choice"
        impact_band = "Higher impact"

    eco_badges = _unique_list([item["badge"] for item in evaluations if item.get("badge")])
    top_fabric = sorted(evaluations, key=lambda item: item["leaf_score"], reverse=True)[0]
    return {
        "sustainability_score": sustainability_score,
        "sustainability_leaf_score": average_leaf_score,
        "sustainability_label": label,
        "impact_band": impact_band,
        "eco_badges": eco_badges,
        "sustainability_note": top_fabric["note"],
        "fabric_guidance": evaluations,
    }


def sustainable_alternatives_for_product(product, products, limit=4):
    current_id = product.get("id")
    current_category = _normalized((product.get("category_detail") or {}).get("name") or product.get("category_name") or product.get("category"))
    current_summary = summarize_product_sustainability(product)
    current_score = current_summary["sustainability_score"] or 0

    ranked = []
    for candidate in products:
        if candidate.get("id") == current_id or not candidate.get("is_active", True):
            continue
        candidate_summary = summarize_product_sustainability(candidate)
        candidate_score = candidate_summary["sustainability_score"] or 0
        if candidate_score <= current_score or candidate_score == 0:
            continue

        candidate_category = _normalized((candidate.get("category_detail") or {}).get("name") or candidate.get("category_name") or candidate.get("category"))
        category_bonus = 30 if candidate_category and candidate_category == current_category else 0
        ranked.append((candidate_score + category_bonus, candidate, candidate_summary))

    ranked.sort(key=lambda item: (item[0], item[1].get("rating", 0), item[1].get("popularity", 0), item[1].get("id", 0)), reverse=True)

    alternatives = []
    for _, candidate, summary in ranked[:limit]:
        alternatives.append(
            {
                "id": candidate.get("id"),
                "slug": candidate.get("slug", ""),
                "name": candidate.get("name", ""),
                "category_name": (candidate.get("category_detail") or {}).get("name") or candidate.get("category_name", ""),
                "price": candidate.get("price"),
                "main_image": candidate.get("main_image", "") or candidate.get("external_image_url", ""),
                "fabric_options": candidate.get("fabric_options", []),
                "sustainability_score": summary["sustainability_score"],
                "sustainability_leaf_score": summary["sustainability_leaf_score"],
                "sustainability_label": summary["sustainability_label"],
                "impact_band": summary["impact_band"],
                "eco_badges": summary["eco_badges"],
            }
        )
    return alternatives
