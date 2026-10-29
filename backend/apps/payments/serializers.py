from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    confirmed_by_name = serializers.SerializerMethodField()

    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True,
    )

    change_given = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name().strip() or obj.created_by.username

    def get_confirmed_by_name(self, obj):
        if not obj.confirmed_by:
            return ""
        return obj.confirmed_by.get_full_name().strip() or obj.confirmed_by.username

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "order_number",
            "method",
            "amount",
            "amount_received",
            "change_given",
            "status",
            "reference",
            "notes",
            "created_by",
            "created_by_name",
            "confirmed_by",
            "confirmed_by_name",
            "confirmed_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_by",
            "created_by_name",
            "confirmed_by",
            "confirmed_by_name",
            "confirmed_at",
            "created_at",
            "updated_at",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Le montant doit être supérieur à zéro."
            )
        return value

    def validate(self, attrs):
        order = attrs.get("order")
        amount = attrs.get("amount")

        if order and order.status == Order.Status.CANCELLED:
            raise serializers.ValidationError(
                {"order": "Impossible d'enregistrer un paiement sur une commande annulée."}
            )

        if order and order.status == Order.Status.SERVED:
            raise serializers.ValidationError(
                {"order": "Cette commande est déjà clôturée."}
            )

        amount = attrs.get("amount")
        received = attrs.get("amount_received", amount)
        method = attrs.get("method")
        if amount is not None and received is not None:
            if received < amount:
                raise serializers.ValidationError({
                    "amount_received": "Le montant reçu ne peut pas être inférieur au montant du paiement."
                })
            if method != Payment.Method.CASH and received != amount:
                raise serializers.ValidationError({
                    "amount_received": "La monnaie rendue est uniquement applicable aux paiements en espèces."
                })
            attrs["amount_received"] = received

        if order and amount is not None:
            confirmed_total = sum(
                (
                    payment.amount
                    for payment in order.payments.filter(
                        status=Payment.Status.CONFIRMED
                    )
                ),
                Decimal("0.00"),
            )

            pending_total = sum(
                (
                    payment.amount
                    for payment in order.payments.filter(
                        status=Payment.Status.PENDING
                    )
                ),
                Decimal("0.00"),
            )

            if confirmed_total + pending_total + amount > order.total_amount:
                raise serializers.ValidationError(
                    {
                        "amount": (
                            "Ce montant dépasse le solde disponible, "
                            "en tenant compte des paiements en attente."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        order_id = validated_data["order"].pk

        order = Order.objects.select_for_update().get(pk=order_id)

        if order.status in [
            Order.Status.CANCELLED,
            Order.Status.SERVED,
        ]:
            raise serializers.ValidationError(
                {"order": "Cette commande ne peut plus recevoir de paiement."}
            )

        amount = validated_data["amount"]

        existing_payments = Payment.objects.filter(order=order)

        confirmed_total = sum(
            existing_payments.filter(
                status=Payment.Status.CONFIRMED
            ).values_list("amount", flat=True),
            Decimal("0.00"),
        )

        pending_total = sum(
            existing_payments.filter(
                status=Payment.Status.PENDING
            ).values_list("amount", flat=True),
            Decimal("0.00"),
        )

        if confirmed_total + pending_total + amount > order.total_amount:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Le montant dépasse le solde disponible "
                        "en tenant compte des paiements en attente."
                    )
                }
            )

        validated_data["order"] = order
        validated_data["created_by"] = self.context["request"].user
        validated_data["status"] = Payment.Status.PENDING

        return Payment.objects.create(**validated_data)
