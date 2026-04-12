from django.urls import path

from .views import AdminDashboardAPIView, CustomerDashboardAPIView, PlatformSettingsAPIView, SuperAdminAnalyticsAPIView, SuperAdminDashboardAPIView, TailorDashboardAPIView, VendorDashboardAPIView

urlpatterns = [
    path("dashboard/customer/", CustomerDashboardAPIView.as_view(), name="dashboard-customer"),
    path("dashboard/vendor/", VendorDashboardAPIView.as_view(), name="dashboard-vendor"),
    path("dashboard/tailor/", TailorDashboardAPIView.as_view(), name="dashboard-tailor"),
    path("dashboard/admin/", AdminDashboardAPIView.as_view(), name="dashboard-admin"),
    path("dashboard/super-admin/", SuperAdminDashboardAPIView.as_view(), name="dashboard-super-admin"),
    path("dashboard/super-admin/analytics/", SuperAdminAnalyticsAPIView.as_view(), name="dashboard-super-admin-analytics"),
    path("super-admin/", SuperAdminDashboardAPIView.as_view(), name="super-admin-dashboard-compat"),
    path("platform-settings/", PlatformSettingsAPIView.as_view(), name="platform-settings"),
]
