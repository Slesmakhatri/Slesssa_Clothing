from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminRole
from common.storage import store_uploaded_file

from .repository import (
    add_cart_item,
    add_wishlist_item,
    create_order,
    create_return_request,
    find_tracking_update,
    get_order_for_user,
    get_return_request_for_user,
    list_cart_items,
    list_orders,
    list_tracking_updates,
    list_return_requests,
    list_vouchers,
    list_wishlist_items,
    remove_cart_item,
    remove_wishlist_item,
    update_return_request,
    update_cart_item,
    vendor_update_order_status,
)
from .serializers import (
    CartItemSerializer,
    OrderCreateSerializer,
    OrderStatusUpdateSerializer,
    OrderSerializer,
    ReturnRequestSerializer,
    TrackingUpdateSerializer,
    VoucherSerializer,
    WishlistItemSerializer,
)


class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(CartItemSerializer(list_cart_items(request.user.id), many=True).data)

    def create(self, request):
        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = add_cart_item(
                request.user,
                serializer.validated_data["product_document"],
                serializer.validated_data["quantity"],
                serializer.validated_data.get("size", ""),
                serializer.validated_data.get("color", ""),
            )
        except ValueError as exc:
            return Response({"quantity": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        try:
            item = update_cart_item(request.user, pk, int(request.data.get("quantity", 1)))
        except ValueError as exc:
            return Response({"quantity": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CartItemSerializer(item).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)

    def destroy(self, request, pk=None):
        remove_cart_item(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(WishlistItemSerializer(list_wishlist_items(request.user.id), many=True).data)

    def create(self, request):
        serializer = WishlistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from apps.products.repository import get_product_by_id

        product = get_product_by_id(serializer.validated_data["product"])
        if not product:
            return Response({"product": ["A valid product is required."]}, status=status.HTTP_400_BAD_REQUEST)
        item = add_wishlist_item(request.user, product)
        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        remove_wishlist_item(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(OrderSerializer(list_orders(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        order = get_order_for_user(request.user, pk)
        if not order:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)

    def create(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            order = create_order(request.user, serializer.validated_data)
        except ValidationError:
            raise
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "Unable to place your order right now."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        order = get_order_for_user(request.user, pk)
        if not order:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role not in {"vendor", "admin", "super_admin"}:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        serializer = OrderStatusUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            if request.user.role == "vendor":
                updated, _ = vendor_update_order_status(
                    request.user,
                    pk,
                    serializer.validated_data.get("status", order.get("status")),
                    serializer.validated_data.get("note", ""),
                )
            else:
                from .repository import append_tracking_update

                append_tracking_update(order["id"], serializer.validated_data.get("status", order.get("status")), serializer.validated_data.get("note", ""))
                updated = get_order_for_user(request.user, order["id"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(updated).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)


class TrackingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        return Response(TrackingUpdateSerializer(list_tracking_updates(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        update = find_tracking_update(request.user, pk)
        if not update:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TrackingUpdateSerializer(update).data)


class ReturnRequestViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(ReturnRequestSerializer(list_return_requests(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        document = get_return_request_for_user(request.user, pk)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReturnRequestSerializer(document).data)

    def create(self, request):
        payload = dict(request.data)
        if "image_proof" in request.FILES:
            payload["image_proof"] = store_uploaded_file(request.FILES["image_proof"], "returns")
        serializer = ReturnRequestSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            document = create_return_request(request.user, serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReturnRequestSerializer(document).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        document = get_return_request_for_user(request.user, pk)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in {"vendor", "admin", "super_admin"}:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == "vendor" and document.get("vendor_user_id") != request.user.id:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ReturnRequestSerializer(data={**document, **request.data}, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = update_return_request(request.user, pk, serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReturnRequestSerializer(updated).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)


class VoucherViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(VoucherSerializer(list_vouchers(request.user), many=True).data)
