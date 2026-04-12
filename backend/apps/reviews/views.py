from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from apps.products.repository import get_product_by_id
from common.mongo import utcnow

from .repository import (
    QUESTION_STATUS_ANSWERED,
    QUESTION_STATUS_MODERATED,
    create_product_question,
    create_review,
    delete_product_question,
    delete_review,
    get_product_question_by_id,
    get_review_by_id,
    list_product_questions,
    list_reviews,
    update_product_question,
    update_review,
)
from .serializers import ProductQuestionSerializer, ReviewSerializer


def _vendor_owns_product_resource(user, resource):
    return user.role == "vendor" and resource.get("vendor_user_id") == user.id


class ReviewViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        product_id = request.query_params.get("product")
        user_id = request.query_params.get("user")
        if user_id is not None:
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return Response({"detail": "Invalid user filter."}, status=status.HTTP_400_BAD_REQUEST)
            if not request.user.is_authenticated:
                return Response([], status=status.HTTP_200_OK)
            if request.user.role not in {"admin", "super_admin"} and user_id != request.user.id:
                return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        include_hidden = bool(
            request.user.is_authenticated and request.user.role in {"admin", "super_admin", "vendor"} and request.query_params.get("include_hidden")
        )
        vendor_user_id = request.user.id if request.user.is_authenticated and request.user.role == "vendor" else None
        return Response(
            ReviewSerializer(
                list_reviews(
                    product_id=product_id,
                    user_id=user_id,
                    vendor_user_id=vendor_user_id,
                    include_hidden=include_hidden or (request.user.is_authenticated and request.user.role in {"admin", "super_admin"}),
                ),
                many=True,
            ).data
        )

    def retrieve(self, request, pk=None):
        review = get_review_by_id(pk)
        if not review:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if review.get("status") == "hidden" and not (
            request.user.is_authenticated
            and (request.user.role in {"admin", "super_admin"} or request.user.id == review.get("user") or _vendor_owns_product_resource(request.user, review))
        ):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReviewSerializer(review).data)

    def create(self, request):
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_product_by_id(serializer.validated_data["product"])
        if not product:
            return Response({"product": ["A valid product is required."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            review = create_review(request.user, product, serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        review = get_review_by_id(pk)
        if not review:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        can_edit = review["user"] == request.user.id or request.user.role in {"admin", "super_admin"} or _vendor_owns_product_resource(request.user, review)
        if not can_edit:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        payload = dict(request.data)
        if request.user.role not in {"admin", "super_admin", "vendor"}:
            payload.pop("status", None)
        serializer = ReviewSerializer(data={**review, **payload}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_review(pk, serializer.validated_data)
        return Response(ReviewSerializer(updated).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)

    def destroy(self, request, pk=None):
        review = get_review_by_id(pk)
        if not review:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if review["user"] != request.user.id and request.user.role not in {"admin", "super_admin"}:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        delete_review(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductQuestionViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        product_id = request.query_params.get("product")
        user_id = request.user.id if request.user.is_authenticated and request.query_params.get("mine") else None
        vendor_user_id = request.user.id if request.user.is_authenticated and request.user.role == "vendor" else None
        include_moderated = request.user.is_authenticated and request.user.role in {"admin", "super_admin", "vendor"}
        return Response(
            ProductQuestionSerializer(
                list_product_questions(
                    product_id=product_id,
                    user_id=user_id,
                    vendor_user_id=vendor_user_id,
                    include_moderated=include_moderated,
                ),
                many=True,
            ).data
        )

    def retrieve(self, request, pk=None):
        question = get_product_question_by_id(pk)
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductQuestionSerializer(question).data)

    def create(self, request):
        serializer = ProductQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_product_by_id(serializer.validated_data["product"])
        if not product:
            return Response({"product": ["A valid product is required."]}, status=status.HTTP_400_BAD_REQUEST)
        question = create_product_question(request.user, product, serializer.validated_data)
        return Response(ProductQuestionSerializer(question).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        question = get_product_question_by_id(pk)
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = dict(request.data)
        if request.user.role == "customer":
            if question["user"] != request.user.id or question.get("status") != "pending":
                return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
            payload = {"question": payload.get("question", question.get("question", ""))}
        elif request.user.role == "vendor":
            if not _vendor_owns_product_resource(request.user, question):
                return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
            if payload.get("answer"):
                payload["status"] = QUESTION_STATUS_ANSWERED
                payload["answered_by"] = request.user.id
                payload["answered_by_name"] = request.user.full_name or request.user.email
                payload["answered_at"] = question.get("answered_at") or utcnow()
        elif request.user.role in {"admin", "super_admin"}:
            if payload.get("answer") and payload.get("status") != QUESTION_STATUS_MODERATED:
                payload["status"] = QUESTION_STATUS_ANSWERED
                payload["answered_by"] = request.user.id
                payload["answered_by_name"] = request.user.full_name or request.user.email
                payload["answered_at"] = question.get("answered_at") or utcnow()
        else:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProductQuestionSerializer(data={**question, **payload}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_product_question(pk, serializer.validated_data)
        return Response(ProductQuestionSerializer(updated).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)

    def destroy(self, request, pk=None):
        question = get_product_question_by_id(pk)
        if not question:
            return Response(status=status.HTTP_204_NO_CONTENT)
        can_delete = request.user.role in {"admin", "super_admin"} or (
            request.user.role == "customer" and question["user"] == request.user.id and question.get("status") == "pending"
        )
        if not can_delete:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        delete_product_question(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
