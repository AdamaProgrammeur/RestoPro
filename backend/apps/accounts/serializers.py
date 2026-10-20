from rest_framework import serializers
from .models import User


class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "password",
        ]
        read_only_fields = ["id"]

    def validate_role(self, value):
        allowed_roles = {
            User.Role.ADMIN,
            User.Role.MANAGER,
            User.Role.CASHIER,
        }

        if value not in allowed_roles:
            raise serializers.ValidationError("Rôle invalide.")

        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        if not password:
            raise serializers.ValidationError({
                "password": "Le mot de passe est obligatoire."
            })

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        return instance