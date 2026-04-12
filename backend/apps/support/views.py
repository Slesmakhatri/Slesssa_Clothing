from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .repository import create_support_message, get_support_message, list_support_messages, update_support_message
from .serializers import SupportMessageSerializer


class SupportMessageViewSet(viewsets.ViewSet):
    pagination_class = None

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        return Response(SupportMessageSerializer(list_support_messages(request.user), many=True).data)

    def create(self, request):
        serializer = SupportMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        document = create_support_message(user, serializer.validated_data)
        return Response(SupportMessageSerializer(document).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        document = get_support_message(pk)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "vendor" and document.get("vendor_user_id") != request.user.id:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in {"admin", "super_admin", "vendor"}:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        serializer = SupportMessageSerializer(data={**document, **request.data}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_support_message(document["id"], serializer.validated_data)
        return Response(SupportMessageSerializer(updated).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)
