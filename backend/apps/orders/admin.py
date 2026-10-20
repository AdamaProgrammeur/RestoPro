from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = (
        "dish",
        "dish_name",
        "unit_price",
        "quantity",
        "subtotal",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "order_type",
        "status",
        "total_amount",
        "created_by",
        "created_at",
    )

    list_filter = (
        "status",
        "order_type",
        "created_at",
    )

    search_fields = (
        "order_number",
        "customer__first_name",
        "customer__last_name",
    )

    readonly_fields = (
        "order_number",
        "total_amount",
        "created_at",
        "updated_at",
    )

    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "dish_name",
        "unit_price",
        "quantity",
        "subtotal",
    )

    list_filter = ("order__status",)
    search_fields = ("dish_name", "order__order_number")