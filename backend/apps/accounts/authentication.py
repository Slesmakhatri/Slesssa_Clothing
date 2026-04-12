from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken

from .repository import get_user_by_id


class MongoUser:
    def __init__(self, document):
        self.document = document
        self.id = document["id"]
        self.pk = document["id"]
        self.username = document.get("username", "")
        self.full_name = document.get("full_name", "")
        self.first_name = document.get("first_name", "")
        self.last_name = document.get("last_name", "")
        self.email = document.get("email", "")
        self.phone = document.get("phone", "")
        self.role = document.get("role", "customer")
        self.avatar = document.get("avatar", "")
        self.auth_provider = document.get("auth_provider", "email")
        self.google_account_id = document.get("google_account_id")
        self.is_active = document.get("is_active", True)
        self.is_staff = document.get("is_staff", False)
        self.date_joined = document.get("date_joined")
        self.password = document.get("password", "")

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class MongoJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token["user_id"]
        except KeyError as exc:
            raise InvalidToken("Token contained no recognizable user identification") from exc

        user = get_user_by_id(user_id)
        if not user:
            raise AuthenticationFailed("User not found", code="user_not_found")
        if not user.get("is_active", True):
            raise AuthenticationFailed("User is inactive", code="user_inactive")
        return MongoUser(user)
