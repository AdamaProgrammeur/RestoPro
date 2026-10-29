from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("", include("frontend_app.urls")),
    path("admin/", admin.site.urls),
    path("api/", include("apps.categories.urls")),
    path("api/", include("apps.menu.urls")),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.customers.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.invoices.urls")),
    path("api/", include("apps.restaurant_settings.urls")),
    path("api/", include("apps.expenses.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
