from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.allowed_roles)


class IsAdminRole(HasRole):
    allowed_roles = ("admin", "super_admin")


class IsSuperAdminRole(HasRole):
    allowed_roles = ("super_admin",)
    message = "Super admin access required."


class IsVendorOrAdmin(HasRole):
    allowed_roles = ("vendor", "admin", "super_admin")


class IsTailorOrAdmin(HasRole):
    allowed_roles = ("tailor", "admin", "super_admin")


class IsTailorVendorOrAdmin(HasRole):
    allowed_roles = ("tailor", "vendor", "admin", "super_admin")
