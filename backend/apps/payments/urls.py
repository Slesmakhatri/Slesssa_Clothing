from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PaymentInitiationAPIView, PaymentVerificationAPIView, PaymentViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payments")

urlpatterns = [
    path("payments/initiate/", PaymentInitiationAPIView.as_view(), name="payment-initiate"),
    path("payments/verify/", PaymentVerificationAPIView.as_view(), name="payment-verify"),
] + router.urls
