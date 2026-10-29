from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class RestaurantSettings(models.Model):
    name = models.CharField(
        max_length=150,
        default="Mon Restaurant",
        verbose_name="Nom du restaurant",
    )

    slogan = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Slogan",
    )

    logo = models.ImageField(
        upload_to="restaurant/logo/",
        blank=True,
        null=True,
        verbose_name="Logo du restaurant",
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Adresse",
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Téléphone",
    )

    email = models.EmailField(
        blank=True,
        verbose_name="Adresse e-mail",
    )

    currency = models.CharField(
        max_length=10,
        default="XOF",
        verbose_name="Devise",
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        verbose_name="Taux de taxe (%)",
    )

    receipt_footer = models.CharField(
        max_length=255,
        blank=True,
        default="Merci pour votre visite !",
        verbose_name="Message en bas du ticket",
    )

    receipt_width = models.PositiveSmallIntegerField(
        choices=[(58, "58 mm"), (80, "80 mm")],
        default=80,
        verbose_name="Largeur du ticket",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification",
    )

    class Meta:
        verbose_name = "Paramètre du restaurant"
        verbose_name_plural = "Paramètres du restaurant"

    def __str__(self):
        return self.name
