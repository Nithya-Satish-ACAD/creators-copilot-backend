import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResources } from "../context/ResourcesContext";
import { useToast } from "../context/ToastContext";
import AddReferencesModal from "../components/AddReferencesModal";
import FileUpload from "../components/FileUpload";
import { courseOutcomesService } from "../services/courseOutcomes";
import { getCourse } from "../services/course";
import { uploadCourseResources } from "../services/resources";
import { createPDFBlob, createPDFBlobForUpload } from "../utils/pdfGenerator";
import { FiDownload, FiSave } from "react-icons/fi";

const btnStyle = {
  padding: "7px 14px",
  borderRadius: 5,
  border: "1px solid #bbb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

export default function CourseOutcomes() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { loadResources, getResources } = useResources();
  const { showSuccess, showError } = useToast();
  
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedRefOption, setSelectedRefOption] = useState(0);
  const [addRefStep, setAddRefStep] = useState(0);
  const [sessionUploadedCount, setSessionUploadedCount] = useState(0);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [savingMessageId, setSavingMessageId] = useState(null);
  
  // Setup form state - removed user input requirements
  const [courseName, setCourseName] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Load resources and course details when courseId is available
  useEffect(() => {
    const loadCourseAndResources = async () => {
      if (courseId) {
        try {
          // Load course details to get the name
          const courseData = await getCourse(courseId);
          setCourseName(courseData.name || "Unknown Course");
          
          // Load resources
          await loadResources(courseId);
        } catch (error) {
          console.error("Error loading course or resources:", error);
          setCourseName("Unknown Course");
        }
      }
    };
    
    loadCourseAndResources();
  }, [courseId, loadResources]);

  const handleAddContentModalClose = () => {
    setShowAddContentModal(false);
  };

  const handleAddContentModalAdd = () => {
    setShowAddContentModal(false);
    // backend integration: add uploaded/selected references to backend knowledge base
    // You can handle the selected option here
  };

  // Initialize thread when component mounts (like brainstorm)
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
        
        // Get checked-in resources from the context
        const resources = getResources(courseId);
        const checkedInFiles = resources
          .filter(resource => resource.status === 'checked_in')
          .map(resource => resource.fileName);
        
        // Always set askClarifyingQuestions to true
        const askClarifyingQuestions = true;
        
        // Start the session with the auto-generated setup data (this creates the thread and shows the default message)
        console.log("Starting course outcomes session...");
        const response = await courseOutcomesService.startSession(
          courseId, 
          courseName, 
          askClarifyingQuestions, 
          checkedInFiles
        );
        
        const newThreadId = response.thread_id;
        setThreadId(newThreadId);
        console.log("Created new course outcomes thread:", newThreadId);
        
        // Load the messages from the session (this will show the default welcome message)
        const messagesResponse = await courseOutcomesService.getMessages(courseId, newThreadId);
        setMessages(messagesResponse.messages || []);
        console.log("Loaded course outcomes messages:", messagesResponse.messages?.length || 0);
        
        setSetupComplete(true);
        
      } catch (error) {
        console.error("Error initializing course outcomes:", error);
        setMessages([{
          role: "assistant",
          content: "Error: Could not initialize course outcomes. Please check your connection and try again.",
          timestamp: new Date().toISOString(),
          error: true
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize if we have both courseId and courseName
    if (courseId && courseName) {
      initializeThread();
    }
  }, [courseId, courseName, getResources]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !threadId || !courseId) {
      console.log("Cannot send message:", { inputMessage: !!inputMessage.trim(), threadId, courseId });
      return;
    }

    console.log("Sending course outcomes message:", { courseId, threadId, message: inputMessage });

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await courseOutcomesService.sendMessage(courseId, threadId, inputMessage);
      console.log("Course outcomes response received:", response);

      const assistantMessage = {
        role: "assistant",
        content: response.message,
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
    // Get course name for better PDF naming
    const courseName = localStorage.getItem("currentCourseTitle") || "Unknown Course";
    const assetType = "Course Outcomes";
    
    // Create a better filename with course name and asset type
    const timestampStr = new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${assetType.toLowerCase().replace(/\s+/g, '-')}-${courseName.toLowerCase().replace(/\s+/g, '-')}-${timestampStr}.pdf`;
    
    // Create PDF with course name and asset type
    createPDFBlob(content, filename, `${assetType} Response`, courseName, assetType);
  };

  // Handle saving chat response to resources
  const handleSaveToResources = async (content, timestamp, messageIndex) => {
    setSavingMessageId(messageIndex);
    try {
      // Get course name for better PDF naming
      const courseName = localStorage.getItem("currentCourseTitle") || "Unknown Course";
      const assetType = "Course Outcomes";
      
      // Create a better filename with course name and asset type
      const timestampStr = new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${assetType.toLowerCase().replace(/\s+/g, '-')}-${courseName.toLowerCase().replace(/\s+/g, '-')}-${timestampStr}.pdf`;
      
      // Create PDF with course name and asset type
      const blob = createPDFBlobForUpload(content, filename, `${assetType} Response`, courseName, assetType);
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      // Upload to course-level resources so they appear in the main resources list
      await uploadCourseResources(courseId, [file]);
      // DO NOT call loadResources or update the resources context here!
      // The new resource will only show up after a manual refresh or navigation.
      showSuccess("Course outcomes response saved to resources successfully!");
    } catch (error) {
      console.error("Error saving to resources:", error);
      showError("Error saving to resources: " + error.message);
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
          <span style={{ fontSize: 22 }}>✨</span> Course Outcomes Generator
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
          <div style={{ fontWeight: 600, fontSize: 18, padding: "18px 18px 8px 18px", borderBottom: "1px solid #e0e0e0" }}>Course Outcomes</div>
          <div style={{ flex: 1, padding: 18, overflowY: "auto" }}>
            {!isLoading && messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Course Outcomes Generator Ready</div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>The system is ready to help you generate course outcomes!</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Type 'proceed' or ask any questions to get started</div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  Quick actions: "proceed", "show info", "add context"
                </div>
              </div>
            )}
            {isLoading && !messages.length && (
              <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}></div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Setting up Course Outcomes Generator</div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>Gathering course information and resources...</div>
                <div style={{ fontSize: 12, color: "#888" }}>This will only take a moment</div>
              </div>
            )}
            {messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map((message, index) => (
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
                    border: message.error ? "1px solid #ff6b6b" : "none",
                    whiteSpace: "pre-wrap"
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
              placeholder={setupComplete ? (messages.length === 0 ? "Type 'proceed' to start, 'show info' to see details, or ask questions..." : "Type your response, ask questions, or say 'proceed' to generate outcomes...") : "Please complete the setup form first..."}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "10px 14px", borderRadius: 8, background: "#f5f7fa" }}
              disabled={isLoading || !setupComplete}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || !setupComplete}
              style={{ 
                background: isLoading || !inputMessage.trim() || !setupComplete ? "#ccc" : "#1976d2", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "10px 18px", 
                fontWeight: 600, 
                fontSize: 16, 
                cursor: isLoading || !inputMessage.trim() || !setupComplete ? "not-allowed" : "pointer" 
              }}
              title={!setupComplete ? "Please wait for setup to complete" : !inputMessage.trim() ? "Type a message to continue" : "Send message"}
            >
              {isLoading ? "..." : "➤"}
            </button>
          </div>
        </div>
        {/* Sidebar */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 18 }}>
            {/* Refresh Resources Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>Resources</div>
              <button
                onClick={() => loadResources(courseId)}
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
                title="Refresh Resources"
              >
                <span style={{ fontSize: "14px" }}>↻</span>
                Refresh
              </button>
            </div>
            
            <FileUpload
              courseId={courseId}
              threadId={threadId}
              title="Course Outcomes Resources"
              onUploadComplete={(response) => {
                console.log("Course outcomes resources uploaded:", response);
                // Refresh the setup to include new resources
                if (setupComplete) {
                  // Re-initialize the thread to pick up new resources
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
                      
                      // Get checked-in resources from the context
                      const resources = getResources(courseId);
                      const checkedInFiles = resources
                        .filter(resource => resource.status === 'checked_in')
                        .map(resource => resource.fileName);
                      
                      // Always set askClarifyingQuestions to true
                      const askClarifyingQuestions = true;
                      
                      // Start the session with the auto-generated setup data (this creates the thread and shows the default message)
                      console.log("Starting course outcomes session...");
                      const response = await courseOutcomesService.startSession(
                        courseId, 
                        courseName, 
                        askClarifyingQuestions, 
                        checkedInFiles
                      );
                      
                      const newThreadId = response.thread_id;
                      setThreadId(newThreadId);
                      console.log("Created new course outcomes thread:", newThreadId);
                      
                      // Load the messages from the session (this will show the default welcome message)
                      const messagesResponse = await courseOutcomesService.getMessages(courseId, newThreadId);
                      setMessages(messagesResponse.messages || []);
                      console.log("Loaded course outcomes messages:", messagesResponse.messages?.length || 0);
                      
                      setSetupComplete(true);
                      
                    } catch (error) {
                      console.error("Error initializing course outcomes:", error);
                      setMessages([{
                        role: "assistant",
                        content: "Error: Could not initialize course outcomes. Please check your connection and try again.",
                        timestamp: new Date().toISOString(),
                        error: true
                      }]);
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  initializeThread();
                }
              }}
              onResourcesLoaded={(resources) => {
                console.log("Course outcomes resources loaded:", resources);
              }}
              showCheckoutControls={true}
            />
          </div>
        </div>
      </div>

      {/* Remove the entire Setup Modal section */}
      
      <AddReferencesModal open={showAddContentModal} onClose={handleAddContentModalClose}>
        {addRefStep === 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Add References</div>
            <div style={{ color: "#444", fontSize: 15, marginBottom: 18 }}>To start building your course outcomes, select any of the following</div>
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
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={{ ...btnStyle, background: "#f5f5f5" }} onClick={handleAddContentModalClose}>Cancel</button>
              <button style={{ ...btnStyle, background: "#1976d2", color: "#fff", border: "none" }} onClick={handleAddContentModalAdd}>Continue</button>
            </div>
          </>
        )}
        {addRefStep === 1 && (
          <UploadReferencesStep
            onBack={() => setAddRefStep(0)}
            onCancel={handleAddContentModalClose}
            setSessionUploadedCount={setSessionUploadedCount}
          />
        )}
      </AddReferencesModal>
    </div>
  );
}

