from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import CurrentUserView, UserViewSet
from .views import UserManagementViewSet


router = DefaultRouter()
router.register("accounts", UserViewSet, basename="account")
router.register("users", UserManagementViewSet, basename="user-management")


urlpatterns = [
    path(
        "auth/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path(
        "auth/me/",
        CurrentUserView.as_view(),
        name="current_user",
    ),
    path("", include(router.urls)),
]