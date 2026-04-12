import os
from uuid import uuid4

from django.core.files.storage import default_storage


def store_uploaded_file(upload, prefix):
    if not upload:
        return ""

    _, extension = os.path.splitext(upload.name or "")
    extension = extension or ""
    filename = f"{prefix.rstrip('/')}/{uuid4().hex}{extension}"
    path = default_storage.save(filename, upload)
    return default_storage.url(path)
