from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AuthRootAPIView, GoogleAuthConfigAPIView, GoogleLoginAPIView, LoginAPIView, RegisterAPIView, UserAdminViewSet

router = DefaultRouter()
router.register("users", UserAdminViewSet, basename="admin-users")

urlpatterns = [
    path("", AuthRootAPIView.as_view(), name="auth-root"),
    path("register/", RegisterAPIView.as_view(), name="auth-register"),
    path("login/", LoginAPIView.as_view(), name="auth-login"),
    path("google/config/", GoogleAuthConfigAPIView.as_view(), name="auth-google-config"),
    path("google/login/", GoogleLoginAPIView.as_view(), name="auth-google-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
] + router.urls
