const API_BASE_URL = 'http://localhost:8000/api';

export const courseOutcomesService = {
  // Create a new course outcomes thread immediately (like brainstorm)
  createThread: async (courseId) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-outcomes/create-thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create thread');
    }

    return response.json();
  },

  // Start a new course outcomes session with setup form data
  startSession: async (courseId, courseName, clarifyingQuestions, fileNames = []) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-outcomes/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        course_name: courseName,
        ask_clarifying_questions: clarifyingQuestions,
        file_names: fileNames
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to start session');
    }

    return response.json();
  },

  // Send a message in the course outcomes chat
  sendMessage: async (courseId, threadId, message) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-outcomes/${threadId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to send message');
    }

    return response.json();
  },

  // Get messages for a specific thread
  getMessages: async (courseId, threadId) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-outcomes/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get messages');
    }

    return response.json();
  },

  // Get all threads for a course
  getThreads: async (courseId) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-outcomes/threads`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get threads');
    }

    return response.json();
  },
}; 