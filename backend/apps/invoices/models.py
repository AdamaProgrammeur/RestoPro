import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Invoice(models.Model):

    class Status(models.TextChoices):
        ISSUED = "ISSUED", "Émise"
        CANCELLED = "CANCELLED", "Annulée"

    invoice_number = models.CharField(
        max_length=40,
        unique=True,
        blank=True,
        verbose_name="Numéro de facture",
    )

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="invoice",
        verbose_name="Commande",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ISSUED,
        verbose_name="Statut",
    )

    customer_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Nom du client sur la facture",
    )

    customer_phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Téléphone du client sur la facture",
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Sous-total",
    )

    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Remise",
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total de la facture",
    )

    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="issued_invoices",
        verbose_name="Émise par",
    )

    issued_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Date d'émission",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Notes",
    )

    class Meta:
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
        ordering = ["-issued_at"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            date_prefix = timezone.localdate().strftime("%Y%m%d")
            suffix = uuid.uuid4().hex[:8].upper()
            self.invoice_number = f"FAC-{date_prefix}-{suffix}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.invoice_number or f"Facture #{self.pk}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Facture",
    )

    dish_name = models.CharField(
        max_length=150,
        verbose_name="Nom du plat",
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prix unitaire",
    )

    quantity = models.PositiveIntegerField(
        verbose_name="Quantité",
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Sous-total",
    )

    class Meta:
        verbose_name = "Ligne de facture"
        verbose_name_plural = "Lignes de facture"
        ordering = ["id"]

    def __str__(self):
        return f"{self.dish_name} × {self.quantity}"