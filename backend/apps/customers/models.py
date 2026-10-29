from django.db import models


class Customer(models.Model):

    first_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Prénom"
        
    )

    last_name = models.CharField(
        max_length=100,
        verbose_name="Nom"
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Téléphone"
    )

    email = models.EmailField(
        blank=True,
        verbose_name="Adresse email"
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Adresse"
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
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
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()