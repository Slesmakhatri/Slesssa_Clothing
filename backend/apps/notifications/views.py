from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .repository import list_notifications, mark_all_notifications_read, mark_notification_read
from .serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_only = bool(request.query_params.get("unread"))
        limit = request.query_params.get("limit") or 20
        items = list_notifications(request.user, unread_only=unread_only, limit=limit)
        unread_count = len(list_notifications(request.user, unread_only=True, limit=200))
        return Response(
            {
                "notifications": NotificationSerializer(items, many=True).data,
                "unread_count": unread_count,
            }
        )


class NotificationReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        item = mark_notification_read(request.user, notification_id)
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(NotificationSerializer(item).data)


class NotificationReadAllAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mark_all_notifications_read(request.user)
        return Response({"detail": "Notifications marked as read."})
