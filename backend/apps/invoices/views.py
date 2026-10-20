from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsRestaurantAdmin
from apps.orders.models import Order

from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            "order",
            "issued_by",
        ).prefetch_related("items")

        order_id = self.request.query_params.get("order")
        invoice_status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if order_id:
            queryset = queryset.filter(order_id=order_id)

        if invoice_status:
            queryset = queryset.filter(status=invoice_status)

        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(customer_phone__icontains=search)
                | Q(order__order_number__icontains=search)
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsRestaurantAdmin],
        url_path="issue",
    )
    def issue(self, request):
        order_id = request.data.get("order")
        discount_value = request.data.get("discount_amount", "0")
        notes = request.data.get("notes", "")

        if not order_id:
            raise ValidationError({
                "order": "L'identifiant de la commande est obligatoire."
            })

        try:
            discount = Decimal(str(discount_value))
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({
                "discount_amount": "La remise doit être un montant valide."
            })

        if not discount.is_finite() or discount < Decimal("0.00"):
            raise ValidationError({
                "discount_amount": "La remise doit être positive ou nulle."
            })

        if not isinstance(notes, str):
            raise ValidationError({
                "notes": "Les notes doivent être du texte."
            })

        with transaction.atomic():
            try:
                order = (
                    Order.objects.select_for_update()
                    .select_related("customer")
                    .prefetch_related("items")
                    .get(pk=order_id)
                )
            except (Order.DoesNotExist, ValueError, TypeError):
                raise ValidationError({
                    "order": "Cette commande n'existe pas."
                })

            if order.status == Order.Status.CANCELLED:
                raise ValidationError({
                    "order": "Impossible de facturer une commande annulée."
                })

            if Invoice.objects.filter(order=order).exists():
                raise ValidationError({
                    "order": "Cette commande possède déjà une facture."
                })

            order_items = list(order.items.all())

            if not order_items:
                raise ValidationError({
                    "order": "Impossible de facturer une commande vide."
                })

            subtotal = sum(
                (
                    item.unit_price * item.quantity
                    for item in order_items
                ),
                Decimal("0.00"),
            )

            if discount > subtotal:
                raise ValidationError({
                    "discount_amount": (
                        "La remise ne peut pas dépasser le montant de la commande."
                    )
                })

            total = subtotal - discount

            customer_name = ""
            customer_phone = ""

            if order.customer:
                customer_name = (
                    f"{order.customer.first_name} "
                    f"{order.customer.last_name}"
                ).strip()
                customer_phone = order.customer.phone

            invoice = Invoice.objects.create(
                order=order,
                status=Invoice.Status.ISSUED,
                customer_name=customer_name,
                customer_phone=customer_phone,
                subtotal=subtotal,
                discount_amount=discount,
                total_amount=total,
                issued_by=request.user,
                notes=notes,
            )

            InvoiceItem.objects.bulk_create([
                InvoiceItem(
                    invoice=invoice,
                    dish_name=item.dish_name,
                    unit_price=item.unit_price,
                    quantity=item.quantity,
                    subtotal=item.unit_price * item.quantity,
                )
                for item in order_items
            ])

        return Response(
            InvoiceSerializer(
                invoice,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )