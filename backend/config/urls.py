from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from .views import ApiRootAPIView, BackendRootAPIView, FaviconAPIView

urlpatterns = [
    path("", BackendRootAPIView.as_view(), name="backend-root"),
    path("favicon.ico", FaviconAPIView.as_view(), name="favicon"),
    path("api/", ApiRootAPIView.as_view(), name="api-root"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/account/", include("apps.accounts.profile_urls")),
    path("api/", include("apps.vendors.urls")),
    path("api/", include("apps.products.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.tailoring.urls")),
    path("api/", include("apps.reviews.urls")),
    path("api/", include("apps.support.urls")),
    path("api/", include("apps.chats.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.dashboards.urls")),
    path("api/", include("apps.ai_services.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
