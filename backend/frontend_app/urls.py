from django.urls import path

from . import views

app_name = "frontend"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("", views.page_view, {"page": "dashboard"}, name="dashboard"),
    path("orders/new/", views.page_view, {"page": "pos"}, name="pos"),
    path("payments/collect/<int:order_id>/", views.collect_payment_view, name="collect_payment"),
    path("invoices/ticket/<int:order_id>/", views.ticket_view, name="ticket"),
]

for page in views.PAGES:
    if page not in {"dashboard", "pos"}:
        urlpatterns.append(path(f"{page}/", views.page_view, {"page": page}, name=page))
