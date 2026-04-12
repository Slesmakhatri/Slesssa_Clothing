from rest_framework import serializers


class BillingDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    address_line_1 = serializers.CharField()
    address_line_2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField()
    province = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField()
    tax_number = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class PaymentStatusHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    gateway_code = serializers.CharField(required=False, allow_blank=True)
    gateway_message = serializers.CharField(required=False, allow_blank=True)
    payload = serializers.JSONField(required=False)
    created_at = serializers.DateTimeField(read_only=True)


class OrderPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    payment_id = serializers.IntegerField(read_only=True)
    payment_method = serializers.CharField()
    payment_status = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    is_verified = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class PaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    order = serializers.IntegerField()
    provider = serializers.CharField()
    transaction_id = serializers.CharField(read_only=True)
    external_transaction_id = serializers.CharField(required=False, allow_blank=True)
    gateway_reference = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.CharField()
    payer_name = serializers.CharField(required=False, allow_blank=True)
    payer_email = serializers.CharField(required=False, allow_blank=True)
    payer_phone = serializers.CharField(required=False, allow_blank=True)
    payer_reference = serializers.CharField(required=False, allow_blank=True)
    verification_reference = serializers.CharField(required=False, allow_blank=True)
    gateway_response = serializers.JSONField(required=False)
    verified_at = serializers.DateTimeField(read_only=True, allow_null=True)
    paid_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    billing_detail = BillingDetailSerializer(read_only=True)
    order_payment = OrderPaymentSerializer(read_only=True)
    status_history = PaymentStatusHistorySerializer(many=True, read_only=True)


class PaymentInitiationSerializer(serializers.Serializer):
    order = serializers.IntegerField()
    provider = serializers.ChoiceField(choices=("esewa", "khalti", "card", "cod"))


class PaymentVerificationSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    success = serializers.BooleanField()
    external_transaction_id = serializers.CharField(required=False, allow_blank=True)
    gateway_reference = serializers.CharField(required=False, allow_blank=True)
    verification_reference = serializers.CharField(required=False, allow_blank=True)
    gateway_code = serializers.CharField(required=False, allow_blank=True)
    gateway_message = serializers.CharField(required=False, allow_blank=True)
    gateway_response = serializers.JSONField(required=False)
