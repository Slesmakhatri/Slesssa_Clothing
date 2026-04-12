from rest_framework import serializers


class NotificationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    body = serializers.CharField(read_only=True)
    kind = serializers.CharField(read_only=True)
    event_key = serializers.CharField(read_only=True)
    entity_type = serializers.CharField(read_only=True)
    entity_id = serializers.IntegerField(read_only=True, allow_null=True)
    action_url = serializers.CharField(read_only=True, allow_blank=True)
    metadata = serializers.JSONField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    read_at = serializers.DateTimeField(read_only=True, allow_null=True)
