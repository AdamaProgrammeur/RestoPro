from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class ExpensePermissionTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_test",
            password="TestPassword123!",
            role="ADMIN",
        )

        self.manager = User.objects.create_user(
            username="gerant_test",
            password="TestPassword123!",
            role="MANAGER",
        )

        self.url = "/api/expenses/"

    def test_anonymous_user_cannot_access_expenses(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_admin_can_access_expenses(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_manager_can_access_expenses(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.expenses.models import Expense


class ExpenseCreationTests(APITestCase):

    def setUp(self):
        # À adapter si ton modèle utilisateur nécessite
        # d'autres champs obligatoires.
        from django.contrib.auth import get_user_model

        User = get_user_model()

        self.manager = User.objects.create_user(
            username="gerant_expense_test",
            password="TestPassword123!",
            role="MANAGER",
        )

        self.client.force_authenticate(user=self.manager)

    def test_manager_can_create_expense(self):
        payload = {
            "title": "Achat de gaz",
            "category": "GAS",
            "amount": "15000.00",
            "date": timezone.localdate().isoformat(),
            "description": "Recharge de gaz pour la cuisine",
            "payment_method": "CASH",
        }

        response = self.client.post(
            "/api/expenses/",
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        expense = Expense.objects.get(
            title="Achat de gaz"
        )

        self.assertEqual(
            expense.amount,
            Decimal("15000.00"),
        )

        self.assertEqual(
            expense.created_by,
            self.manager,
        )
