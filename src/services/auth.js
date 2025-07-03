// This is a simple in-memory auth service for demo purposes
export function login(username, password) {
  // backend integration: replace with real API call in production
  if (username === "user" && password === "password") {
    localStorage.setItem("user", JSON.stringify({ username }));
    return true;
  }
  return false;
}

export function register(username, password) {
  // backend integration: replace with real API call in production
  // Replace with real API call in production
  // For demo, always succeed
  return true;
}

export function logout() {
  // backend integration: call backend to logout if needed
  localStorage.removeItem("user");
}

export function getCurrentUser() {
  // backend integration: fetch current user from backend if needed
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}
