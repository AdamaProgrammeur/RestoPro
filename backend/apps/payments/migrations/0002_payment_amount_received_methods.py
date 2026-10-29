from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="amount_received",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                verbose_name="Montant reçu",
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="method",
            field=models.CharField(
                choices=[
                    ("CASH", "Espèces"),
                    ("ORANGE_MONEY", "Orange Money"),
                    ("MOOV_MONEY", "Moov Money"),
                    ("WAVE", "Wave"),
                    ("CARD", "Carte bancaire"),
                    ("OTHER", "Autre"),
                ],
                max_length=20,
                verbose_name="Mode de paiement",
            ),
        ),
    ]
