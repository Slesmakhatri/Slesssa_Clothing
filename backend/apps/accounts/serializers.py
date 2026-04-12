from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.vendors.repository import find_vendor_application_by_email

from .repository import ROLE_ADMIN, ROLE_CHOICES, ROLE_CUSTOMER, ROLE_SUPER_ADMIN, ROLE_VENDOR, create_user, email_exists, get_user_by_email, get_user_by_id, phone_exists, user_to_public, verify_password


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True, allow_blank=True)
    first_name = serializers.CharField(read_only=True, allow_blank=True)
    last_name = serializers.CharField(read_only=True, allow_blank=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)
    role = serializers.CharField(read_only=True)
    avatar = serializers.CharField(read_only=True, allow_blank=True)
    auth_provider = serializers.CharField(read_only=True)
    google_account_id = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)
    account_type = serializers.ChoiceField(choices=ROLE_CHOICES)

    def validate_email(self, value):
        normalized = value.lower()
        if email_exists(normalized):
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate_phone(self, value):
        digits = "".join(char for char in value if char.isdigit())
        if len(digits) < 7:
            raise serializers.ValidationError("Enter a valid phone number.")
        if phone_exists(value):
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def validate(self, attrs):
        confirm_password = attrs.pop("confirm_password", None)
        if confirm_password is not None and attrs["password"] != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs.get("account_type") in {ROLE_ADMIN, ROLE_SUPER_ADMIN}:
            raise serializers.ValidationError({"account_type": "Admin accounts can only be created by a super admin."})
        if attrs.get("account_type") == ROLE_VENDOR and not find_vendor_application_by_email(attrs.get("email"), approved_only=True):
            raise serializers.ValidationError({"account_type": "Vendor signup is available only after admin approves your vendor application."})
        return attrs

    def create(self, validated_data):
        user = create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            phone=validated_data["phone"],
            password=validated_data["password"],
            role=validated_data["account_type"],
        )
        return user_to_public(user)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password")
        if not email:
            raise serializers.ValidationError({"email": "Email is required."})
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})

        user = get_user_by_email(email)
        if not user:
            raise serializers.ValidationError({"email": "No account found with this email address."})
        if not verify_password(user, password):
            raise serializers.ValidationError({"password": "Incorrect password."})
        if not user.get("is_active", True):
            raise serializers.ValidationError({"detail": "This account is inactive. Please contact support."})

        self.user = user
        return issue_tokens_for_user(user)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=False, allow_blank=True)
    credential = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    account_type = serializers.ChoiceField(choices=ROLE_CHOICES, required=False, default=ROLE_CUSTOMER)

    def validate(self, attrs):
        id_token_value = (attrs.get("id_token") or "").strip()
        credential = (attrs.get("credential") or "").strip()
        code = (attrs.get("code") or "").strip()
        normalized_id_token = id_token_value or credential
        if attrs.get("account_type") in {ROLE_ADMIN, ROLE_SUPER_ADMIN}:
            raise serializers.ValidationError({"account_type": "Admin accounts can only be created by a super admin."})
        if not normalized_id_token and not code:
            raise serializers.ValidationError("Google ID token or authorization code is required.")
        attrs["id_token"] = normalized_id_token
        attrs["credential"] = credential
        attrs["code"] = code
        return attrs


def issue_tokens_for_user(user):
    refresh = RefreshToken()
    refresh["user_id"] = user["id"]
    refresh["role"] = user.get("role")
    refresh["email"] = user.get("email")
    access = refresh.access_token
    access["user_id"] = user["id"]
    access["role"] = user.get("role")
    access["email"] = user.get("email")
    return {
        "refresh": str(refresh),
        "access": str(access),
        "user": UserSerializer(user_to_public(user)).data,
    }


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False)
    avatar = serializers.CharField(required=False, allow_blank=True)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = get_user_by_id(self.context["user_id"])
        if not user or not verify_password(user, attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Choose a different password."})
        return attrs


class AdminUserWriteSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    role = serializers.ChoiceField(choices=[ROLE_ADMIN, ROLE_SUPER_ADMIN], default=ROLE_ADMIN)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        user_id = self.context.get("user_id")
        if email_exists(normalized, exclude_user_id=user_id):
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate_role(self, value):
        if value == ROLE_SUPER_ADMIN and not self.context.get("allow_super_admin_role"):
            raise serializers.ValidationError("Only a super admin can grant the super admin role.")
        return value

    def validate(self, attrs):
        if not self.context.get("user_id") and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating an admin user."})
        return attrs
