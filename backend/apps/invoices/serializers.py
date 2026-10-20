from decimal import Decimal

from rest_framework import serializers

from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "dish_name",
            "unit_price",
            "quantity",
            "subtotal",
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)

    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True,
    )

    issued_by_name = serializers.CharField(
        source="issued_by.username",
        read_only=True,
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "order",
            "order_number",
            "status",
            "customer_name",
            "customer_phone",
            "subtotal",
            "discount_amount",
            "total_amount",
            "issued_by",
            "issued_by_name",
            "issued_at",
            "notes",
            "items",
        ]

        read_only_fields = fields
