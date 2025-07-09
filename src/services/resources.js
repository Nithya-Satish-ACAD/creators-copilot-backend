// Resources service for file uploads and management
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

// Upload files to course (course-level resources)
export async function uploadCourseResources(courseId, files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const res = await fetch(`${API_BASE}/courses/${courseId}/resources`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });
  return handleResponse(res);
}

// Upload files to asset thread (asset-level resources)
export async function uploadAssetResources(courseId, threadId, files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const res = await fetch(`${API_BASE}/courses/${courseId}/resources?thread_id=${threadId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });
  return handleResponse(res);
}

// Get course-level resources
export async function getCourseResources(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Get asset-level resources
export async function getAssetResources(courseId, threadId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources?thread_id=${threadId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Get brainstorm-specific resources
export async function getBrainstormResources(courseId, threadId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/brainstorm/${threadId}/resources`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Check out a resource
export async function checkoutResource(courseId, fileId, userId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources/${fileId}/checkout`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ userId })
  });
  return handleResponse(res);
}

// Check in a resource
export async function checkinResource(courseId, fileId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources/${fileId}/checkin`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Delete a resource
export async function deleteResource(courseId, fileId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Add checked-in files to assistant/thread
export async function addCheckedInFilesToThread(courseId, threadId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/assistant/resources?thread_id=${threadId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Fix incompatible files
export async function fixIncompatibleFiles(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/assistant/fix-files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return handleResponse(res);
}

// Create URL resource
export async function createUrlResource(courseId, title, url, threadId = null) {
  const params = threadId ? `?thread_id=${threadId}` : '';
  const res = await fetch(`${API_BASE}/courses/${courseId}/resources/url${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ title, url })
  });
  return handleResponse(res);
}

// Upload files with progress tracking
export async function uploadFilesWithProgress(courseId, files, threadId = null, onProgress = null) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    const url = threadId 
      ? `${API_BASE}/courses/${courseId}/resources?thread_id=${threadId}`
      : `${API_BASE}/courses/${courseId}/resources`;

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
    xhr.send(formData);
  });
} 