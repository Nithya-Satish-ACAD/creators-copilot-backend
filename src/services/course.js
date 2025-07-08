// Course service for API calls to backend
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';

// Helper to get the Firebase token from localStorage (adjust if you store it differently)
function getToken() {
  return localStorage.getItem('token');
}

export async function fetchCourses() {
  const res = await fetch(`${API_BASE}/courses`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error('Failed to fetch courses');
  return await res.json();
}

export async function createCourse({ name, description, year, level }) {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ name, description, year, level })
  });
  if (!res.ok) throw new Error('Failed to create course');
  return await res.json();
}

export async function deleteCourse(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error('Failed to delete course');
  return await res.json();
}

export async function getCourse(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error('Failed to fetch course');
  return await res.json();
} 