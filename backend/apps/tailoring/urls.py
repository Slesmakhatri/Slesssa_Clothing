from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MeasurementSuggestionAPIView,
    MeasurementViewSet,
    TailorProfileViewSet,
    TailorRecommendationViewSet,
    TailoringMessageViewSet,
    TailoringRequestViewSet,
)

router = DefaultRouter()
router.register("measurements", MeasurementViewSet, basename="measurements")
router.register("tailor-profiles", TailorProfileViewSet, basename="tailor-profiles")
router.register("tailor-recommendations", TailorRecommendationViewSet, basename="tailor-recommendations")
router.register("tailoring-requests", TailoringRequestViewSet, basename="tailoring-requests")
router.register("tailoring-messages", TailoringMessageViewSet, basename="tailoring-messages")

urlpatterns = [
    path("measurement-suggestions/", MeasurementSuggestionAPIView.as_view(), name="measurement-suggestions"),
] + router.urls
