from rest_framework import serializers

from apps.vendors.serializers import VendorProfileSerializer


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


class CategorySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField(read_only=True)
    description = serializers.CharField(required=False, allow_blank=True)
    image = serializers.CharField(required=False, allow_blank=True)


class ProductImageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    image = serializers.CharField()


class ProductSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    vendor = serializers.IntegerField(required=False)
    vendor_detail = VendorProfileSerializer(read_only=True)
    category = serializers.IntegerField()
    category_detail = CategorySerializer(read_only=True)
    name = serializers.CharField()
    title = serializers.SerializerMethodField()
    slug = serializers.CharField(read_only=True)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    oldPrice = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()
    stock = serializers.IntegerField(required=False)
    sizes = serializers.ListField(child=serializers.CharField(), required=False)
    colors = serializers.ListField(child=serializers.CharField(), required=False)
    fabric_options = serializers.ListField(child=serializers.CharField(), required=False)
    product_type = serializers.ChoiceField(choices=["ready_made", "customizable", "both"], required=False, default="ready_made")
    is_customizable = serializers.BooleanField(required=False, default=False)
    sustainability_guidance = serializers.CharField(required=False, allow_blank=True)
    customization_note = serializers.CharField(required=False, allow_blank=True)
    badge = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)
    reviews = serializers.SerializerMethodField()
    popularity = serializers.IntegerField(required=False)
    is_featured = serializers.BooleanField(required=False)
    is_new_arrival = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    sustainability_score = serializers.IntegerField(read_only=True, required=False, allow_null=True)
    sustainability_leaf_score = serializers.IntegerField(read_only=True, required=False)
    sustainability_label = serializers.CharField(read_only=True, required=False, allow_blank=True)
    impact_band = serializers.CharField(read_only=True, required=False, allow_blank=True)
    eco_badges = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    sustainability_note = serializers.CharField(read_only=True, required=False, allow_blank=True)
    fabric_guidance = serializers.ListField(child=serializers.DictField(), read_only=True, required=False)
    sustainable_alternatives = serializers.ListField(child=serializers.DictField(), read_only=True, required=False)
    main_image = serializers.CharField(required=False, allow_blank=True)
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    hoverImage = serializers.SerializerMethodField()
    gallery = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, required=False)
    vendor_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    is_new = serializers.SerializerMethodField()
    is_best_seller = serializers.SerializerMethodField()
    external_image_url = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_title(self, obj):
        return obj.get("name")

    def get_oldPrice(self, obj):
        return obj.get("discount_price")

    def get_old_price(self, obj):
        return obj.get("old_price") or obj.get("oldPrice") or obj.get("discount_price")

    def get_reviews(self, obj):
        return obj.get("reviews_count", 0)

    def get_image(self, obj):
        return obj.get("main_image")

    def get_image_url(self, obj):
        return obj.get("main_image") or obj.get("external_image_url", "")

    def get_gallery(self, obj):
        gallery = [image.get("image") for image in obj.get("images", []) if image.get("image")]
        image_url = self.get_image_url(obj)
        if image_url:
            return [image_url, *gallery][:4]
        return gallery[:4]

    def get_hoverImage(self, obj):
        gallery = self.get_gallery(obj)
        return gallery[1] if len(gallery) > 1 else (gallery[0] if gallery else obj.get("external_image_url", ""))

    def get_vendor_name(self, obj):
        return _mapping_or_empty(obj.get("vendor_detail")).get("brand_name", "")

    def get_category_name(self, obj):
        return _mapping_or_empty(obj.get("category_detail")).get("name", "")

    def get_is_new(self, obj):
        return bool(obj.get("is_new_arrival"))

    def get_is_best_seller(self, obj):
        badge = (obj.get("badge") or "").lower()
        return badge == "best seller" or int(obj.get("popularity", 0)) >= 90
