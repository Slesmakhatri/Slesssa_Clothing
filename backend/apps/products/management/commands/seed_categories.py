from django.core.management.base import BaseCommand

from apps.products.repository import list_categories, create_category

DEFAULT_CATEGORIES = [
    "Men",
    "Women",
    "Kids",
    "Accessories",
    "Tailoring",
    "Bridal Wear",
    "Ready-made",
]


class Command(BaseCommand):
    help = "Seed default product categories for development"

    def handle(self, *args, **options):
        existing = list_categories()
        if existing:
            self.stdout.write(self.style.SUCCESS(f"Categories already exist ({len(existing)}). Skipping seeding."))
            for c in existing:
                self.stdout.write(str({k: c.get(k) for k in ['id','name','slug']}))
            return

        self.stdout.write("Seeding default categories...")
        for name in DEFAULT_CATEGORIES:
            try:
                create_category({'name': name, 'description': ''})
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"Failed to create {name}: {exc}"))
        self.stdout.write(self.style.SUCCESS("Seeding complete."))
