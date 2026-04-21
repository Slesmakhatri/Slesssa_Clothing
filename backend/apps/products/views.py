from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminRole, IsVendorOrAdmin
from apps.vendors.repository import create_vendor, get_vendor_by_id, get_vendor_by_user_id
from common.storage import store_uploaded_file

from .repository import (
    create_category,
    create_product,
    delete_category,
    delete_product,
    get_category_by_id,
    get_product_by_slug,
    list_categories,
    list_products,
    search_suggestions,
    update_category,
    update_product,
)
from .serializers import CategorySerializer, ProductSerializer


def _mapping_or_empty(value):
    return value if isinstance(value, dict) else {}


def _vendor_ready_for_selling(vendor):
    if not vendor:
        return False, "Vendor profile not found."
    if vendor.get("approval_status") != "approved":
        return False, "Vendor approval is required before adding products."
    if not vendor.get("is_shop_setup_complete"):
        return False, "Complete your shop profile before adding products."
    return True, ""


class CategoryViewSet(viewsets.ViewSet):
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminRole()]

    def list(self, request):
        return Response(CategorySerializer(list_categories(), many=True).data)

    def retrieve(self, request, pk=None):
        category = get_category_by_id(pk)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CategorySerializer(category).data)

    def create(self, request):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = create_category(serializer.validated_data)
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = update_category(pk, serializer.validated_data)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CategorySerializer(category).data)

    def partial_update(self, request, pk=None):
        serializer = CategorySerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category = update_category(pk, serializer.validated_data)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CategorySerializer(category).data)

    def destroy(self, request, pk=None):
        delete_category(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ViewSet):
    lookup_field = "slug"
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVendorOrAdmin()]

    def list(self, request):
        vendor_user_id = request.user.id if request.user.is_authenticated and request.user.role == "vendor" and request.query_params.get("mine") else None
        products = list_products(request.query_params, include_inactive=self.action not in ["list", "retrieve"], vendor_user_id=vendor_user_id)
        return Response(ProductSerializer(products, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def suggestions(self, request):
        return Response(search_suggestions(request.query_params.get("q", ""), limit=8))

    def retrieve(self, request, slug=None):
        product = get_product_by_slug(slug, include_sustainable_alternatives=True)
        if not product or not product.get("is_active", True):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductSerializer(product, context={"request": request}).data)

    def create(self, request):
        # Debug: log incoming request data to help identify payload shape/type issues
        try:
            print('DEBUG: Incoming product create request.data ->', dict(request.data))
        except Exception:
            print('DEBUG: Unable to cast request.data to dict for logging')
        payload = dict(request.data)
        # Detailed debug of incoming keys and value types
        try:
            for k, v in request.data.items():
                try:
                    print(f"DEBUG FIELD: {k} -> type={type(v).__name__} value={v}")
                except Exception:
                    print(f"DEBUG FIELD: {k} -> (unprintable value)")
        except Exception:
            print('DEBUG: unable to iterate request.data')
        if "main_image" in request.FILES:
            payload["main_image"] = store_uploaded_file(request.FILES["main_image"], "products/main")
        serializer = ProductSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        category = get_category_by_id(serializer.validated_data["category"])
        if not category:
            return Response({"category": ["A valid category is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role in {"admin", "super_admin"}:
            vendor = get_vendor_by_id(serializer.validated_data["vendor"])
        else:
            vendor = get_vendor_by_user_id(request.user.id) or create_vendor(request.user, {"brand_name": request.user.full_name or request.user.username})
            is_ready, detail = _vendor_ready_for_selling(vendor)
            if not is_ready:
                return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)
        if not vendor:
            return Response({"vendor": ["A valid vendor is required."]}, status=status.HTTP_400_BAD_REQUEST)
        product = create_product(serializer.validated_data, vendor, category)
        return Response(ProductSerializer(product, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug=None):
        product = get_product_by_slug(slug)
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role not in {"admin", "super_admin"} and _mapping_or_empty(product.get("vendor_detail")).get("user") != request.user.id:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        payload = dict(request.data)
        if "main_image" in request.FILES:
            payload["main_image"] = store_uploaded_file(request.FILES["main_image"], "products/main")
        serializer = ProductSerializer(data={**product, **payload}, partial=True)
        serializer.is_valid(raise_exception=True)
        category = get_category_by_id(serializer.validated_data["category"]) if "category" in serializer.validated_data else None
        vendor = get_vendor_by_id(serializer.validated_data["vendor"]) if request.user.role in {"admin", "super_admin"} and "vendor" in serializer.validated_data else None
        updated = update_product(product["id"], serializer.validated_data, vendor_document=vendor, category_document=category)
        return Response(ProductSerializer(updated, context={"request": request}).data)

    def update(self, request, slug=None):
        return self.partial_update(request, slug=slug)

    def destroy(self, request, slug=None):
        product = get_product_by_slug(slug)
        if not product:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.user.role not in {"admin", "super_admin"} and _mapping_or_empty(product.get("vendor_detail")).get("user") != request.user.id:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        delete_product(product["id"])
        return Response(status=status.HTTP_204_NO_CONTENT)
