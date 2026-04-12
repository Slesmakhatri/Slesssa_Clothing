from django.conf import settings
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from common.storage import store_uploaded_file

from .google_oauth import exchange_google_code, verify_google_credential
from .permissions import IsAdminRole, IsSuperAdminRole
from .repository import ROLE_ADMIN, ROLE_SUPER_ADMIN, create_user, delete_user, get_user_by_email, get_user_by_google_account_id, get_user_by_id, list_users, sync_google_user_profile, update_user, update_user_password, user_to_public
from .serializers import AdminUserWriteSerializer, GoogleAuthSerializer, LoginSerializer, PasswordChangeSerializer, ProfileUpdateSerializer, RegisterSerializer, UserSerializer, issue_tokens_for_user
from apps.vendors.repository import find_vendor_application_by_email


class AuthRootAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "message": "Auth API root",
                "endpoints": {
                    "register": "/api/auth/register/",
                    "login": "/api/auth/login/",
                    "google_config": "/api/auth/google/config/",
                    "google_login": "/api/auth/google/login/",
                    "refresh": "/api/auth/refresh/",
                    "profile": "/api/account/profile/",
                },
            }
        )


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": "Account created successfully.", "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class GoogleAuthConfigAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "client_id": settings.GOOGLE_CLIENT_ID or None,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI or None,
                "enabled": bool(settings.GOOGLE_CLIENT_ID),
            }
        )


class GoogleLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Google login is not configured on the server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        google_profile = (
            verify_google_credential(serializer.validated_data["id_token"])
            if serializer.validated_data["id_token"]
            else exchange_google_code(serializer.validated_data["code"])
        )
        email = google_profile["email"]
        google_account_id = google_profile["sub"]
        full_name = google_profile["name"] or email.split("@")[0]
        role = serializer.validated_data.get("account_type") or "customer"

        if role == "vendor" and not find_vendor_application_by_email(email, approved_only=True):
            return Response(
                {"detail": "Vendor Google signup is available only after admin approves your vendor application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = get_user_by_google_account_id(google_account_id) or get_user_by_email(email)
        created = False
        if not user:
            created = True
            user = create_user(
                name=full_name,
                email=email,
                phone="",
                password="",
                role=role,
                auth_provider="google",
                google_account_id=google_account_id,
                first_name=google_profile.get("given_name") or "",
                last_name=google_profile.get("family_name") or "",
                avatar=google_profile.get("picture") or "",
            )
        else:
            user = sync_google_user_profile(
                user["id"],
                google_account_id=google_account_id,
                full_name=full_name,
                first_name=google_profile.get("given_name") or "",
                last_name=google_profile.get("family_name") or "",
                avatar=google_profile.get("picture") or "",
            )

        payload = issue_tokens_for_user(user)
        payload["created"] = created
        return Response(payload)


class ProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(user_to_public(request.user.document)).data)

    def put(self, request):
        payload = dict(request.data)
        if "avatar" in request.FILES:
            payload["avatar"] = store_uploaded_file(request.FILES["avatar"], "users/avatars")
        serializer = ProfileUpdateSerializer(data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        user = update_user(request.user.id, serializer.validated_data)
        return Response(UserSerializer(user_to_public(user)).data)


class PasswordChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"user_id": request.user.id})
        serializer.is_valid(raise_exception=True)
        update_user_password(request.user.id, serializer.validated_data["new_password"])
        return Response({"message": "Password updated successfully."})


class UserAdminViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    pagination_class = None

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [permissions.IsAuthenticated(), IsSuperAdminRole()]
        return [permissions.IsAuthenticated(), IsAdminRole()]

    def list(self, request):
        return Response(UserSerializer(list_users(), many=True).data)

    def retrieve(self, request, pk=None):
        for user in list_users():
            if str(user["id"]) == str(pk):
                return Response(UserSerializer(user).data)
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = AdminUserWriteSerializer(data=request.data, context={"allow_super_admin_role": True})
        serializer.is_valid(raise_exception=True)
        user = create_user(
            name=serializer.validated_data["full_name"],
            email=serializer.validated_data["email"],
            phone=serializer.validated_data.get("phone", ""),
            password=serializer.validated_data["password"],
            role=serializer.validated_data.get("role", ROLE_ADMIN),
        )
        if serializer.validated_data.get("is_active") is False:
            user = update_user(user["id"], {"is_active": False})
        return Response(UserSerializer(user_to_public(user)).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        target = get_user_by_id(pk)
        if not target:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if target.get("role") == ROLE_SUPER_ADMIN and target.get("id") != request.user.id:
            return Response({"detail": "Super admin accounts can only update themselves."}, status=status.HTTP_403_FORBIDDEN)
        existing_data = {
            "full_name": target.get("full_name", ""),
            "email": target.get("email", ""),
            "phone": target.get("phone", ""),
            "role": target.get("role", ROLE_ADMIN),
            "is_active": target.get("is_active", True),
        }
        serializer = AdminUserWriteSerializer(
            data={**existing_data, **request.data},
            partial=True,
            context={"user_id": target["id"], "allow_super_admin_role": True},
        )
        serializer.is_valid(raise_exception=True)
        updates = {
            key: serializer.validated_data[key]
            for key in ("full_name", "email", "phone", "role", "is_active")
            if key in serializer.validated_data
        }
        updated = update_user(target["id"], updates)
        if "password" in request.data and serializer.validated_data.get("password"):
            updated = update_user_password(target["id"], serializer.validated_data["password"])
        return Response(UserSerializer(user_to_public(updated)).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)

    def destroy(self, request, pk=None):
        target = get_user_by_id(pk)
        if not target:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if target.get("role") == ROLE_SUPER_ADMIN:
            return Response({"detail": "Super admin accounts cannot be deleted from this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        delete_user(target["id"])
        return Response(status=status.HTTP_204_NO_CONTENT)
