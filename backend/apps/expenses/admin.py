from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "amount",
        "date",
        "payment_method",
        "created_by",
    )

    list_filter = (
        "category",
        "payment_method",
        "date",
    )

    search_fields = (
        "title",
        "description",
        "created_by__username",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    date_hierarchy = "date"