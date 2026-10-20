from django.db import models
from apps.categories.models import Category


class Dish(models.Model):

    name = models.CharField(
        max_length=150,
        verbose_name="Nom du plat ou de la boisson"
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="dishes",
        verbose_name="Catégorie"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prix de vente (FCFA)"
    )

    image = models.ImageField(
        upload_to="menu/",
        blank=True,
        null=True,
        verbose_name="Image du produit"
    )

    is_available = models.BooleanField(
        default=True,
        verbose_name="Disponible"
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
        verbose_name = "Plat ou boisson"
        verbose_name_plural = "Plats et boissons"
        ordering = ["name"]

    def __str__(self):
        return self.name
