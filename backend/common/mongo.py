from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal

from bson import ObjectId
from django.utils import timezone
from pymongo import ReturnDocument

from config.mongodb import get_mongo_database


def get_db():
    _, database = get_mongo_database()
    return database


def get_collection(name):
    return get_db()[name]


def utcnow():
    return timezone.now()


def next_sequence(name):
    document = get_collection("counters").find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(document["seq"])


def objectid(value):
    if isinstance(value, ObjectId):
        return value
    if value is None:
        return None
    return ObjectId(str(value))


def clean_document(document):
    if document is None:
        return None
    if isinstance(document, list):
        return [clean_document(item) for item in document]
    if isinstance(document, dict):
        payload = {}
        for key, value in document.items():
            if key == "_id":
                continue
            payload[key] = clean_document(value)
        return payload
    if isinstance(document, ObjectId):
        return str(document)
    if isinstance(document, Decimal):
        return float(document)
    if isinstance(document, datetime):
        return document
    if isinstance(document, date):
        return document
    return document


def prepare_document_for_mongo(document):
    if document is None:
        return None
    if isinstance(document, Decimal):
        return float(document)
    if isinstance(document, date) and not isinstance(document, datetime):
        return datetime.combine(document, datetime.min.time())
    if isinstance(document, list):
        return [prepare_document_for_mongo(item) for item in document]
    if isinstance(document, tuple):
        return [prepare_document_for_mongo(item) for item in document]
    if isinstance(document, dict):
        return {key: prepare_document_for_mongo(value) for key, value in document.items()}
    return document


def clone_document(document):
    return clean_document(deepcopy(document))
