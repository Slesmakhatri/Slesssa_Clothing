from rest_framework.routers import DefaultRouter

from .views import ProductQuestionViewSet, ReviewViewSet

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="reviews")
router.register("product-questions", ProductQuestionViewSet, basename="product-questions")

urlpatterns = router.urls
