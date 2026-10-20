from decimal import Decimal

from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.expenses.models import Expense

from .permissions import IsAdminRole


ZERO = Decimal("0.00")


def decimal_value(value):
    """Convertit une valeur absente en montant décimal nul."""
    return value if value is not None else ZERO


def date_range_from_request(request):
    """
    Récupère date_from et date_to.
    Par défaut, la période couvre le mois en cours.
    """
    today = timezone.localdate()

    date_from_raw = request.query_params.get("date_from")
    date_to_raw = request.query_params.get("date_to")

    date_from = parse_date(date_from_raw) if date_from_raw else today.replace(day=1)
    date_to = parse_date(date_to_raw) if date_to_raw else today

    if date_from is None or date_to is None:
        return None, None, Response(
            {
                "detail": "Dates invalides. Format attendu : AAAA-MM-JJ."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if date_from > date_to:
        return None, None, Response(
            {
                "detail": "La date de début doit être antérieure ou égale à la date de fin."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return date_from, date_to, None


def confirmed_payments(queryset):
    """
    Calcule le montant des paiements confirmés.

    Les paiements ayant le statut REFUNDED ne sont pas inclus.
    """
    total = queryset.filter(
        status=Payment.Status.CONFIRMED
    ).aggregate(
        total=Sum("amount")
    )["total"]

    return decimal_value(total)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def dashboard_overview(request):
    """
    GET /api/dashboard/
    Statistiques générales du restaurant.
    """
    date_from, date_to, error = date_range_from_request(request)

    if error:
        return error

    orders = Order.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).exclude(status=Order.Status.CANCELLED)

    payments = Payment.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )

    expenses = Expense.objects.filter(
        date__gte=date_from,
        date__lte=date_to,
    )

    revenue = orders.aggregate(
        total=Sum("total_amount")
    )["total"]

    payment_confirmed = confirmed_payments(payments)

    payment_pending = payments.filter(
        status=Payment.Status.PENDING
    ).aggregate(total=Sum("amount"))["total"]

    expense_total = expenses.aggregate(
        total=Sum("amount")
    )["total"]

    order_stats = orders.aggregate(
        count=Count("id")
    )

    pending_orders = orders.filter(
        status=Order.Status.PENDING
    ).count()

    today = timezone.localdate()

    today_orders = Order.objects.filter(
        created_at__date=today
    ).exclude(status=Order.Status.CANCELLED).count()

    today_expenses = Expense.objects.filter(
        date=today
    ).aggregate(total=Sum("amount"))["total"]

    return Response({
        "period": {
            "date_from": date_from,
            "date_to": date_to,
        },
        "revenue": {
            "total": decimal_value(revenue),
        },
        "payments": {
            "confirmed_net": payment_confirmed,
            "pending": decimal_value(payment_pending),
        },
        "expenses": {
            "total": decimal_value(expense_total),
            "today": decimal_value(today_expenses),
        },
        "balance_estimate": payment_confirmed - decimal_value(expense_total),
        "orders": {
            "total": order_stats["count"],
            "today": today_orders,
            "pending": pending_orders,
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def dashboard_top_dishes(request):
    """
    GET /api/dashboard/top-dishes/
    Classement des plats par quantité vendue.
    """
    date_from, date_to, error = date_range_from_request(request)

    if error:
        return error

    items = OrderItem.objects.filter(
        order__created_at__date__gte=date_from,
        order__created_at__date__lte=date_to,
    ).exclude(
        order__status=Order.Status.CANCELLED
    )

    top_dishes = items.values(
        "dish_id",
        "dish_name",
    ).annotate(
        quantity_sold=Sum("quantity"),
        revenue=Sum("subtotal"),
    ).order_by("-quantity_sold")[:10]

    return Response({
        "period": {
            "date_from": date_from,
            "date_to": date_to,
        },
        "results": list(top_dishes),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def dashboard_sales(request):
    """
    GET /api/dashboard/sales/
    Évolution quotidienne du montant des commandes non annulées.
    """
    date_from, date_to, error = date_range_from_request(request)

    if error:
        return error

    orders = Order.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).exclude(
        status=Order.Status.CANCELLED
    )

    sales = orders.annotate(
        day=TruncDate("created_at")
    ).values(
        "day"
    ).annotate(
        total=Sum("total_amount"),
        order_count=Count("id"),
    ).order_by("day")

    return Response({
        "period": {
            "date_from": date_from,
            "date_to": date_to,
        },
        "results": list(sales),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def dashboard_reports(request):
    """
    GET /api/dashboard/reports/
    Résumé financier pour une période donnée.
    """
    date_from, date_to, error = date_range_from_request(request)

    if error:
        return error

    orders = Order.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).exclude(
        status=Order.Status.CANCELLED
    )

    payments = Payment.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )

    expenses = Expense.objects.filter(
        date__gte=date_from,
        date__lte=date_to,
    )

    return Response({
        "period": {
            "date_from": date_from,
            "date_to": date_to,
        },
        "orders_count": orders.count(),
        "orders_total": decimal_value(
            orders.aggregate(total=Sum("total_amount"))["total"]
        ),
        "payments_net": confirmed_payments(payments),
        "expenses_total": decimal_value(
            expenses.aggregate(total=Sum("amount"))["total"]
        ),
    })