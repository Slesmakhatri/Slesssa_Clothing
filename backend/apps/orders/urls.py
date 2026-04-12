from rest_framework.routers import DefaultRouter

from .views import CartViewSet, OrderViewSet, ReturnRequestViewSet, TrackingViewSet, VoucherViewSet, WishlistViewSet

router = DefaultRouter()
router.register("cart", CartViewSet, basename="cart")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("orders", OrderViewSet, basename="orders")
router.register("tracking", TrackingViewSet, basename="tracking")
router.register("return-requests", ReturnRequestViewSet, basename="return-requests")
router.register("vouchers", VoucherViewSet, basename="vouchers")

urlpatterns = router.urls
