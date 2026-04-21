from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from common.storage import store_uploaded_file

from .repository import (
    create_or_get_conversation,
    get_conversation_for_user,
    list_conversations,
    list_messages_for_conversation,
    mark_conversation_read,
    send_message,
    set_conversation_closed,
)
from .serializers import ChatConversationCreateSerializer, ChatConversationSerializer, ChatMessageCreateSerializer, ChatMessageSerializer


def mutable_request_data(request):
    if hasattr(request.data, "copy"):
        return request.data.copy()
    return dict(request.data)


class ChatConversationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(ChatConversationSerializer(list_conversations(request.user, request.query_params), many=True).data)

    def retrieve(self, request, pk=None):
        conversation = get_conversation_for_user(request.user, pk)
        if not conversation:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatConversationSerializer(conversation).data)

    def create(self, request):
        serializer = ChatConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            conversation = create_or_get_conversation(request.user, serializer.validated_data)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ChatConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class ChatMessageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        conversation_id = request.query_params.get("conversation")
        messages = list_messages_for_conversation(request.user, conversation_id)
        if messages is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatMessageSerializer(messages, many=True).data)

    def create(self, request):
        payload = mutable_request_data(request)
        attachment = ""
        if "attachment" in request.FILES:
            attachment = store_uploaded_file(request.FILES["attachment"], "chat/messages")
            payload.pop("attachment", None)
        serializer = ChatMessageCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            document = send_message(
                request.user,
                serializer.validated_data["conversation"],
                {"body": serializer.validated_data["body"], "attachment": attachment},
            )
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatMessageSerializer(document).data, status=status.HTTP_201_CREATED)


class ChatConversationMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        messages = list_messages_for_conversation(request.user, pk)
        if messages is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatMessageSerializer(messages, many=True).data)

    def post(self, request, pk=None):
        payload = mutable_request_data(request)
        attachment = ""
        if "attachment" in request.FILES:
            attachment = store_uploaded_file(request.FILES["attachment"], "chat/messages")
            payload.pop("attachment", None)
        payload["conversation"] = pk
        serializer = ChatMessageCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            document = send_message(
                request.user,
                serializer.validated_data["conversation"],
                {"body": serializer.validated_data["body"], "attachment": attachment},
            )
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatMessageSerializer(document).data, status=status.HTTP_201_CREATED)


class ChatConversationReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        conversation = mark_conversation_read(request.user, pk)
        if not conversation:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatConversationSerializer(conversation).data)


class ChatConversationCloseAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        try:
            conversation = set_conversation_closed(request.user, pk, request.data.get("is_closed", True))
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if not conversation:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatConversationSerializer(conversation).data)
