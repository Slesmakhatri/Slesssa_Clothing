from django.urls import path

from .views import PasswordChangeAPIView, ProfileAPIView

urlpatterns = [
    path("profile/", ProfileAPIView.as_view(), name="account-profile"),
    path("password/", PasswordChangeAPIView.as_view(), name="account-password"),
]
