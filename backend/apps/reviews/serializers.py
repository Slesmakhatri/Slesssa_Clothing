from rest_framework import serializers

from .repository import (
    QUESTION_STATUS_ANSWERED,
    QUESTION_STATUS_MODERATED,
    QUESTION_STATUS_PENDING,
    REVIEW_STATUS_ACTIVE,
    REVIEW_STATUS_HIDDEN,
)


class ReviewSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField(read_only=True)
    user_name = serializers.CharField(read_only=True)
    product = serializers.IntegerField()
    product_name = serializers.CharField(read_only=True)
    order = serializers.IntegerField()
    order_number = serializers.CharField(read_only=True)
    order_item = serializers.IntegerField(read_only=True)
    vendor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[REVIEW_STATUS_ACTIVE, REVIEW_STATUS_HIDDEN], required=False, default=REVIEW_STATUS_ACTIVE)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class ProductQuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField(read_only=True)
    user_name = serializers.CharField(read_only=True)
    product = serializers.IntegerField()
    product_name = serializers.CharField(read_only=True)
    vendor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    question = serializers.CharField()
    answer = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=[QUESTION_STATUS_PENDING, QUESTION_STATUS_ANSWERED, QUESTION_STATUS_MODERATED],
        required=False,
        default=QUESTION_STATUS_PENDING,
    )
    moderation_note = serializers.CharField(required=False, allow_blank=True)
    answered_by = serializers.IntegerField(read_only=True, allow_null=True)
    answered_by_name = serializers.CharField(read_only=True, allow_blank=True)
    answered_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
