from rest_framework import serializers
from .models import Dish


class DishSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Dish
        fields = [
            "id",
            "name",
            "category",
            "category_name",
            "description",
            "price",
            "image",
            "image_url",
            "is_available",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "image_url",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")

        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)

        if obj.image:
            return obj.image.url

        return None
