import firebase_admin
from firebase_admin import credentials, firestore, auth
import pyrebase
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Admin SDK (for Firestore)
cred = credentials.Certificate("config/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Firebase Client SDK (for Google login, email/password)
firebase_config = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "databaseURL": os.getenv("FIREBASE_DATABASE_URL"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID")
}

firebase = pyrebase.initialize_app(firebase_config)
client_auth = firebase.auth()