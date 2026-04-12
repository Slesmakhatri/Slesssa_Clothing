from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.serializers import ProductSerializer

from .repository import (
    get_style_preferences,
    list_saved_design_concepts,
    list_saved_outfits,
    save_design_concept,
    save_outfit,
    update_style_preferences,
)
from .serializers import (
    ChatbotRequestSerializer,
    DesignSuggestionRequestSerializer,
    DesignSuggestionSaveSerializer,
    DesignSuggestionSerializer,
    FashionRecommendationSerializer,
    OutfitSaveSerializer,
    RecommendationRequestSerializer,
    WeatherRequestSerializer,
)
from .services import (
    analyze_uploaded_outfit,
    build_recommendation_sections,
    chatbot_assistant_reply,
    fetch_weather_insight,
    generate_design_suggestion,
    generate_fashion_recommendation,
    generate_weekly_plan,
    recommend_products,
)


def _request_user(request):
    return request.user if getattr(request.user, "is_authenticated", False) else None


class RecommendationAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_recommendation_sections(user=_request_user(request))
        return Response(
            {
                "message": "Recommended products based on recent catalog and shopper signals.",
                "recommended": ProductSerializer(payload["recommended"], many=True, context={"request": request}).data,
                "sections": {
                    key: {
                        **value,
                        "items": ProductSerializer(value.get("items", []), many=True, context={"request": request}).data,
                    }
                    for key, value in payload["sections"].items()
                },
            }
        )

    def post(self, request):
        serializer = RecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = build_recommendation_sections(user=_request_user(request), preferences=serializer.validated_data, limit=serializer.validated_data.get("limit", 8))
        return Response(
            {
                "message": "Recommended products based on your preferences.",
                "recommended": ProductSerializer(payload["recommended"], many=True, context={"request": request}).data,
                "sections": {
                    key: {
                        **value,
                        "items": ProductSerializer(value.get("items", []), many=True, context={"request": request}).data,
                    }
                    for key, value in payload["sections"].items()
                },
            }
        )


class FashionRecommendationAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = FashionRecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preferences = dict(serializer.validated_data)
        weather_payload = {}
        if preferences.get("city") or preferences.get("latitude") is not None:
            try:
                weather_payload = fetch_weather_insight(
                    city=preferences.get("city", ""),
                    latitude=preferences.get("latitude"),
                    longitude=preferences.get("longitude"),
                )
                preferences["weather"] = preferences.get("weather") or weather_payload.get("weather", "")
            except Exception:
                weather_payload = {}

        recommendation = generate_fashion_recommendation(user=_request_user(request), preferences=preferences)
        if _request_user(request):
            update_style_preferences(request.user, {**preferences, **recommendation})
        weekly_plan = generate_weekly_plan(user=_request_user(request), preferences=preferences)
        return Response(
            {
                "message": "AI fashion recommendation generated successfully.",
                "recommendation": {
                    key: recommendation[key]
                    for key in ("fabric", "outfit", "fit_type", "comfort_score", "breathability", "search_query", "image_url", "image_source", "style_note")
                    if key in recommendation
                },
                "products": ProductSerializer(recommendation.get("products", []), many=True, context={"request": request}).data,
                "weather": weather_payload or None,
                "weekly_plan": weekly_plan,
                "preferences": preferences,
            }
        )


class WeatherAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = WeatherRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = fetch_weather_insight(**serializer.validated_data)
        except Exception:
            return Response({"detail": "Weather service is unavailable right now."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(payload)


class UploadAnalysisAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        upload = request.FILES.get("image")
        try:
            payload = analyze_uploaded_outfit(upload)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payload)


class SaveOutfitAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "saved": list_saved_outfits(request.user),
                "preferences": get_style_preferences(request.user),
            }
        )

    def post(self, request):
        serializer = OutfitSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = save_outfit(request.user, serializer.validated_data)
        update_style_preferences(request.user, serializer.validated_data)
        return Response(document, status=status.HTTP_201_CREATED)


class DesignSuggestionAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DesignSuggestionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suggestion = generate_design_suggestion(serializer.validated_data)
        return Response(
            {
                "message": "AI design suggestion generated successfully.",
                "suggestion": suggestion,
                "source": "rule_based_structured_generator",
            }
        )


class SaveDesignSuggestionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"saved": list_saved_design_concepts(request.user)})

    def post(self, request):
        serializer = DesignSuggestionSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = save_design_concept(request.user, serializer.validated_data)
        return Response(document, status=status.HTTP_201_CREATED)


class WardrobePlanAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = FashionRecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = generate_weekly_plan(user=_request_user(request), preferences=serializer.validated_data)
        return Response({"weekly_plan": plan})


class ChatbotAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = chatbot_assistant_reply(serializer.validated_data["message"], user=_request_user(request))
        return Response(
            {
                "message": payload["message"],
                "products": ProductSerializer(payload["products"], many=True, context={"request": request}).data,
                "filters": payload.get("filters", {}),
                "vendors": payload.get("vendors", []),
                "intent": payload.get("intent", "general"),
                "actions": payload.get("actions", []),
            }
        )