function UploadReferencesStep({ onBack, onCancel, setSessionUploadedCount }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const uploadPromises = Array.from(files).map((file, index) =>
        uploadFileWithProgress(file, index)
      );

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);

      setSessionUploadedCount(prev => prev + successfulUploads.length);

      console.log(`Successfully uploaded ${successfulUploads.length} files`);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const uploadFileWithProgress = async (file, uploadIndex) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(prev => ({ ...prev, [uploadIndex]: 0 }));

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadProgress(prev => ({ ...prev, [uploadIndex]: 100 }));

      return {
        success: true,
        file: file.name,
        fileId: result.file_id,
        ...result
      };
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      setUploadProgress(prev => ({ ...prev, [uploadIndex]: -1 }));

      return {
        success: false,
        file: file.name,
        error: error.message
      };
    }
  };

  const handleCancel = () => {
    setUploadProgress({});
    setUploading(false);
    onCancel();
  };

  const handleBack = () => {
    setUploadProgress({});
    setUploading(false);
    onBack();
  };

  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Upload References</div>
      <div style={{ color: "#444", fontSize: 15, marginBottom: 18 }}>Upload your reference materials to enhance course outcomes generation</div>
      
      <div style={{ border: "2px dashed #ddd", borderRadius: 12, padding: "40px 20px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Drop files here or click to browse</div>
        <div style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>Supports PDF, DOC, TXT, and other text-based formats</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.rtf"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: uploading ? "#ccc" : "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: 16,
            cursor: uploading ? "not-allowed" : "pointer"
          }}
        >
          {uploading ? "Uploading..." : "Choose Files"}
        </button>
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Upload Progress:</div>
          {Object.entries(uploadProgress).map(([index, progress]) => (
            <div key={index} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>File {parseInt(index) + 1}</span>
                <span style={{ fontSize: 14, color: progress === 100 ? "#4caf50" : progress === -1 ? "#f44336" : "#666" }}>
                  {progress === 100 ? "Complete" : progress === -1 ? "Failed" : `${progress}%`}
                </span>
              </div>
              <div style={{ width: "100%", height: 4, background: "#f0f0f0", borderRadius: 2 }}>
                <div
                  style={{
                    width: `${Math.max(0, progress)}%`,
                    height: "100%",
                    background: progress === 100 ? "#4caf50" : progress === -1 ? "#f44336" : "#1976d2",
                    borderRadius: 2,
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button style={{ ...btnStyle, background: "#f5f5f5" }} onClick={handleBack}>Back</button>
        <button style={{ ...btnStyle, background: "#f5f5f5" }} onClick={handleCancel}>Cancel</button>
        <button style={{ ...btnStyle, background: "#1976d2", color: "#fff", border: "none" }} onClick={onCancel}>Done</button>
      </div>
    </>
  );
} 