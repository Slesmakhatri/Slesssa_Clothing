from rest_framework import serializers


class RecommendationRequestSerializer(serializers.Serializer):
    occasion = serializers.CharField(required=False, allow_blank=True)
    style_preference = serializers.CharField(required=False, allow_blank=True)
    color_preference = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    product_id = serializers.IntegerField(required=False)
    current_product_id = serializers.IntegerField(required=False)
    recent_viewed_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=24, default=8)


class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField()


class FashionRecommendationSerializer(serializers.Serializer):
    occasion = serializers.ChoiceField(choices=("casual", "formal", "party", "gym", "wedding", "festive"), required=False, default="casual")
    weather = serializers.ChoiceField(choices=("hot", "cold", "rainy", "mild"), required=False, allow_blank=True)
    mood = serializers.ChoiceField(choices=("minimal", "stylish", "comfy"), required=False, default="minimal")
    body_type = serializers.ChoiceField(choices=("slim", "bulky", "average", "tall", "short"), required=False, default="average")
    budget = serializers.ChoiceField(choices=("low", "medium", "high"), required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)


class WeatherRequestSerializer(serializers.Serializer):
    city = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)


class OutfitSaveSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    occasion = serializers.CharField(required=False, allow_blank=True)
    weather = serializers.CharField(required=False, allow_blank=True)
    mood = serializers.CharField(required=False, allow_blank=True)
    body_type = serializers.CharField(required=False, allow_blank=True)
    budget = serializers.CharField(required=False, allow_blank=True)
    fabric = serializers.CharField()
    outfit = serializers.CharField()
    fit_type = serializers.CharField()
    comfort_score = serializers.IntegerField(required=False, min_value=1, max_value=10)
    breathability = serializers.IntegerField(required=False, min_value=1, max_value=10)
    search_query = serializers.CharField(required=False, allow_blank=True)
    image_url = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class DesignSuggestionRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField()
    occasion = serializers.CharField(required=False, allow_blank=True)
    preferred_colors = serializers.ListField(child=serializers.CharField(), required=False)


class DesignSuggestionSerializer(serializers.Serializer):
    title = serializers.CharField()
    garment_type = serializers.CharField()
    style_direction = serializers.CharField()
    colors = serializers.ListField(child=serializers.CharField())
    fabric = serializers.CharField()
    fit = serializers.CharField(required=False, allow_blank=True)
    neckline = serializers.CharField(required=False, allow_blank=True)
    pattern_ideas = serializers.ListField(child=serializers.CharField())
    notes = serializers.CharField()
    occasion = serializers.CharField(required=False, allow_blank=True)
    image_url = serializers.CharField(required=False, allow_blank=True)
    image_source = serializers.CharField(required=False, allow_blank=True)
    image_prompt = serializers.CharField(required=False, allow_blank=True)
    image_generation_status = serializers.CharField(required=False, allow_blank=True)


class DesignSuggestionSaveSerializer(DesignSuggestionSerializer):
    prompt = serializers.CharField()
