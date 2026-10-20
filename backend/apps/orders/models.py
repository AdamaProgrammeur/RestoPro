from decimal import Decimal
import uuid
from django.utils import timezone
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PREPARING = "PREPARING", "En préparation"
        READY = "READY", "Prête"
        SERVED = "SERVED", "Servie"
        CANCELLED = "CANCELLED", "Annulée"

    def save(self, *args, **kwargs):
        if not self.order_number:
            date_prefix = timezone.localdate().strftime("%Y%m%d")
            unique_suffix = uuid.uuid4().hex[:8].upper()
            self.order_number = f"CMD-{date_prefix}-{unique_suffix}"

        super().save(*args, **kwargs)

    class OrderType(models.TextChoices):
        DINE_IN = "DINE_IN", "Sur place"
        TAKEAWAY = "TAKEAWAY", "À emporter"
        DELIVERY = "DELIVERY", "Livraison"

    order_number = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        verbose_name="Numéro de commande",
    )

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="Client",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_orders",
        verbose_name="Créée par",
    )

    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.DINE_IN,
        verbose_name="Type de commande",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Statut",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Remarques",
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Montant total",
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
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number or f"Commande #{self.pk}"


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Commande",
    )

    dish = models.ForeignKey(
        "menu.Dish",
        on_delete=models.PROTECT,
        related_name="order_items",
        verbose_name="Plat",
    )

    dish_name = models.CharField(
        max_length=150,
        verbose_name="Nom du plat au moment de la commande",
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Prix unitaire au moment de la commande",
    )

    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantité",
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Sous-total",
    )

    class Meta:
        verbose_name = "Article de commande"
        verbose_name_plural = "Articles de commande"
        ordering = ["id"]

    def __str__(self):
        return f"{self.dish_name} × {self.quantity}"
