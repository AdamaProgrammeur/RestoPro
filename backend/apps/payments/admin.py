from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "method",
        "amount",
        "status",
        "created_by",
        "created_at",
    )

    list_filter = (
        "method",
        "status",
        "created_at",
    )

    search_fields = (
        "reference",
        "order__order_number",
        "created_by__username",
    )

    readonly_fields = (
        "created_by",
        "confirmed_by",
        "confirmed_at",
        "created_at",
        "updated_at",
    )