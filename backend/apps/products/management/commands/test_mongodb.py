from django.core.management.base import BaseCommand, CommandError

from config.mongodb import is_mongodb_configured, ping_mongodb


class Command(BaseCommand):
    help = "Verify the MongoDB connection used by the application runtime."

    def handle(self, *args, **options):
        if not is_mongodb_configured():
            raise CommandError("MongoDB is not configured. Set MONGODB_URI before running this command.")

        try:
            result = ping_mongodb()
        except RuntimeError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS("MongoDB connection successful."))
        self.stdout.write(f"Database: {result['database']}")
        self.stdout.write(f"Ping OK: {result['ok']}")
