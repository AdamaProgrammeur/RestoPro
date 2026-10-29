from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("restaurant_settings", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="restaurantsettings",
            name="receipt_width",
            field=models.PositiveSmallIntegerField(
                choices=[(58, "58 mm"), (80, "80 mm")],
                default=80,
                verbose_name="Largeur du ticket",
            ),
        ),
    ]
