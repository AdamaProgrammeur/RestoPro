from rest_framework import serializers

from .models import RestaurantSettings


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantSettings
        fields = [
            "id",
            "name",
            "slogan",
            "logo",
            "logo_url",
            "address",
            "phone",
            "email",
            "currency",
            "tax_rate",
            "receipt_footer",
            "receipt_width",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "logo_url",
            "updated_at",
        ]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None

        request = self.context.get("request")
        url = obj.logo.url

        if request:
            return request.build_absolute_uri(url)

        return url

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Le nom du restaurant est obligatoire."
            )

        return value

    def validate_currency(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "La devise est obligatoire."
            )

        return value
