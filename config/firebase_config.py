import firebase_admin
from firebase_admin import credentials, firestore, auth
import pyrebase

# Admin SDK (for Firestore)
cred = credentials.Certificate("config\serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Firebase Client SDK (for Google login, email/password)
firebase_config = {
    "apiKey": "AIzaSyC4bv2d5wH0_OilSNMp9ALVHZm3pVmRS-U",
    "authDomain": "creator-co-pilot.firebaseapp.com",
    "databaseURL": "https://creator-co-pilot-default-rtdb.firebaseio.com/",
    "projectId": "creator-co-pilot",
    "storageBucket": "creator-co-pilot.appspot.com",
    "messagingSenderId": "422124366138",
    "appId": "1:422124366138:web:19728ffafa5e14c5d80803",
    "measurementId": "G-Q1WRZMFRWS",
    "databaseURL": "https://creator-co-pilot-default-rtdb.firebaseio.com/"
}

firebase = pyrebase.initialize_app(firebase_config)
client_auth = firebase.auth()
