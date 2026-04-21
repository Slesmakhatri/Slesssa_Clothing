from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatConversationCloseAPIView, ChatConversationMessagesAPIView, ChatConversationReadAPIView, ChatConversationViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register("chat/conversations", ChatConversationViewSet, basename="chat-conversations")
router.register("chat/messages", ChatMessageViewSet, basename="chat-messages")

urlpatterns = [
    *router.urls,
    path("chat/conversations/<int:pk>/read/", ChatConversationReadAPIView.as_view(), name="chat-conversations-read"),
    path("chat/conversations/<int:pk>/close/", ChatConversationCloseAPIView.as_view(), name="chat-conversations-close"),
    path("messages/conversations/", ChatConversationViewSet.as_view({"get": "list"}), name="messages-conversations"),
    path("messages/conversations/start/", ChatConversationViewSet.as_view({"post": "create"}), name="messages-conversations-start"),
    path("messages/conversations/<int:pk>/", ChatConversationViewSet.as_view({"get": "retrieve"}), name="messages-conversations-detail"),
    path("messages/conversations/<int:pk>/messages/", ChatConversationMessagesAPIView.as_view(), name="messages-conversation-messages"),
    path("messages/conversations/<int:pk>/read/", ChatConversationReadAPIView.as_view(), name="messages-conversations-read"),
    path("messages/conversations/<int:pk>/close/", ChatConversationCloseAPIView.as_view(), name="messages-conversations-close"),
]
