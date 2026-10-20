from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("", views.dashboard_overview, name="overview"),
    path("sales/", views.dashboard_sales, name="sales"),
    path("top-dishes/", views.dashboard_top_dishes, name="top-dishes"),
    path("reports/", views.dashboard_reports, name="reports"),
]