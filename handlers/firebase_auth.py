from config.firebase_config import db, client_auth
from firebase_admin import auth as admin_auth
import uuid

def signup_user(email, password, name):
    user = client_auth.create_user_with_email_and_password(email, password)
    user_id = str(uuid.uuid4())
    
    # Save user details to Firestore
    db.collection("users").document(user_id).set({
        "email": email,
        "name": name,
        "firebase_uid": user['localId']
    })
    
    return {"message": "Signup successful", "user_id": user_id}

def login_user(email, password):
    try:
        user = client_auth.sign_in_with_email_and_password(email, password)
        return {"message": "Login successful", "token": user['idToken']}
    except:
        return {"message": "Invalid credentials"}, 401

def google_login(id_token):
    try:
        decoded_token = admin_auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        user_record = admin_auth.get_user(uid)
        
        return {"message": "Google login successful", "email": user_record.email}
    except:
        return {"message": "Google login failed"}, 401
