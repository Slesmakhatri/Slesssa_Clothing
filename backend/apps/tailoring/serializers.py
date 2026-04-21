from rest_framework import serializers

from apps.vendors.serializers import VendorProfileSerializer


class UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True, allow_blank=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)


class MeasurementSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField(read_only=True)
    chest = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    waist = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    hip = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    shoulder = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    sleeve_length = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    inseam = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    neck = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    height = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    source = serializers.CharField(required=False, allow_blank=True)
    confidence_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    suggestion_explanation = serializers.CharField(required=False, allow_blank=True)
    suggestion_basis = serializers.ListField(child=serializers.CharField(), required=False)
    body_profile = serializers.JSONField(required=False)
    photo_reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)


class TailorMeasurementSerializer(serializers.Serializer):
    request_id = serializers.IntegerField(read_only=True)
    request_status = serializers.CharField(read_only=True, allow_blank=True)
    clothing_type = serializers.CharField(read_only=True, allow_blank=True)
    reference_product_name = serializers.CharField(read_only=True, allow_blank=True)
    customer_id = serializers.IntegerField(read_only=True, allow_null=True)
    customer_detail = UserSummarySerializer(read_only=True, allow_null=True)
    measurement_id = serializers.IntegerField(read_only=True)
    measurement_detail = MeasurementSerializer(read_only=True)
    assigned_tailor = serializers.IntegerField(read_only=True, allow_null=True)
    assigned_tailor_detail = UserSummarySerializer(read_only=True, allow_null=True)
    tailor_profile_detail = serializers.JSONField(read_only=True, allow_null=True)
    request_detail = serializers.JSONField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True, allow_null=True)


class MeasurementSuggestionRequestSerializer(serializers.Serializer):
    gender = serializers.ChoiceField(choices=["female", "male", "other"])
    height = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    age = serializers.IntegerField(required=False, allow_null=True, min_value=5, max_value=100)
    fit_preference = serializers.ChoiceField(
        choices=["slim", "regular", "relaxed"],
        required=False,
        default="regular",
    )
    body_type = serializers.ChoiceField(
        choices=["lean", "average", "curvy", "athletic", "broad", "petite", "plus-size"],
        required=False,
        default="average",
    )
    standard_size = serializers.CharField(required=False, allow_blank=True)
    clothing_type = serializers.CharField(required=False, allow_blank=True)
    chest = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    waist = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    hip = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    shoulder = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    sleeve_length = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    inseam = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    neck = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    full_body_image = serializers.ImageField(write_only=True, required=False, allow_null=True)

    def validate(self, attrs):
        if attrs.get("height") is None and not attrs.get("standard_size"):
            raise serializers.ValidationError("Provide height or a standard size to generate tailored suggestions.")
        if attrs.get("weight") is None and not attrs.get("standard_size") and not attrs.get("full_body_image"):
            raise serializers.ValidationError("Provide weight, a standard size, or a photo to improve the estimate.")
        return attrs


class MeasurementSuggestionResponseSerializer(serializers.Serializer):
    measurements = MeasurementSerializer()
    confidence_label = serializers.CharField()
    explanation = serializers.CharField()
    basis = serializers.ListField(child=serializers.CharField())
    input_summary = serializers.JSONField()


class TailorProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField()
    user_detail = UserSummarySerializer(read_only=True)
    vendor = serializers.IntegerField(required=False, allow_null=True)
    vendor_detail = VendorProfileSerializer(read_only=True, allow_null=True)
    full_name = serializers.CharField(required=False, allow_blank=True)
    years_of_experience = serializers.IntegerField(required=False)
    specialization = serializers.CharField(required=False, allow_blank=True)
    design_capabilities = serializers.ListField(child=serializers.CharField(), required=False)
    style_categories = serializers.ListField(child=serializers.CharField(), required=False)
    supported_clothing_types = serializers.ListField(child=serializers.CharField(), required=False)
    short_bio = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, allow_null=True)
    profile_image = serializers.CharField(required=False, allow_blank=True)
    is_available = serializers.BooleanField(required=False)
    approval_status = serializers.ChoiceField(choices=["pending", "approved", "rejected"], required=False)
    location_name = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    distance_km = serializers.FloatField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)


class TailorRecommendationRequestSerializer(serializers.Serializer):
    clothing_type = serializers.CharField(required=False, allow_blank=True)
    style_preference = serializers.CharField(required=False, allow_blank=True)
    preferred_delivery_date = serializers.DateField(required=False, allow_null=True)
    city = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)


class TailorRecommendationAlternativeSerializer(serializers.Serializer):
    tailor = TailorProfileSerializer()
    score = serializers.FloatField()
    reasons = serializers.ListField(child=serializers.CharField())


