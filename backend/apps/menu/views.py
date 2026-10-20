from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import Dish
from .serializers import DishSerializer


class DishViewSet(viewsets.ModelViewSet):

    queryset = Dish.objects.select_related("category").all()

    serializer_class = DishSerializer

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Dish.objects.select_related("category").all()

        category_id = self.request.query_params.get("category")
        available = self.request.query_params.get("available")
        search = self.request.query_params.get("search")

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        if available is not None:
            if available.lower() == "true":
                queryset = queryset.filter(is_available=True)
            elif available.lower() == "false":
                queryset = queryset.filter(is_available=False)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset
