from django.urls import path

from .views import RestaurantSettingsView

urlpatterns = [
    path(
        "restaurant-settings/",
        RestaurantSettingsView.as_view(),
        name="restaurant-settings",
    ),
]