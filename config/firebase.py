import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

firebase_config = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "databaseURL": os.getenv("databaseURL")
}

credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
if not credentials_path or not os.path.isfile(credentials_path):
    logger.error(f"Invalid or missing FIREBASE_CREDENTIALS_PATH: {credentials_path}")
    raise ValueError(f"Invalid or missing FIREBASE_CREDENTIALS_PATH: {credentials_path}")

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'creator-co-pilot.appspot.com'
        })
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
        raise ValueError(f"Failed to initialize Firebase Admin SDK: {str(e)}")

db = firestore.client()

# Initialize storage bucket with error handling
try:
    storage_bucket = storage.bucket('creator-co-pilot.appspot.com')
    # Test if bucket exists by trying to list files
    list(storage_bucket.list_blobs(max_results=1))
    logger.info("Firebase Storage bucket initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize storage bucket 'creator-co-pilot.appspot.com': {str(e)}")
    logger.info("Trying default bucket name...")
    try:
        # Try the default bucket name pattern
        storage_bucket = storage.bucket()
        list(storage_bucket.list_blobs(max_results=1))
        logger.info("Firebase Storage bucket initialized with default name")
    except Exception as e2:
        logger.error(f"Failed to initialize storage bucket with default name: {str(e2)}")
        logger.warning("Firebase Storage is not available. File uploads will use placeholder URLs.")
        storage_bucket = None