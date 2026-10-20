from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """
    Autorise uniquement les utilisateurs ayant le rôle ADMIN.
    """

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and (
                user.is_superuser
                or getattr(user, "role", None) == "ADMIN"
            )
        )