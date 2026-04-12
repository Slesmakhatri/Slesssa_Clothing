from django.urls import path

from .views import NotificationListAPIView, NotificationReadAllAPIView, NotificationReadAPIView

urlpatterns = [
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/read-all/", NotificationReadAllAPIView.as_view(), name="notifications-read-all"),
    path("notifications/<int:notification_id>/read/", NotificationReadAPIView.as_view(), name="notifications-read"),
]
