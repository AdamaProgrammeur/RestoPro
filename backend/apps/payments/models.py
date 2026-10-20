from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Payment(models.Model):

    class Method(models.TextChoices):
        CASH = "CASH", "Espèces"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
        WAVE = "WAVE", "Wave"
        OTHER = "OTHER", "Autre"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        CONFIRMED = "CONFIRMED", "Confirmé"
        FAILED = "FAILED", "Échoué"
        REFUNDED = "REFUNDED", "Remboursé"

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payments",
        verbose_name="Commande",
    )

    method = models.CharField(
        max_length=20,
        choices=Method.choices,
        verbose_name="Mode de paiement",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Montant",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Statut",
    )

    reference = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Référence de transaction",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Notes",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_payments",
        verbose_name="Enregistré par",
    )

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="confirmed_payments",
        verbose_name="Confirmé par",
    )

    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de confirmation",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification",
    )

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Paiement #{self.pk} - "
            f"{self.amount} - {self.get_method_display()}"
        )