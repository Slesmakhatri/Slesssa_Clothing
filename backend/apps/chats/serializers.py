from rest_framework import serializers


class ChatConversationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    kind = serializers.ChoiceField(choices=["customer_vendor", "customer_tailor", "vendor_admin"])
    conversation_type = serializers.ChoiceField(choices=["vendor_chat", "tailor_chat", "vendor_admin"], read_only=True)
    participant_user_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    customer_id = serializers.IntegerField(read_only=True, allow_null=True)
    admin_id = serializers.IntegerField(read_only=True, allow_null=True)
    tailor_id = serializers.IntegerField(read_only=True, allow_null=True)
    customer_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    customer_detail = serializers.JSONField(read_only=True, allow_null=True)
    vendor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_id = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_detail = serializers.JSONField(read_only=True, allow_null=True)
    admin_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    admin_detail = serializers.JSONField(read_only=True, allow_null=True)
    tailor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    tailor_detail = serializers.JSONField(read_only=True, allow_null=True)
    product_id = serializers.IntegerField(read_only=True, allow_null=True)
    product_detail = serializers.JSONField(read_only=True, allow_null=True)
    order_id = serializers.IntegerField(read_only=True, allow_null=True)
    order_detail = serializers.JSONField(read_only=True, allow_null=True)
    return_request_id = serializers.IntegerField(read_only=True, allow_null=True)
    return_request_detail = serializers.JSONField(read_only=True, allow_null=True)
    tailoring_request_id = serializers.IntegerField(read_only=True, allow_null=True)
    tailoring_request_detail = serializers.JSONField(read_only=True, allow_null=True)
    custom_request_id = serializers.IntegerField(read_only=True, allow_null=True)
    subject = serializers.CharField(read_only=True, allow_blank=True)
    support_topic = serializers.CharField(read_only=True, allow_blank=True)
    is_closed = serializers.BooleanField(read_only=True)
    counterparty_detail = serializers.JSONField(read_only=True, allow_null=True)
    context_summary = serializers.CharField(read_only=True, allow_blank=True)
    unread_count = serializers.IntegerField(read_only=True)
    last_message = serializers.JSONField(read_only=True, allow_null=True)
    last_message_preview = serializers.CharField(read_only=True, allow_blank=True)
    last_message_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class ChatConversationCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["customer_vendor", "customer_tailor", "vendor_admin"], required=False)
    conversation_type = serializers.ChoiceField(choices=["vendor_chat", "tailor_chat", "vendor_admin"], required=False)
    vendor_user_id = serializers.IntegerField(required=False, allow_null=True)
    admin_user_id = serializers.IntegerField(required=False, allow_null=True)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    order_id = serializers.IntegerField(required=False, allow_null=True)
    return_request_id = serializers.IntegerField(required=False, allow_null=True)
    tailoring_request_id = serializers.IntegerField(required=False, allow_null=True)
    custom_request_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True)
    support_topic = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        kind_by_type = {
            "vendor_chat": "customer_vendor",
            "tailor_chat": "customer_tailor",
            "vendor_admin": "vendor_admin",
        }
        kind = attrs.get("kind") or kind_by_type.get(attrs.get("conversation_type"))
        if not kind:
            raise serializers.ValidationError({"conversation_type": "This field is required."})
        attrs["kind"] = kind
        return attrs


class ChatMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    conversation_id = serializers.IntegerField(read_only=True)
    sender_id = serializers.IntegerField(read_only=True)
    sender_user_id = serializers.IntegerField(read_only=True)
    sender_role = serializers.CharField(read_only=True, allow_blank=True)
    sender_detail = serializers.JSONField(read_only=True)
    body = serializers.CharField()
    attachment = serializers.CharField(read_only=True, allow_blank=True)
    is_read = serializers.BooleanField(read_only=True)
    read_by_user_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ChatMessageCreateSerializer(serializers.Serializer):
    conversation = serializers.IntegerField()
    body = serializers.CharField()
