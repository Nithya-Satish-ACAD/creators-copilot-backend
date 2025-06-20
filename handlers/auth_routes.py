from flask import Blueprint, request, jsonify
from handlers.firebase_auth import signup_user, login_user, google_login

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    return jsonify(signup_user(email, password, name))

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    return jsonify(login_user(email, password))

@auth_bp.route('/google-login', methods=['GET'])
def run_login_script():
    import subprocess
    subprocess.Popen(['python', '-m', 'utils.google_login_runner'])
    return jsonify({"message": "Started Google login flow. Check browser."})
