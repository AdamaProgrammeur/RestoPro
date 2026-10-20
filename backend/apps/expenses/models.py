from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Expense(models.Model):

    class Category(models.TextChoices):
        SUPPLIES = "SUPPLIES", "Approvisionnement"
        SALARY = "SALARY", "Salaires"
        ELECTRICITY = "ELECTRICITY", "Électricité"
        WATER = "WATER", "Eau"
        GAS = "GAS", "Gaz"
        RENT = "RENT", "Loyer"
        TRANSPORT = "TRANSPORT", "Transport"
        MAINTENANCE = "MAINTENANCE", "Entretien et réparation"
        OTHER = "OTHER", "Autres dépenses"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Espèces"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
        WAVE = "WAVE", "Wave"
        BANK = "BANK", "Virement bancaire"
        OTHER = "OTHER", "Autre"

    title = models.CharField(
        max_length=150,
        verbose_name="Intitulé de la dépense"
    )

    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        verbose_name="Catégorie"
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
       validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Montant en FCFA"
    )

    date = models.DateField(
        verbose_name="Date de la dépense"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        verbose_name="Mode de paiement"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="restaurant_expenses",
        verbose_name="Enregistré par"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"

    def __str__(self):
        return f"{self.title} - {self.amount} FCFA"