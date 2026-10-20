from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import RestaurantSettings


@admin.register(RestaurantSettings)
class RestaurantSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "phone",
        "email",
        "currency",
        "tax_rate",
        "updated_at",
    )

    search_fields = (
        "name",
        "phone",
        "email",
    )

    readonly_fields = (
        "updated_at",
    )

    fieldsets = (
        (
            "Informations générales",
            {
                "fields": (
                    "name",
                    "slogan",
                    "logo",
                ),
            },
        ),
        (
            "Coordonnées",
            {
                "fields": (
                    "address",
                    "phone",
                    "email",
                ),
            },
        ),
        (
            "Facturation",
            {
                "fields": (
                    "currency",
                    "tax_rate",
                ),
            },
        ),
        (
            "Ticket de caisse",
            {
                "fields": (
                    "receipt_footer",
                ),
            },
        ),
        (
            "Informations système",
            {
                "fields": (
                    "updated_at",
                ),
            },
        ),
    )