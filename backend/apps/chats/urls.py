from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatConversationReadAPIView, ChatConversationViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register("chat/conversations", ChatConversationViewSet, basename="chat-conversations")
router.register("chat/messages", ChatMessageViewSet, basename="chat-messages")

urlpatterns = [
    *router.urls,
    path("chat/conversations/<int:pk>/read/", ChatConversationReadAPIView.as_view(), name="chat-conversations-read"),
]