class TailorRecommendationResponseSerializer(serializers.Serializer):
    recommended_tailor = TailorProfileSerializer(allow_null=True)
    score = serializers.FloatField(required=False, allow_null=True)
    explanation = serializers.CharField(required=False, allow_blank=True)
    reasons = serializers.ListField(child=serializers.CharField(), required=False)
    score_breakdown = serializers.JSONField(required=False)
    delivery_metrics = serializers.JSONField(required=False)
    alternatives = TailorRecommendationAlternativeSerializer(many=True, required=False)


class TailoringMessageAttachmentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    reference_image = serializers.CharField()
    caption = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)


class TailoringMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    request = serializers.IntegerField()
    sender = serializers.IntegerField(read_only=True)
    sender_role = serializers.CharField(read_only=True)
    sender_detail = UserSummarySerializer(read_only=True)
    body = serializers.CharField(required=False, allow_blank=True)
    design_notes = serializers.CharField(required=False, allow_blank=True)
    measurement_snapshot = serializers.JSONField(required=False)
    fabric_preference = serializers.CharField(required=False, allow_blank=True)
    color_preference = serializers.CharField(required=False, allow_blank=True)
    price_estimate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    delivery_estimate = serializers.CharField(required=False, allow_blank=True)
    status_snapshot = serializers.CharField(required=False, allow_blank=True)
    attachments = TailoringMessageAttachmentSerializer(many=True, read_only=True)
    attachment = serializers.ImageField(write_only=True, required=False, allow_null=True)
    attachment_caption = serializers.CharField(write_only=True, required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        if not any(
            [
                attrs.get("body"),
                attrs.get("design_notes"),
                attrs.get("measurement_snapshot"),
                attrs.get("fabric_preference"),
                attrs.get("color_preference"),
                attrs.get("price_estimate") is not None,
                attrs.get("delivery_estimate"),
                attrs.get("status_snapshot"),
                attrs.get("attachment"),
            ]
        ):
            raise serializers.ValidationError("Provide a message, structured update, or attachment.")
        return attrs


class TailoringRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.IntegerField(read_only=True)
    customer_id = serializers.IntegerField(read_only=True, required=False)
    user_detail = UserSummarySerializer(read_only=True)
    vendor = serializers.IntegerField(required=False, allow_null=True)
    vendor_id = serializers.IntegerField(read_only=True, allow_null=True, required=False)
    vendor_detail = VendorProfileSerializer(read_only=True, allow_null=True)
    assigned_tailor = serializers.IntegerField(required=False, allow_null=True)
    tailor_id = serializers.IntegerField(read_only=True, allow_null=True)
    assigned_tailor_detail = UserSummarySerializer(read_only=True, allow_null=True)
    tailor_profile_detail = TailorProfileSerializer(read_only=True, allow_null=True)
    order_type = serializers.CharField(read_only=True, required=False)
    is_self_tailor = serializers.BooleanField(required=False)
    self_tailor_name = serializers.CharField(required=False, allow_blank=True)
    self_tailor_phone = serializers.CharField(required=False, allow_blank=True)
    self_tailor_address = serializers.CharField(required=False, allow_blank=True)
    self_tailor_notes = serializers.CharField(required=False, allow_blank=True)
    reference_product_slug = serializers.CharField(required=False, allow_blank=True)
    reference_product_id = serializers.IntegerField(required=False, allow_null=True)
    product_id = serializers.IntegerField(read_only=True, allow_null=True, required=False)
    reference_product_name = serializers.CharField(required=False, allow_blank=True)
    reference_product_image = serializers.CharField(required=False, allow_blank=True)
    clothing_type = serializers.CharField()
    fabric = serializers.CharField()
    color = serializers.CharField()
    standard_size = serializers.CharField(required=False, allow_blank=True)
    occasion_preference = serializers.CharField(required=False, allow_blank=True)
    style_preference = serializers.CharField(required=False, allow_blank=True)
    delivery_preference = serializers.CharField(required=False, allow_blank=True)
    design_notes = serializers.CharField()
    inspiration_image = serializers.CharField(required=False, allow_blank=True)
    measurement = serializers.IntegerField(required=False, allow_null=True)
    measurement_detail = MeasurementSerializer(read_only=True, allow_null=True)
    measurement_history = serializers.JSONField(read_only=True)
    preferred_delivery_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.CharField(required=False)
    messages = TailoringMessageSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        required_text_fields = {
            "clothing_type": "Choose a clothing type for the tailoring request.",
            "fabric": "Choose or enter a fabric preference.",
            "color": "Choose or enter a color preference.",
            "design_notes": "Describe how you want the piece customized.",
        }
        errors = {}
        for field, message in required_text_fields.items():
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = attrs[field].strip()
            if not self.partial and not attrs.get(field):
                errors[field] = message

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
