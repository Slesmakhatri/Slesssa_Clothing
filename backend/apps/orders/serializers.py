from rest_framework import serializers

from apps.products.repository import get_product_by_id
from apps.products.serializers import ProductSerializer


def normalize_nepal_phone(value):
    digits = "".join(char for char in str(value or "") if char.isdigit())
    if digits.startswith("977") and len(digits) == 13:
        return digits[3:]
    return digits


class CartItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    product_detail = ProductSerializer(read_only=True)
    quantity = serializers.IntegerField(min_value=1)
    size = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        product = get_product_by_id(attrs.get("product"))
        quantity = attrs.get("quantity", 1)
        if not product:
            raise serializers.ValidationError({"product": "A valid product is required."})
        if not product.get("is_active", True):
            raise serializers.ValidationError({"product": "This product is currently unavailable."})
        if int(product.get("stock", 0)) <= 0:
            raise serializers.ValidationError({"product": "This product is out of stock."})
        if quantity > int(product.get("stock", 0)):
            raise serializers.ValidationError({"quantity": f"Only {product.get('stock', 0)} item(s) are available right now."})
        attrs["product_document"] = product
        return attrs


class WishlistItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    product_detail = ProductSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class OrderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField(allow_null=True, required=False)
    product_name = serializers.CharField(required=False, allow_blank=True)
    product_detail = ProductSerializer(read_only=True)
    vendor = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_id = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_user = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_name = serializers.CharField(read_only=True, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    size = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    product_type = serializers.CharField(read_only=True)
    is_customized = serializers.BooleanField(read_only=True)
    item_subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    commission_rate = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    platform_commission = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    vendor_payout_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payout_status = serializers.CharField(read_only=True)
    customization_request_id = serializers.IntegerField(read_only=True, allow_null=True)


class TrackingUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    timestamp = serializers.DateTimeField(read_only=True)
    order = serializers.IntegerField(required=False, write_only=True)


class OrderSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    vendor_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True, required=False)
    vendor_id = serializers.IntegerField(read_only=True, allow_null=True, required=False)
    full_name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.EmailField()
    shipping_address = serializers.CharField()
    city = serializers.CharField()
    province = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)
    delivery_option = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField()
    payment_status = serializers.CharField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField(read_only=True)
    estimated_delivery = serializers.DateField(read_only=True, allow_null=True)
    billing_detail = serializers.JSONField(read_only=True, allow_null=True)
    payment_record = serializers.JSONField(read_only=True, allow_null=True)
    items = OrderItemSerializer(many=True)
    tracking_updates = TrackingUpdateSerializer(many=True, read_only=True)
    payout_status = serializers.CharField(read_only=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["pending", "processing", "ready", "completed", "delivered"])
    note = serializers.CharField(required=False, allow_blank=True)


class ReturnHistoryEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    actor = serializers.JSONField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ReturnRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    order = serializers.IntegerField()
    order_number = serializers.CharField(read_only=True)
    order_item = serializers.IntegerField()
    user_id = serializers.IntegerField(read_only=True)
    user_detail = serializers.JSONField(read_only=True)
    vendor_user_id = serializers.IntegerField(read_only=True, allow_null=True)
    vendor_detail = serializers.JSONField(read_only=True, allow_null=True)
    product = serializers.IntegerField(read_only=True, allow_null=True)
    product_name = serializers.CharField(read_only=True, allow_blank=True)
    product_detail = ProductSerializer(read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    reason = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    image_proof = serializers.CharField(required=False, allow_blank=True)
    requested_resolution = serializers.ChoiceField(choices=["full_refund", "exchange", "voucher", "manual_vendor_review"])
    status = serializers.ChoiceField(
        choices=[
            "pending",
            "under_review",
            "approved_refund",
            "approved_exchange",
            "approved_voucher",
            "rejected",
            "more_info_requested",
            "completed",
        ],
        required=False,
        default="pending",
    )
    vendor_note = serializers.CharField(required=False, allow_blank=True)
    decision_resolution = serializers.CharField(required=False, allow_blank=True)
    voucher_id = serializers.IntegerField(read_only=True, allow_null=True)
    history = ReturnHistoryEntrySerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class VoucherHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    type = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)


class VoucherSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    user_detail = serializers.JSONField(read_only=True)
    return_request = serializers.IntegerField(read_only=True)
    order = serializers.IntegerField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    kind = serializers.CharField(read_only=True)
    note = serializers.CharField(read_only=True)
    history = VoucherHistorySerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class OrderItemCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_blank=True)
    vendor = serializers.IntegerField(required=False, allow_null=True)
    vendor_user = serializers.IntegerField(required=False, allow_null=True)
    vendor_name = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    size = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    product_type = serializers.CharField(required=False, allow_blank=True)
    is_customized = serializers.BooleanField(required=False, default=False)
    customization_request_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        product_id = attrs.get("product")
        if product_id:
            product = get_product_by_id(product_id)
            if not product:
                raise serializers.ValidationError({"product": "A valid product is required."})
            if not product.get("is_active", True):
                raise serializers.ValidationError({"product": "This product is currently unavailable."})
            if int(product.get("stock", 0)) < int(attrs.get("quantity", 0)):
                raise serializers.ValidationError({"quantity": f"Only {product.get('stock', 0)} item(s) are available right now."})
        elif not attrs.get("product_name"):
            raise serializers.ValidationError({"product_name": "Product name is required when product is not provided."})
        return attrs


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.EmailField()
    shipping_address = serializers.CharField()
    city = serializers.CharField()
    province = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)
    delivery_option = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField()
    shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=0)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=0)
    items = OrderItemCreateSerializer(many=True, allow_empty=False)

    def validate_phone(self, value):
        normalized = normalize_nepal_phone(value)
        if not normalized:
            raise serializers.ValidationError("Phone number is required.")
        if not normalized.startswith("98") or len(normalized) != 10:
            raise serializers.ValidationError("Enter a valid Nepali mobile number.")
        return normalized

    def validate_payment_method(self, value):
        normalized = str(value or "").strip().lower()
        if normalized not in {"cod", "esewa", "khalti", "card"}:
            raise serializers.ValidationError("Unsupported payment method.")
        return normalized

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError({"items": "At least one order item is required."})
        return attrs
