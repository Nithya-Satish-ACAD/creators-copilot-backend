import json
import threading
import http.server
import urllib.parse
import webbrowser
import requests
import time
import socketserver
import jwt
import sys

# Load credentials from client_secret.json
try:
    with open("client_secret.json", "r") as f:
        secrets = json.load(f)["web"]
except FileNotFoundError:
    print("Error: 'client_secret.json' not found. Download it from Google Cloud Console (APIs & Services > Credentials > OAuth 2.0 Client ID).")
    sys.exit(1)
except KeyError:
    print("Error: Invalid 'client_secret.json' format. Ensure it contains 'web' credentials.")
    sys.exit(1)

CLIENT_ID = secrets["client_id"]
CLIENT_SECRET = secrets["client_secret"]
REDIRECT_URI = "http://localhost:8000/callback"

# Verify redirect URI in client_secret.json
if REDIRECT_URI not in secrets.get("redirect_uris", []):
    print(f"Error: {REDIRECT_URI} not found in client_secret.json 'redirect_uris'.")
    print("Ensure it is added in Google Cloud Console under OAuth 2.0 Client IDs.")
    print("Steps: Go to https://console.cloud.google.com/ > APIs & Services > Credentials > Edit OAuth 2.0 Client ID > Add 'http://localhost:8000/callback' to Authorized redirect URIs > Save > Download JSON.")
    sys.exit(1)

# Debug: Print client_id and redirect_uris for verification
print(f"Using client_id: {CLIENT_ID}")
print(f"Registered redirect_uris in client_secret.json: {secrets.get('redirect_uris', [])}")

authorization_code = None
server_shutdown = False

# Local HTTP server to handle OAuth callback
class OAuthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global authorization_code, server_shutdown
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/callback":
            params = urllib.parse.parse_qs(parsed.query)
            code = params.get("code", [None])[0]
            error = params.get("error", [None])[0]
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            if code:
                authorization_code = code
                self.wfile.write(b"<html><body><h1>Login Successful! You can close this window.</h1><script>setTimeout(() => window.close(), 2000);</script></body></html>")
                server_shutdown = True
            elif error:
                error_message = error
                if error == "redirect_uri_mismatch":
                    error_message += f". The redirect_uri '{REDIRECT_URI}' does not match any authorized URI in Google Cloud Console. Add it under APIs & Services > Credentials > OAuth 2.0 Client ID > Authorized redirect URIs."
                self.wfile.write(f"<html><body><h1>Login Failed</h1><p>Error: {error_message}</p></body></html>".encode())
                server_shutdown = True
            else:
                self.wfile.write(b"<html><body><h1>Login Failed</h1><p>No authorization code received.</p></body></html>")
                server_shutdown = True
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8000):
    global server_shutdown
    try:
        server = socketserver.TCPServer(('localhost', port), OAuthHandler)
        print(f"Started local server on http://localhost:{port}")
        while not server_shutdown:
            server.handle_request()
        server.server_close()
        print("Local server shut down.")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {port} is in use. Trying port 8080 instead.")
            if port != 8080:
                global REDIRECT_URI
                REDIRECT_URI = "http://localhost:8080/callback"
                run_server(port=8080)
            else:
                print("Error: Port 8080 also in use. Free up port 8000 or 8080, or modify the code to use a different port and update Google Cloud Console.")
                sys.exit(1)
        else:
            print(f"Server error: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"Unexpected server error: {e}")
        sys.exit(1)

# Start server in background
server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Build Google OAuth login URL
auth_url = (
    f"https://accounts.google.com/o/oauth2/v2/auth?"
    f"client_id={CLIENT_ID}&"
    f"redirect_uri={urllib.parse.quote(REDIRECT_URI)}&"
    f"response_type=code&"
    f"scope=openid%20email%20profile&"
    f"access_type=offline&"
    f"prompt=select_account"
)

print("Opening browser for Google login...")
print(f"Authorization URL: {auth_url}")
webbrowser.open(auth_url)

# Wait for authorization code
print("Waiting for Google login to complete...")
timeout = 120
start_time = time.time()
while not authorization_code and not server_shutdown and time.time() - start_time < timeout:
    time.sleep(0.5)

if not authorization_code and server_shutdown:
    print("Error: Login failed or was canceled. Check browser for details.")
    sys.exit(1)
elif not authorization_code:
    print("Error: Timed out waiting for authorization code. Ensure you completed the login in the browser.")
    sys.exit(1)

print("Received authorization code.")

# Exchange code for tokens
token_url = "https://oauth2.googleapis.com/token"
data = {
    "code": authorization_code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code"
}

try:
    response = requests.post(token_url, data=data, timeout=10)
    print("Token request response:", response.text)
    response.raise_for_status()
    tokens = response.json()
except requests.RequestException as e:
    print(f"Error exchanging code for tokens: {e}")
    print("Possible causes: Invalid client_id, client_secret, or redirect_uri mismatch.")
    sys.exit(1)

# Decode and display user info
if "id_token" in tokens:
    print("Received ID Token.")
    try:
        decoded_token = jwt.decode(tokens["id_token"], options={"verify_signature": False})
        print("User Info:")
        print(f"  Email: {decoded_token.get('email', 'N/A')}")
        print(f"  Name: {decoded_token.get('name', 'N/A')}")
        print(f"  User ID: {decoded_token.get('sub', 'N/A')}")
    except Exception as e:
        print(f"Error decoding ID token: {e}")
else:
    print(f"Failed to get ID token: {tokens.get('error_description', 'Unknown error')}")