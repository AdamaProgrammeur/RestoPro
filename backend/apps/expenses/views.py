from datetime import date

from django.db.models import Sum, Avg, Count
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from django_filters.rest_framework import DjangoFilterBackend

from .models import Expense
from .serializers import ExpenseSerializer
from .permissions import IsAdminOrManager


class ExpenseViewSet(viewsets.ModelViewSet):

    serializer_class = ExpenseSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminOrManager,
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "category",
        "payment_method",
        "date",
    ]

    search_fields = [
        "title",
        "description",
    ]

    ordering_fields = [
        "date",
        "amount",
        "created_at",
    ]

    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        queryset = Expense.objects.select_related(
            "created_by"
        ).all()

        params = self.request.query_params

        date_from = params.get("date_from")
        date_to = params.get("date_to")

        if date_from:
            parsed_from = parse_date(date_from)

            if parsed_from is None:
                raise ValidationError({
                    "date_from": "Format attendu : AAAA-MM-JJ."
                })

            queryset = queryset.filter(date__gte=parsed_from)

        if date_to:
            parsed_to = parse_date(date_to)

            if parsed_to is None:
                raise ValidationError({
                    "date_to": "Format attendu : AAAA-MM-JJ."
                })

            queryset = queryset.filter(date__lte=parsed_to)

        if date_from and date_to:
            if parsed_from > parsed_to:
                raise ValidationError({
                    "date_to": (
                        "La date de fin doit être "
                        "postérieure ou égale à la date de début."
                    )
                })

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(
        detail=False,
        methods=["get"],
        url_path="summary",
    )
    def summary(self, request):
        """
        Retourne les statistiques des dépenses
        pour la période demandée.
        """

        queryset = self.filter_queryset(self.get_queryset())

        statistics = queryset.aggregate(
            total_amount=Sum("amount"),
            expense_count=Count("id"),
            average_amount=Avg("amount"),
        )

        return Response({
            "date_from": request.query_params.get("date_from"),
            "date_to": request.query_params.get("date_to"),
            "total_amount": statistics["total_amount"] or 0,
            "expense_count": statistics["expense_count"],
            "average_amount": statistics["average_amount"] or 0,
        })

    @action(
        detail=False,
        methods=["get"],
        url_path="monthly-summary",
    )
    def monthly_summary(self, request):
        """
        Statistiques des dépenses pour un mois donné.

        Paramètres :
        - year : année
        - month : mois
        """

        year = request.query_params.get("year")
        month = request.query_params.get("month")

        if not year or not month:
            raise ValidationError({
                "detail": (
                    "Les paramètres year et month sont obligatoires."
                )
            })

        try:
            year = int(year)
            month = int(month)
        except (TypeError, ValueError):
            raise ValidationError({
                "detail": "L'année et le mois doivent être des entiers."
            })

        if year < 2000 or year > 2100:
            raise ValidationError({
                "year": "L'année doit être comprise entre 2000 et 2100."
            })

        if month < 1 or month > 12:
            raise ValidationError({
                "month": "Le mois doit être compris entre 1 et 12."
            })

        queryset = Expense.objects.filter(
            date__year=year,
            date__month=month,
        )

        statistics = queryset.aggregate(
            total_amount=Sum("amount"),
            expense_count=Count("id"),
            average_amount=Avg("amount"),
        )

        return Response({
            "year": year,
            "month": month,
            "total_amount": statistics["total_amount"] or 0,
            "expense_count": statistics["expense_count"],
            "average_amount": statistics["average_amount"] or 0,
        })

    @action(
        detail=False,
        methods=["get"],
        url_path="category-summary",
    )
    def category_summary(self, request):
        """
        Répartition des dépenses par catégorie.
        Les paramètres date_from et date_to sont facultatifs.
        """

        year = request.query_params.get("year")
        month = request.query_params.get("month")

        if not year or not month:
            raise ValidationError({
                "detail": (
                    "Les paramètres year et month sont obligatoires."
                )
            })

        try:
            year = int(year)
            month = int(month)
        except (TypeError, ValueError):
            raise ValidationError({
                "detail": "L'année et le mois doivent être des entiers."
            })

        if year < 2000 or year > 2100:
            raise ValidationError({
                "year": "L'année doit être comprise entre 2000 et 2100."
            })

        if month < 1 or month > 12:
            raise ValidationError({
                "month": "Le mois doit être compris entre 1 et 12."
            })

        queryset = self.filter_queryset(
                self.get_queryset()
            ).filter(
                date__year=year,
                date__month=month,
            )

        statistics = (
            queryset
            .values("category")
            .annotate(
                total_amount=Sum("amount"),
                expense_count=Count("id"),
            )
            .order_by("-total_amount")
        )

        results = []

        for item in statistics:
            category_value = item["category"]

            results.append({
                "category": category_value,
                "category_display": dict(
                    Expense.Category.choices
                ).get(category_value, category_value),
                "total_amount": item["total_amount"],
                "expense_count": item["expense_count"],
            })

        return Response(results)