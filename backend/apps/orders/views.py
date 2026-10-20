from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsRestaurantAdmin

from .models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = (
            Order.objects.select_related("customer", "created_by")
            .prefetch_related("items", "items__dish")
        )

        status_filter = self.request.query_params.get("status")
        order_type = self.request.query_params.get("order_type")
        search = self.request.query_params.get("search")

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if order_type:
            queryset = queryset.filter(order_type=order_type)

        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
            )

        return queryset


    def perform_update(self, serializer):
        order = self.get_object()

        if order.status != Order.Status.PENDING:
            raise ValidationError(
                "Seules les commandes en attente peuvent être modifiées."
            )

        if "status" in serializer.validated_data:
            raise ValidationError(
                "Utilisez l'action dédiée pour changer le statut."
            )

        serializer.save()
    

    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsRestaurantAdmin],
        url_path="change-status",
    )
    def change_status(self, request, pk=None):
        order = self.get_object()

        new_status = request.data.get("status")

        allowed_statuses = [
            choice[0] for choice in Order.Status.choices
        ]

        if new_status not in allowed_statuses:
            return Response(
                {"error": "Statut invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == Order.Status.CANCELLED:
            return Response(
                {"error": "Cette commande est déjà annulée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == Order.Status.SERVED:
            return Response(
                {"error": "Une commande servie ne peut plus changer de statut."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_transitions = {
            Order.Status.PENDING: [
                Order.Status.PREPARING,
                Order.Status.CANCELLED,
            ],
            Order.Status.PREPARING: [
                Order.Status.READY,
                Order.Status.CANCELLED,
            ],
            Order.Status.READY: [
                Order.Status.SERVED,
                Order.Status.CANCELLED,
            ],
        }

        if new_status not in allowed_transitions.get(order.status, []):
            return Response(
                {
                    "error": (
                        f"Transition interdite : "
                        f"{order.get_status_display()} vers "
                        f"{dict(Order.Status.choices).get(new_status, new_status)}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        return Response(self.get_serializer(order).data)