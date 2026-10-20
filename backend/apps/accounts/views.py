from rest_framework import viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status

from .models import User
from .permissions import IsAdminRole
from .serializers import UserManagementSerializer


class CurrentUserView(RetrieveAPIView):
    """
    Retourne les informations de l'utilisateur connecté.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserManagementSerializer

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation de la liste des comptes réservée aux administrateurs.
    """

    queryset = User.objects.all().order_by("username")
    serializer_class = UserManagementSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

class UserManagementViewSet(viewsets.ModelViewSet):
    """
    Gestion complète des utilisateurs réservée aux administrateurs.
    """

    queryset = User.objects.all().order_by("username")
    serializer_class = UserManagementSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "date_joined"]
    ordering = ["username"]


    def perform_update(self, serializer):
        """
        Empêche la désactivation ou la rétrogradation
        du dernier administrateur actif.
        """

        instance = serializer.instance

        new_role = serializer.validated_data.get(
            "role",
            instance.role,
        )

        new_is_active = serializer.validated_data.get(
            "is_active",
            instance.is_active,
        )

        is_active_admin = (
            instance.role == User.Role.ADMIN
            and instance.is_active
        )

        remains_active_admin = (
            new_role == User.Role.ADMIN
            and new_is_active
        )

        if is_active_admin and not remains_active_admin:
            active_admins = User.objects.filter(
                role=User.Role.ADMIN,
                is_active=True,
            ).count()

            if active_admins <= 1:
                raise ValidationError({
                    "detail": (
                        "Impossible de désactiver ou de rétrograder "
                        "le dernier administrateur actif."
                    )
                })

        serializer.save()

    def perform_destroy(self, instance):
        """
        Empêche un administrateur de supprimer son propre compte
        ou le dernier administrateur actif.
        """

        request_user = self.request.user

        if instance.pk == request_user.pk:
            raise ValidationError({
                "detail": "Tu ne peux pas supprimer ton propre compte."
            })

        if instance.role == User.Role.ADMIN and instance.is_active:
            active_admins = User.objects.filter(
                role=User.Role.ADMIN,
                is_active=True,
            ).count()

            if active_admins <= 1:
                raise ValidationError({
                    "detail": (
                        "Impossible de supprimer le dernier "
                        "administrateur actif."
                    )
                })

        instance.delete()