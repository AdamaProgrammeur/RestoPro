from rest_framework.routers import DefaultRouter
from .views import DishViewSet

router = DefaultRouter()

router.register("menu", DishViewSet, basename="dish")

urlpatterns = router.urls
