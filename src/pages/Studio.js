import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFilesContext } from "../context/FilesContext";
import { useResources } from "../context/ResourcesContext";
import AddReferencesModal from "../components/AddReferencesModal";
import FileUpload from "../components/FileUpload";
import { 
  createBrainstormThread, 
  getBrainstormMessages, 
  sendBrainstormMessage,
  createChatThread,
  getChatMessages,
  sendChatMessage
} from "../services/brainstorm";
import { getCourse } from "../services/course";
import { uploadAssetResources, uploadCourseResources } from "../services/resources";
import { createPDFBlob, createPDFBlobForUpload } from "../utils/pdfGenerator";
import { FiDownload, FiSave } from "react-icons/fi";

const optionTitles = {
  "course-outcomes": "Course Outcomes",
  "modules-topics": "Modules & Topics",
  "lesson-plans": "Lesson Plans",
  "concept-map": "Concept Map",
  "course-notes": "Course Notes"
};

const btnStyle = {
  padding: "7px 14px",
  borderRadius: 5,
  border: "1px solid #bbb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

export default function Studio() {
  const { option } = useParams();
  const navigate = useNavigate();
  const { addFiles } = useFilesContext();
  const { loadResources } = useResources();
  const title = optionTitles[option] || option;
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedRefOption, setSelectedRefOption] = useState(0);
  const [addRefStep, setAddRefStep] = useState(0);
  const [sessionUploadedCount, setSessionUploadedCount] = useState(0);
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState([]);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [courseId] = useState(localStorage.getItem("currentCourseId"));
  const [savingMessageId, setSavingMessageId] = useState(null);
  
  // Load resources when courseId is available
  useEffect(() => {
    if (courseId) {
      loadResources(courseId);
    }
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddContentModalClose = () => {
    setShowAddContentModal(false);
  };

  const handleAddContentModalAdd = () => {
    setShowAddContentModal(false);
    // backend integration: add uploaded/selected references to backend knowledge base
    // You can handle the selected option here
  };

  // Initialize thread when component mounts
  useEffect(() => {
    const initializeThread = async () => {
      if (!courseId) {
        console.error("No course ID found");
        setMessages([{
          role: "assistant",
          content: "Error: No course ID found. Please return to the dashboard and select a course.",
          timestamp: new Date().toISOString(),
          error: true
        }]);
        return;
      }

      try {
        setIsLoading(true);
        let newThreadId;
        
        if (option === "brainstorm") {
          // For brainstorm, we always create a new thread when the page loads
          // This ensures a fresh brainstorming session each time
          const response = await createBrainstormThread(courseId);
          newThreadId = response.thread_id;
          console.log("Created new brainstorm thread:", newThreadId);
        } else {
          // For general chat, check if there's an existing thread
          try {
            const courseData = await getCourse(courseId);
            if (courseData.free_chat_thread_id) {
              newThreadId = courseData.free_chat_thread_id;
              console.log("Using existing chat thread:", newThreadId);
            } else {
              const response = await createChatThread(courseId);
              newThreadId = response.thread_id;
              console.log("Created new chat thread:", newThreadId);
            }
          } catch (error) {
            console.warn("Could not get course data, creating new thread:", error);
            const response = await createChatThread(courseId);
            newThreadId = response.thread_id;
            console.log("Created new chat thread:", newThreadId);
          }
        }
        
        setThreadId(newThreadId);
        
        // Load existing messages (should be empty for new threads)
        try {
          if (option === "brainstorm") {
            const messagesResponse = await getBrainstormMessages(courseId, newThreadId);
            setMessages(messagesResponse.messages || []);
            console.log("Loaded brainstorm messages:", messagesResponse.messages?.length || 0);
          } else {
            const messagesResponse = await getChatMessages(courseId, newThreadId);
            setMessages(messagesResponse.messages || []);
            console.log("Loaded chat messages:", messagesResponse.messages?.length || 0);
          }
        } catch (messageError) {
          console.warn("Could not load existing messages:", messageError);
          // Continue without loading messages
        }
      } catch (error) {
        console.error("Error initializing thread:", error);
        setMessages([{
          role: "assistant",
          content: "Error: Could not initialize chat. Please check your connection and try again.",
          timestamp: new Date().toISOString(),
          error: true
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeThread();
  }, [courseId, option]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !threadId || !courseId) {
      console.log("Cannot send message:", { inputMessage: !!inputMessage.trim(), threadId, courseId });
      return;
    }

    console.log("Sending message:", { courseId, threadId, option, message: inputMessage });

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let response;
      if (option === "brainstorm") {
        console.log("Sending brainstorm message...");
        response = await sendBrainstormMessage(courseId, threadId, inputMessage);
        console.log("Brainstorm response received:", response);
      } else {
        console.log("Sending chat message...");
        response = await sendChatMessage(courseId, threadId, inputMessage);
        console.log("Chat response received:", response);
      }

      const assistantMessage = {
        role: "assistant",
        content: response.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle download of chat response as PDF
  const handleDownload = (content, timestamp) => {
    const filename = `chat-response-${new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    createPDFBlob(content, filename);
  };

  // Handle saving chat response to resources
  const handleSaveToResources = async (content, timestamp, messageIndex) => {
    setSavingMessageId(messageIndex);
    try {
      // Create a PDF blob using jsPDF
      const filename = `chat-response-${new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      const blob = createPDFBlobForUpload(content, filename, 'Chat Response');
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Upload to resources based on the current option
      if (option === "brainstorm" && threadId) {
        await uploadAssetResources(courseId, threadId, [file]);
      } else {
        await uploadCourseResources(courseId, [file]);
      }

      // Reload resources to show the new file
      if (courseId) {
        loadResources(courseId);
      }

      // Show success message (you could add a toast notification here)
      console.log("Chat response saved to resources successfully!");
    } catch (error) {
      console.error("Error saving to resources:", error);
      // Show error message (you could add a toast notification here)
    } finally {
      setSavingMessageId(null);
    }
  };

  const refOptions = [
    {
      label: "Upload references",
      icon: "📤",
      desc: "",
    },
    {
      label: "Select from an existing course",
      icon: "📚",
      desc: "",
    },
    {
      label: "Discover references",
      icon: "🔍",
      desc: "",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#cbe0f7", padding: 0 }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px 0 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>✨</span> AI Studio
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, background: "#fff", borderRadius: 6, padding: "6px 12px" }}>
            <input type="checkbox" style={{ accentColor: "#222" }} /> Use reference material only
          </label>
          <button style={btnStyle} onClick={() => setShowAddContentModal(true)}>Add Content</button>
          <button style={btnStyle}>Settings</button>
          <button style={btnStyle} onClick={() => navigate(-1)}>Close</button>
          <button style={{ ...btnStyle, background: "#222", color: "#fff", border: "none" }}>Save</button>
        </div>
      </div>
      {/* Main Content */}
      <div style={{ display: "flex", maxWidth: 1200, margin: "24px auto 0 auto", gap: 18, alignItems: "flex-start" }}>
        {/* Chat Area */}
        <div style={{ flex: 3, background: "#fff", borderRadius: 14, minHeight: 520, display: "flex", flexDirection: "column", boxShadow: "0 1px 4px #0001" }}>
          <div style={{ fontWeight: 600, fontSize: 18, padding: "18px 18px 8px 18px", borderBottom: "1px solid #e0e0e0" }}>{title}</div>
          <div style={{ flex: 1, padding: 18, overflowY: "auto" }}>
            {isLoading && !messages.length && (
              <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                Initializing chat...
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: message.role === "user" ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: message.role === "user" ? "#1976d2" : "#f5f5f5",
                    color: message.role === "user" ? "#fff" : "#333",
                    fontSize: "14px",
                    lineHeight: "1.4",
                    wordWrap: "break-word",
                    border: message.error ? "1px solid #ff6b6b" : "none"
                  }}
                >
                  {message.content}
                </div>
                
                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && !message.error && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "8px",
                      marginLeft: "8px"
                    }}
                  >
                    <button
                      onClick={() => handleDownload(message.content, message.timestamp)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        background: "#fff",
                        color: "#666",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#f0f0f0";
                        e.target.style.borderColor = "#bbb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "#fff";
                        e.target.style.borderColor = "#ddd";
                      }}
                      title="Download as PDF"
                    >
                      <FiDownload size={12} />
                      Download
                    </button>
                    <button
                      onClick={() => handleSaveToResources(message.content, message.timestamp, index)}
                      disabled={savingMessageId === index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        background: savingMessageId === index ? "#f0f0f0" : "#fff",
                        color: savingMessageId === index ? "#999" : "#666",
                        fontSize: "12px",
                        cursor: savingMessageId === index ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (savingMessageId !== index) {
                          e.target.style.background = "#f0f0f0";
                          e.target.style.borderColor = "#bbb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (savingMessageId !== index) {
                          e.target.style.background = "#fff";
                          e.target.style.borderColor = "#ddd";
                        }
                      }}
                      title="Save to Resources"
                    >
                      {savingMessageId === index ? (
                        <div style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid #f3f3f3", borderTop: "2px solid #1976d2", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                      ) : (
                        <FiSave size={12} />
                      )}
                      {savingMessageId === index ? "Saving..." : "Save to Resources"}
                    </button>
                  </div>
                )}
                
                <div
                  style={{
                    fontSize: "11px",
                    color: "#999",
                    marginTop: "4px",
                    marginLeft: message.role === "user" ? "0" : "8px",
                    marginRight: message.role === "user" ? "8px" : "0"
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoading && messages.length > 0 && (
              <div style={{ textAlign: "center", color: "#666", padding: "10px" }}>
                <div style={{ display: "inline-block", width: "20px", height: "20px", border: "2px solid #f3f3f3", borderTop: "2px solid #1976d2", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <span style={{ marginLeft: "8px" }}>Thinking...</span>
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid #e0e0e0", padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={option === "brainstorm" ? "Start brainstorming ideas for your course..." : "Type a prompt to generate a lesson, quiz, or outcome..."}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "10px 14px", borderRadius: 8, background: "#f5f7fa" }}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              style={{ 
                background: isLoading || !inputMessage.trim() ? "#ccc" : "#1976d2", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "10px 18px", 
                fontWeight: 600, 
                fontSize: 16, 
                cursor: isLoading || !inputMessage.trim() ? "not-allowed" : "pointer" 
              }}
            >
              {isLoading ? "..." : "➤"}
            </button>
          </div>
        </div>
        {/* Sidebar */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 18 }}>
            {option === "brainstorm" ? (
              // Asset-level file upload for brainstorm
              <FileUpload
                courseId={courseId}
                threadId={threadId}
                title="Brainstorm Resources"
                onUploadComplete={(response) => {
                  console.log("Brainstorm resources uploaded:", response);
                }}
                onResourcesLoaded={(resources) => {
                  console.log("Brainstorm resources loaded:", resources);
                }}
                showCheckoutControls={true}
              />
            ) : (
              // Course-level file upload for other options
              <FileUpload
                courseId={courseId}
                title="Course Resources"
                onUploadComplete={(response) => {
                  console.log("Course resources uploaded:", response);
                }}
                onResourcesLoaded={(resources) => {
                  console.log("Course resources loaded:", resources);
                }}
                showCheckoutControls={true}
              />
            )}
          </div>
        </div>
      </div>
      <AddReferencesModal open={showAddContentModal} onClose={handleAddContentModalClose}>
        {addRefStep === 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Add References</div>
            <div style={{ color: "#444", fontSize: 15, marginBottom: 18 }}>To start building your course, select any of the following</div>
            <div style={{ display: "flex", gap: 18, marginBottom: 24 }}>
              {refOptions.map((opt, i) => (
                <div
                  key={opt.label}
                  onClick={() => {
                    setSelectedRefOption(i);
                    if (i === 0) setAddRefStep(1);
                  }}
                  style={{
                    position: 'relative',
                    flex: 1,
                    minWidth: 120,
                    background: selectedRefOption === i ? "#f0f7ff" : "#fafbfc",
                    border: selectedRefOption === i ? "2px solid #1976d2" : "1px solid #ddd",
                    borderRadius: 10,
                    padding: "24px 18px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: selectedRefOption === i ? "0 2px 8px #1976d222" : "none"
                  }}
                >
                  <div style={{ fontSize: 28 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 16, textAlign: "center" }}>{opt.label}</div>
                  {i === 0 && sessionUploadedCount > 0 && (
                    <span style={{ position: 'absolute', left: 18, top: 18, background: '#eafaf1', color: '#219653', borderRadius: 6, fontSize: 13, fontWeight: 600, padding: '2px 10px' }}>{sessionUploadedCount} files uploaded</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={handleAddContentModalClose} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={() => {
                  if (selectedRefOption === 0) {
                    // For upload references, close modal and let user continue with uploaded files
                    if (sessionUploadedFiles.length > 0) {
                      addFiles(sessionUploadedFiles);
                      setSessionUploadedFiles([]);
                      setSessionUploadedCount(0);
                    }
                    handleAddContentModalClose();
                  } else if (selectedRefOption === 1) {
                    // For existing course selection, navigate to resources page
                    navigate(`/resources/${courseId}`);
                    handleAddContentModalClose();
                  } else {
                    // For discover references, just close modal for now
                    handleAddContentModalAdd();
                  }
                }}
                style={{ 
                  padding: "8px 18px", 
                  borderRadius: 6, 
                  border: "none", 
                  background: selectedRefOption === 0 && sessionUploadedFiles.length === 0 ? "#ccc" : "#222", 
                  color: "#fff", 
                  fontWeight: 500, 
                  fontSize: 15, 
                  cursor: selectedRefOption === 0 && sessionUploadedFiles.length === 0 ? "not-allowed" : "pointer" 
                }}
                disabled={selectedRefOption === 0 && sessionUploadedFiles.length === 0}
              >
                {selectedRefOption === 0 ? (sessionUploadedFiles.length > 0 ? "Add Files" : "Upload Files First") : "Add"}
              </button>
            </div>
          </>
        )}
        {addRefStep === 1 && (
          <UploadReferencesStep
            onBack={() => setAddRefStep(0)}
            onCancel={handleAddContentModalClose}
            setSessionUploadedFiles={setSessionUploadedFiles}
            setSessionUploadedCount={setSessionUploadedCount}
          />
        )}
      </AddReferencesModal>
    </div>
  );
}



function UploadReferencesStep({ onBack, onCancel, setSessionUploadedFiles, setSessionUploadedCount }) {
  const [uploading, setUploading] = useState([]); // [{file, progress, done}]
  const [uploaded, setUploaded] = useState([]); // [{file}]
  const [error, setError] = useState(null);
  const fileInputRef = useRef();
  const courseId = localStorage.getItem("currentCourseId");

  const handleFiles = async (files) => {
    const filesArr = Array.from(files);
    const newUploads = filesArr.map(file => ({ file, progress: 0, done: false }));
    setUploading(prev => [...prev, ...newUploads]);
    setError(null);
    
    // Upload files one by one with real progress
    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      const uploadIndex = uploading.length + i;
      
      try {
        // Real upload with progress tracking
        await uploadFileWithProgress(file, uploadIndex);
      } catch (err) {
        console.error('Upload failed:', err);
        setError(`Failed to upload ${file.name}: ${err.message}`);
        // Mark as failed
        setUploading(prev => prev.map((u, idx) => 
          idx === uploadIndex ? { ...u, error: true } : u
        ));
      }
    }
  };

  const uploadFileWithProgress = async (file, uploadIndex) => {
    const formData = new FormData();
    formData.append('files', file);
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploading(prev => prev.map((u, idx) => 
            idx === uploadIndex ? { ...u, progress: percentComplete } : u
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            // Mark as completed
            setUploading(prev => prev.map((u, idx) => 
              idx === uploadIndex ? { ...u, progress: 100, done: true } : u
            ));
            
            // Add to uploaded list
            setUploaded(prev => {
              const updated = [...prev, { file, response }];
              setSessionUploadedFiles(updated.map(u => ({ 
                name: u.file.name, 
                type: u.file.type, 
                checked: true 
              })));
              setSessionUploadedCount(updated.length);
              return updated;
            });
            
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

      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/courses/${courseId}/resources`;
      xhr.open('POST', url);
      
      // Add authorization header
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  };

  const handleDrop = e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const handleBrowse = e => {
    handleFiles(e.target.files);
    e.target.value = null;
  };
  const handleDelete = idx => {
    setUploaded(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCancel = () => {
    setUploaded([]);
    setSessionUploadedFiles([]);
    setSessionUploadedCount(0);
    onCancel();
  };
  const handleBack = () => {
    setUploaded([]);
    onBack();
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Upload References</div>
      <div style={{ color: "#444", fontSize: 15, marginBottom: 12 }}>Accepted formats: PDF, DOCX, PPTX, TXT, CSV, Images</div>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border: "2px dashed #1976d2", borderRadius: 10, padding: 32, textAlign: "center", marginBottom: 18, background: "#f5f7fa", cursor: "pointer" }}
        onClick={() => fileInputRef.current.click()}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 500, fontSize: 16 }}>Drag & drop files here or <span style={{ color: "#1976d2", textDecoration: "underline" }}>Browse</span></div>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleBrowse}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,image/*"
        />
      </div>
      {error && (
        <div style={{ color: "#d32f2f", fontSize: 14, marginBottom: 12, padding: "8px 12px", background: "#ffebee", borderRadius: 6 }}>
          {error}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        {uploading.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ color: u.error ? "#d32f2f" : "#333" }}>{u.file.name}</span>
            <div style={{ flex: 1, height: 8, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ 
                width: `${u.progress}%`, 
                height: 8, 
                background: u.error ? "#d32f2f" : (u.done ? "#4caf50" : "#1976d2") 
              }} />
            </div>
            <span style={{ fontSize: 13, color: u.error ? "#d32f2f" : "#666" }}>
              {u.error ? "Failed" : `${Math.round(u.progress)}%`}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        {uploaded.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span>{u.file.name}</span>
            <span style={{ cursor: "pointer", color: "#d32f2f" }} onClick={() => handleDelete(i)}>🗑️</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={handleCancel} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Cancel</button>
        <button onClick={handleBack} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #1976d2", background: "#f0f7ff", color: "#1976d2", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Back to Add References</button>
      </div>
    </div>
  );
} 