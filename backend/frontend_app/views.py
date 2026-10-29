from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.http import url_has_allowed_host_and_scheme
from django.shortcuts import redirect, render


PAGES = {
    "dashboard": ("Tableau de bord", "dashboard/dashboard.html"),
    "reports": ("Rapports de vente", "dashboard/reports.html"),
    "pos": ("Nouvelle commande", "orders/new_order.html"),
    "categories": ("Catégories", "categories/categories.html"),
    "menu": ("Menus", "menu/menu.html"),
    "customers": ("Clients", "customers/customers.html"),
    "orders": ("Commandes", "orders/orders.html"),
    "payments": ("Paiements", "payments/payments.html"),
    "invoices": ("Tickets et factures", "invoices/invoices.html"),
    "expenses": ("Dépenses", "expenses/expenses.html"),
    "users": ("Utilisateurs", "users/users.html"),
    "settings": ("Paramètres", "settings/settings.html"),
}


def login_view(request):
    if request.user.is_authenticated:
        return redirect("frontend:dashboard")

    error = None
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            next_url = request.GET.get("next", "")
            if next_url and url_has_allowed_host_and_scheme(
                next_url,
                allowed_hosts={request.get_host()},
                require_https=request.is_secure(),
            ):
                return redirect(next_url)
            return redirect("frontend:dashboard")
        error = "Identifiant ou mot de passe incorrect."
    return render(request, "frontend/login.html", {"error": error})


@login_required
def logout_view(request):
    logout(request)
    return redirect("frontend:login")


@login_required
def page_view(request, page):
    if request.user.role == "MANAGER" and page in {"dashboard", "reports", "users", "settings"}:
        return redirect("frontend:orders")
    title, template = PAGES[page]
    return render(request, f"frontend/{template}", {"page": page, "title": title})


@login_required
def collect_payment_view(request, order_id):
    return render(request, "frontend/payments/collect.html", {
        "page": "collect",
        "title": "Encaissement",
        "order_id": order_id,
    })


@login_required
def ticket_view(request, order_id):
    return render(request, "frontend/invoices/ticket.html", {
        "page": "ticket",
        "title": "Ticket de caisse",
        "order_id": order_id,
    })
