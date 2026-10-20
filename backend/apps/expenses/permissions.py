from rest_framework.permissions import BasePermission


class IsAdminOrManager(BasePermission):
    """
    Autorise les administrateurs et les gestionnaires
    à gérer les dépenses.
    """

    message = "Vous n'avez pas la permission de gérer les dépenses."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return getattr(user, "role", None) in (
            "ADMIN",
            "MANAGER",
        )