from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.repository import ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_TAILOR, ROLE_VENDOR, get_user_by_email, update_user_password


class Command(BaseCommand):
    help = "Reset a local role account password by email."

    def add_arguments(self, parser):
        parser.add_argument("email", help="Account email address.")
        parser.add_argument("password", help="New password. Use at least 8 characters.")
        parser.add_argument(
            "--role",
            choices=[ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_VENDOR, ROLE_TAILOR],
            help="Optional role check before resetting the password.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow running when DEBUG is false.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError("Refusing to reset passwords when DEBUG is false. Re-run with --force only if you understand the risk.")

        email = options["email"].strip().lower()
        password = options["password"]
        role = options.get("role")

        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters.")

        user = get_user_by_email(email)
        if not user:
            raise CommandError(f"No user found for {email}.")

        if role and user.get("role") != role:
            raise CommandError(f"{email} is role '{user.get('role')}', not '{role}'.")

        updated = update_user_password(user["id"], password)
        self.stdout.write(
            self.style.SUCCESS(
                f"Password reset for {updated.get('email')} ({updated.get('role')})."
            )
        )
