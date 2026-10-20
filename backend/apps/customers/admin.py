from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):

    list_display = (
        "last_name",
        "first_name",
        "phone",
        "email",
        "created_at",
    )

    search_fields = (
        "first_name",
        "last_name",
        "phone",
        "email",
    )

    ordering = (
        "last_name",
        "first_name",
    )