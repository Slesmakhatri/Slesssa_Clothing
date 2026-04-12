from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole, IsVendorOrAdmin
from common.storage import store_uploaded_file

from .repository import (
    create_vendor,
    create_vendor_application,
    delete_vendor,
    get_vendor_application,
    get_vendor_by_slug,
    list_vendor_applications,
    list_vendors,
    update_vendor,
    update_vendor_application,
    vendor_to_public,
)
from .serializers import VendorApplicationSerializer, VendorProfileSerializer


class VendorProfileViewSet(viewsets.ViewSet):
    lookup_field = "slug"
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), IsVendorOrAdmin()]

    def list(self, request):
        include_unapproved = request.user.is_authenticated and request.user.role in {"admin", "super_admin", "vendor"}
        return Response(VendorProfileSerializer(list_vendors(include_unapproved=include_unapproved, user=request.user), many=True).data)

    def retrieve(self, request, slug=None):
        vendor = get_vendor_by_slug(slug)
        if not vendor or (vendor.get("approval_status") != "approved" and (not request.user.is_authenticated or request.user.role not in {"admin", "super_admin"})):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(VendorProfileSerializer(vendor_to_public(vendor)).data)

    def create(self, request):
        payload = dict(request.data)
        if "logo" in request.FILES:
            payload["logo"] = store_uploaded_file(request.FILES["logo"], "vendors/logos")
        if "banner" in request.FILES:
            payload["banner"] = store_uploaded_file(request.FILES["banner"], "vendors/banners")
        serializer = VendorProfileSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        vendor = create_vendor(request.user, serializer.validated_data)
        return Response(VendorProfileSerializer(vendor_to_public(vendor)).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug=None):
        vendor = get_vendor_by_slug(slug)
        if not vendor:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role not in {"admin", "super_admin"} and vendor["user"] != request.user.id:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        payload = dict(request.data)
        if "logo" in request.FILES:
            payload["logo"] = store_uploaded_file(request.FILES["logo"], "vendors/logos")
        if "banner" in request.FILES:
            payload["banner"] = store_uploaded_file(request.FILES["banner"], "vendors/banners")
        serializer = VendorProfileSerializer(data={**vendor_to_public(vendor), **payload}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_vendor(vendor["id"], serializer.validated_data)
        return Response(VendorProfileSerializer(vendor_to_public(updated)).data)

    def update(self, request, slug=None):
        return self.partial_update(request, slug=slug)

    def destroy(self, request, slug=None):
        vendor = get_vendor_by_slug(slug)
        if not vendor:
            return Response(status=status.HTTP_204_NO_CONTENT)
        delete_vendor(vendor["id"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorApplicationAPIView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminRole()]

    def get(self, request):
        return Response(VendorApplicationSerializer(list_vendor_applications(request.user), many=True).data)

    def post(self, request):
        payload = dict(request.data)
        documents = []
        if "document" in request.FILES:
            documents.append(store_uploaded_file(request.FILES["document"], "vendors/applications"))
        if documents:
            payload["documents"] = documents
        serializer = VendorApplicationSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        document = create_vendor_application(serializer.validated_data)
        return Response(VendorApplicationSerializer(document).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        application = get_vendor_application(request.data.get("id"))
        if not application:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = VendorApplicationSerializer(data={**application, **request.data}, partial=True)
        serializer.is_valid(raise_exception=True)
        document = update_vendor_application(application["id"], serializer.validated_data)
        return Response(VendorApplicationSerializer(document).data)
