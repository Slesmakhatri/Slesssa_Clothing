from rest_framework import serializers


class SupportMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    sender_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    sender_detail = serializers.JSONField(read_only=True, allow_null=True)
    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.CharField()
    message = serializers.CharField()
    status = serializers.ChoiceField(choices=["new", "read", "replied", "closed"], required=False, default="new")
    target_type = serializers.ChoiceField(choices=["admin", "vendor"], required=False, default="admin")
    vendor_user_id = serializers.IntegerField(required=False, allow_null=True)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_blank=True)
    vendor_name = serializers.CharField(required=False, allow_blank=True)
    reply_note = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
