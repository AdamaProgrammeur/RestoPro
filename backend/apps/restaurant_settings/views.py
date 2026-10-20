from django.db import transaction

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsRestaurantAdmin

from .models import RestaurantSettings
from .serializers import RestaurantSettingsSerializer


class RestaurantSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_object(self):
        settings_obj = RestaurantSettings.objects.order_by("id").first()

        if settings_obj is None:
            raise ValidationError(
                "Les paramètres du restaurant n'ont pas encore été configurés."
            )

        return settings_obj

    def get(self, request):
        settings_obj = self.get_object()

        serializer = RestaurantSettingsSerializer(
            settings_obj,
            context={"request": request},
        )

        return Response(serializer.data)

    @transaction.atomic
    def put(self, request):
        return self.update_settings(request, partial=False)

    @transaction.atomic
    def patch(self, request):
        return self.update_settings(request, partial=True)

    def update_settings(self, request, partial=False):
        # Seuls les administrateurs peuvent modifier les paramètres.
        permission = IsRestaurantAdmin()
        if not permission.has_permission(request, self):
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier ces paramètres."},
                status=status.HTTP_403_FORBIDDEN,
            )

        settings_obj = RestaurantSettings.objects.order_by("id").first()

        if settings_obj is None:
            raise ValidationError(
                "Les paramètres du restaurant n'ont pas encore été créés."
            )

        serializer = RestaurantSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=partial,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)