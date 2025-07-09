// This is a simple in-memory auth service for demo purposes
const API_URL = "http://localhost:8000/auth";

export async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    // Store token and user info as needed
    localStorage.setItem("user", JSON.stringify({ username, token: data.token, user_id: data.user_id }));
    localStorage.setItem("token", data.token); // Store token separately for course.js
    return true;
  } catch (error) {
    return false;
  }
}

export async function register(username, password) {
  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password, name: username }),
    });
    if (!response.ok) {
      return false;
    }
    // Optionally, you can parse the response if needed
    return true;
  } catch (error) {
    return false;
  }
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
