from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.customers.models import Customer
from apps.menu.models import Dish

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    dish_name = serializers.CharField(read_only=True)

    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "dish",
            "dish_name",
            "unit_price",
            "quantity",
            "subtotal",
        ]
        read_only_fields = ["id"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    customer_name = serializers.SerializerMethodField()

    created_by_name = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer",
            "customer_name",
            "created_by",
            "created_by_name",
            "order_type",
            "status",
            "notes",
            "items",
            "total_amount",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "order_number",
            "created_by",
            "created_by_name",
            "status",
            "total_amount",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        if obj.customer:
            return (
                f"{obj.customer.first_name} "
                f"{obj.customer.last_name}"
            ).strip()

        return "Client de passage"

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                "Une commande doit contenir au moins un article."
            )

        seen_dishes = set()

        for item in items:
            dish_id = item["dish"].pk

            if dish_id in seen_dishes:
                raise serializers.ValidationError(
                    "Un même plat ne doit pas apparaître plusieurs fois. "
                    "Augmentez plutôt sa quantité."
                )

            seen_dishes.add(dish_id)

            if item["quantity"] < 1:
                raise serializers.ValidationError(
                    "La quantité doit être supérieure ou égale à 1."
                )

        return items

    def validate_customer(self, customer):
        if customer is not None and not isinstance(customer, Customer):
            raise serializers.ValidationError("Client invalide.")

        return customer

    def _replace_items(self, order, items_data):
        """
        Remplace les articles et recalcule le montant total.
        Cette méthode doit être appelée dans une transaction.
        """
        total = Decimal("0.00")
        new_items = []

        for item_data in items_data:
            dish = item_data["dish"]
            quantity = item_data["quantity"]

            if not dish.is_available:
                raise serializers.ValidationError({
                    "items": (
                        f"Le plat « {dish.name} » n'est pas disponible."
                    )
                })

            unit_price = dish.price
            subtotal = unit_price * quantity

            new_items.append(
                OrderItem(
                    order=order,
                    dish=dish,
                    dish_name=dish.name,
                    unit_price=unit_price,
                    quantity=quantity,
                    subtotal=subtotal,
                )
            )

            total += subtotal

        order.items.all().delete()

        OrderItem.objects.bulk_create(new_items)

        order.total_amount = total
        order.save(update_fields=["total_amount", "updated_at"])

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")

        order = Order.objects.create(
            created_by=self.context["request"].user,
            **validated_data,
        )

        self._replace_items(order, items_data)

        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Si des articles sont envoyés, ils remplacent les anciens.
        if items_data is not None:
            self._replace_items(instance, items_data)

        return instance