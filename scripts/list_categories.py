from pymongo import MongoClient
import os

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://127.0.0.1:27017/')
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'slessaa_clothing')

try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DATABASE]
    col = db['categories']
    docs = list(col.find().limit(50))
    print('Connected to', MONGODB_URI, 'DB:', MONGODB_DATABASE)
    print('Categories count:', col.count_documents({}))
    for d in docs:
        # pretty print important fields
        print({k: d.get(k) for k in ['_id','id','name','slug','description','image']})
except Exception as exc:
    print('Error connecting to MongoDB:', exc)
finally:
    try:
        client.close()
    except:
        pass
