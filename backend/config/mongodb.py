from pymongo import MongoClient
from pymongo.errors import PyMongoError

from django.conf import settings


def is_mongodb_configured():
    return bool(settings.MONGODB_URI)


def get_mongo_client():
    if not is_mongodb_configured():
        raise RuntimeError("MongoDB is not configured. Set MONGODB_URI in the environment.")

    return MongoClient(
        settings.MONGODB_URI,
        appname=settings.MONGODB_APP_NAME,
        serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    )


def get_mongo_database():
    client = get_mongo_client()
    return client, client[settings.MONGODB_DATABASE]


def ping_mongodb():
    client = None
    try:
        client, database = get_mongo_database()
        result = client.admin.command("ping")
        return {
            "ok": bool(result.get("ok")),
            "database": database.name,
        }
    except PyMongoError as exc:
        raise RuntimeError(f"MongoDB ping failed: {exc}") from exc
    finally:
        if client is not None:
            client.close()
