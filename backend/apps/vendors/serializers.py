from rest_framework import serializers

from apps.accounts.serializers import UserSerializer


class VendorProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField(required=False)
    user_detail = UserSerializer(read_only=True)
    brand_name = serializers.CharField()
    slug = serializers.CharField(read_only=True)
    description = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    logo = serializers.CharField(required=False, allow_blank=True)
    banner = serializers.CharField(required=False, allow_blank=True)
    approval_status = serializers.ChoiceField(choices=["pending", "approved", "rejected"], required=False)
    is_shop_setup_complete = serializers.BooleanField(read_only=True)
    customization_services = serializers.JSONField(required=False)
    created_at = serializers.DateTimeField(read_only=True)


class VendorApplicationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(min_length=2)
    email = serializers.EmailField()
    phone = serializers.CharField(min_length=10)
    business_name = serializers.CharField(min_length=2)
    business_description = serializers.CharField(min_length=10)
    specialization = serializers.CharField(min_length=2)
    location = serializers.CharField(min_length=2)
    documents = serializers.ListField(child=serializers.CharField(), required=False)
    status = serializers.ChoiceField(choices=["pending", "approved", "rejected"], required=False)
    review_note = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
