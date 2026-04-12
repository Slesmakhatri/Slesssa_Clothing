from rest_framework.routers import DefaultRouter

from .views import SupportMessageViewSet

router = DefaultRouter()
router.register("support-messages", SupportMessageViewSet, basename="support-messages")

urlpatterns = router.urls
