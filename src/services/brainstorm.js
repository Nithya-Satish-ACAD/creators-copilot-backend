// Brainstorm service for API calls to backend
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';

// Helper to get the Firebase token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Helper to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Create a new brainstorm thread for a course
export async function createBrainstormThread(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/brainstorm/threads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Get brainstorm messages for a specific thread
export async function getBrainstormMessages(courseId, threadId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/brainstorm/${threadId}/messages`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Send a message to a brainstorm thread
export async function sendBrainstormMessage(courseId, threadId, message) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/brainstorm/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ message })
  });
  return handleResponse(res);
}

// Create a new chat thread for a course (general chat)
export async function createChatThread(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/threads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Get chat messages for a specific thread
export async function getChatMessages(courseId, threadId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/threads/${threadId}/messages`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Send a message to a chat thread
export async function sendChatMessage(courseId, threadId, message) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ message })
  });
  return handleResponse(res);
} 