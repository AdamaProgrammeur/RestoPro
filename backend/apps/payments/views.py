from django.db import transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import CanCollectPayments, IsRestaurantAdmin
from apps.orders.models import Order

from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = Payment.objects.select_related(
            "order",
            "created_by",
            "confirmed_by",
        )

        order_id = self.request.query_params.get("order")
        payment_status = self.request.query_params.get("status")
        method = self.request.query_params.get("method")

        if order_id:
            queryset = queryset.filter(order_id=order_id)

        if payment_status:
            queryset = queryset.filter(status=payment_status)

        if method:
            queryset = queryset.filter(method=method)

        return queryset

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[CanCollectPayments],
        url_path="confirm",
    )
    def confirm(self, request, pk=None):
        with transaction.atomic():
            try:
                payment = Payment.objects.select_for_update().get(pk=pk)
            except Payment.DoesNotExist:
                raise ValidationError(
                    {"payment": "Ce paiement n'existe pas."}
                )

            try:
                order = Order.objects.select_for_update().get(
                    pk=payment.order_id
                )
            except Order.DoesNotExist:
                raise ValidationError(
                    {"order": "La commande associée est introuvable."}
                )

            if payment.status != Payment.Status.PENDING:
                raise ValidationError(
                    {"status": "Seuls les paiements en attente peuvent être confirmés."}
                )

            if order.status in [
                Order.Status.CANCELLED,
                Order.Status.SERVED,
            ]:
                raise ValidationError(
                    {"order": "Cette commande ne peut plus recevoir de paiement."}
                )

            confirmed_total = sum(
                Payment.objects.filter(
                    order=order,
                    status=Payment.Status.CONFIRMED,
                ).values_list("amount", flat=True),
                start=0,
            )

            if confirmed_total + payment.amount > order.total_amount:
                raise ValidationError(
                    {"amount": "Ce paiement dépasserait le montant de la commande."}
                )

            payment.status = Payment.Status.CONFIRMED
            payment.confirmed_by = request.user
            payment.confirmed_at = timezone.now()
            payment.save(
                update_fields=[
                    "status",
                    "confirmed_by",
                    "confirmed_at",
                    "updated_at",
                ]
            )

        return Response(
            self.get_serializer(payment).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsRestaurantAdmin],
        url_path="refund",
    )
    def refund(self, request, pk=None):
        with transaction.atomic():
            try:
                payment = Payment.objects.select_for_update().get(pk=pk)
            except Payment.DoesNotExist:
                raise ValidationError(
                    {"payment": "Ce paiement n'existe pas."}
                )

            if payment.status != Payment.Status.CONFIRMED:
                raise ValidationError(
                    {"status": "Seul un paiement confirmé peut être remboursé."}
                )

            payment.status = Payment.Status.REFUNDED
            payment.save(update_fields=["status", "updated_at"])

        return Response(
            self.get_serializer(payment).data,
            status=status.HTTP_200_OK,
        )
