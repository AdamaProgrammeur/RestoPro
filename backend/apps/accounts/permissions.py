from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """
    Autorise uniquement les utilisateurs ayant le rôle ADMIN.
    """

    message = "Cette action est réservée à l'administrateur."

    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and (
                user.is_superuser
                or getattr(user, "role", None) == "ADMIN"
            )
        )


class IsRestaurantAdmin(BasePermission):
    """
    Autorise les administrateurs du restaurant.
    """

    message = "Cette action est réservée à l'administrateur du restaurant."

    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and (
                user.is_superuser
                or getattr(user, "role", None) == "ADMIN"
            )
        )


class CanCollectPayments(BasePermission):
    """Les administrateurs et gérants peuvent valider un encaissement."""

    message = "Cette action est réservée à l'administrateur ou au gérant."

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (
            user.is_superuser
            or getattr(user, "role", None) in {"ADMIN", "MANAGER"}
        )
