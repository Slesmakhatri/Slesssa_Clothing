from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import VendorApplicationAPIView, VendorProfileViewSet

router = DefaultRouter()
router.register("vendors", VendorProfileViewSet, basename="vendors")

urlpatterns = [
    *router.urls,
    path("vendor-applications/", VendorApplicationAPIView.as_view(), name="vendor-applications"),
]
