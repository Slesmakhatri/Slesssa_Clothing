from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole
from apps.orders.repository import get_order_for_user
from apps.orders.serializers import OrderSerializer

from .khalti import KhaltiConfigurationError, KhaltiGatewayError
from .repository import get_payment_for_user, initiate_payment, list_payments, verify_payment
from .serializers import PaymentInitiationSerializer, PaymentSerializer, PaymentVerificationSerializer


class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        return Response(PaymentSerializer(list_payments(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        payment = get_payment_for_user(request.user, pk)
        if not payment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(payment).data)


class PaymentInitiationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_order_for_user(request.user, serializer.validated_data["order"])
        if not order or order.get("user_id") != request.user.id:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            payment = initiate_payment(order, serializer.validated_data["provider"])
        except KhaltiConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except KhaltiGatewayError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(
            {
                "message": "Payment initiated successfully.",
                "payment": PaymentSerializer(payment).data,
                "redirect_url": payment.get("redirect_url") or f"/checkout/payment/{payment['provider']}/{payment['id']}",
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentVerificationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = get_payment_for_user(request.user, serializer.validated_data["payment_id"])
        if not payment or payment.get("user_id") != request.user.id:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            payment = verify_payment(payment, serializer.validated_data["success"], serializer.validated_data)
        except KhaltiConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except KhaltiGatewayError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        order = get_order_for_user(request.user, payment["order"])
        return Response(
            {
                "message": "Payment verification completed.",
                "payment": PaymentSerializer(payment).data,
                "order": OrderSerializer(order).data if order else None,
            }
        )
