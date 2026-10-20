from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):

    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True
    )

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True
    )

    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True
    )

    class Meta:
        model = Expense
        fields = [
            "id",
            "title",
            "category",
            "category_display",
            "amount",
            "date",
            "description",
            "payment_method",
            "payment_method_display",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]
