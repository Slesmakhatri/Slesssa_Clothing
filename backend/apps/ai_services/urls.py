from django.urls import path

from .views import (
    ChatbotAPIView,
    DesignSuggestionAPIView,
    FashionRecommendationAPIView,
    RecommendationAPIView,
    SaveDesignSuggestionAPIView,
    SaveOutfitAPIView,
    UploadAnalysisAPIView,
    WardrobePlanAPIView,
    WeatherAPIView,
)

urlpatterns = [
    path("recommendations/", RecommendationAPIView.as_view(), name="recommendations"),
    path("recommend/", FashionRecommendationAPIView.as_view(), name="recommend"),
    path("weather/", WeatherAPIView.as_view(), name="weather"),
    path("upload/", UploadAnalysisAPIView.as_view(), name="upload-style"),
    path("save-outfit/", SaveOutfitAPIView.as_view(), name="save-outfit"),
    path("design-suggestion/", DesignSuggestionAPIView.as_view(), name="design-suggestion"),
    path("save-design-suggestion/", SaveDesignSuggestionAPIView.as_view(), name="save-design-suggestion"),
    path("wardrobe-plan/", WardrobePlanAPIView.as_view(), name="wardrobe-plan"),
    path("chatbot/", ChatbotAPIView.as_view(), name="chatbot"),
]
