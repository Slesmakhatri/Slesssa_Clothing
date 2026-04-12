from rest_framework import permissions, status, views, viewsets
from rest_framework.response import Response

from apps.accounts.permissions import IsTailorVendorOrAdmin
from common.storage import store_uploaded_file

from .repository import (
    add_tailoring_message,
    create_measurement,
    recommend_tailor_for_request,
    create_tailoring_request,
    get_measurement_for_user,
    get_tailor_profile_for_user,
    get_tailoring_request_for_user,
    list_measurements,
    list_tailor_profiles,
    list_tailoring_messages,
    list_tailoring_requests,
    suggest_measurements_for_profile,
    update_tailoring_request,
)
from .serializers import (
    MeasurementSerializer,
    MeasurementSuggestionRequestSerializer,
    MeasurementSuggestionResponseSerializer,
    TailorProfileSerializer,
    TailorRecommendationRequestSerializer,
    TailorRecommendationResponseSerializer,
    TailoringMessageSerializer,
    TailoringRequestSerializer,
)


def mutable_request_data(request):
    if hasattr(request.data, "copy"):
        return request.data.copy()
    return dict(request.data)


class MeasurementViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(MeasurementSerializer(list_measurements(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        measurement = get_measurement_for_user(request.user, pk)
        if not measurement:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MeasurementSerializer(measurement).data)

    def create(self, request):
        serializer = MeasurementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        measurement = create_measurement(request.user, serializer.validated_data)
        return Response(MeasurementSerializer(measurement).data, status=status.HTTP_201_CREATED)


class MeasurementSuggestionAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MeasurementSuggestionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suggestion = suggest_measurements_for_profile(request.user, serializer.validated_data)
        return Response(MeasurementSuggestionResponseSerializer(suggestion).data)


class TailorProfileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(TailorProfileSerializer(list_tailor_profiles(request.user, request.query_params), many=True).data)

    def retrieve(self, request, pk=None):
        profile = get_tailor_profile_for_user(request.user, pk)
        if not profile:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TailorProfileSerializer(profile).data)


class TailorRecommendationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def create(self, request):
        serializer = TailorRecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recommendation = recommend_tailor_for_request(request.user, serializer.validated_data)
        if not recommendation:
            return Response({"detail": "No available tailors found for recommendation."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TailorRecommendationResponseSerializer(recommendation).data)


class TailoringRequestViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [permissions.IsAuthenticated(), IsTailorVendorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        return Response(TailoringRequestSerializer(list_tailoring_requests(request.user), many=True).data)

    def retrieve(self, request, pk=None):
        document = get_tailoring_request_for_user(request.user, pk)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TailoringRequestSerializer(document).data)

    def create(self, request):
        payload = mutable_request_data(request)
        if "inspiration_image" in request.FILES:
            payload["inspiration_image"] = store_uploaded_file(request.FILES["inspiration_image"], "tailoring")
        serializer = TailoringRequestSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        document = create_tailoring_request(request.user, serializer.validated_data)
        response_data = TailoringRequestSerializer(document).data
        return Response(
            {**response_data, "message": "Tailoring request created successfully."},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, pk=None):
        payload = mutable_request_data(request)
        if "inspiration_image" in request.FILES:
            payload["inspiration_image"] = store_uploaded_file(request.FILES["inspiration_image"], "tailoring")
        serializer = TailoringRequestSerializer(data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        document = update_tailoring_request(request.user, pk, serializer.validated_data)
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TailoringRequestSerializer(document).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)


class TailoringMessageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request):
        return Response(TailoringMessageSerializer(list_tailoring_messages(request.user, request.query_params.get("request")), many=True).data)

    def create(self, request):
        payload = mutable_request_data(request)
        attachments = []
        if "attachment" in request.FILES:
            attachments.append(
                {
                    "id": None,
                    "reference_image": store_uploaded_file(request.FILES["attachment"], "tailoring/messages"),
                    "caption": payload.get("attachment_caption", ""),
                    "created_at": None,
                }
            )
        serializer = TailoringMessageSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        document = add_tailoring_message(request.user, {**serializer.validated_data, "attachments": attachments})
        if not document:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TailoringMessageSerializer(document).data, status=status.HTTP_201_CREATED)
