from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class BackendRootAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "message": "Slessaa Clothing Backend API",
                "endpoints": {
                    "api": "/api/",
                    "auth": "/api/auth/",
                },
            }
        )


class ApiRootAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "message": "Slessaa Clothing API root",
                "groups": {
                    "auth": "/api/auth/",
                    "account": "/api/account/",
                    "vendors": "/api/vendors/",
                    "categories": "/api/categories/",
                    "products": "/api/products/",
                    "cart": "/api/cart/",
                    "orders": "/api/orders/",
                    "payments": "/api/payments/",
                    "tracking": "/api/tracking/",
                    "measurements": "/api/measurements/",
                    "tailoring_requests": "/api/tailoring-requests/",
                    "reviews": "/api/reviews/",
                    "recommendations": "/api/recommendations/",
                    "chatbot": "/api/chatbot/",
                    "dashboards": "/api/dashboard/",
                },
            }
        )


class FaviconAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return HttpResponse(status=204)
