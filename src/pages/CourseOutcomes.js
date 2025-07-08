import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFilesContext } from "../context/FilesContext";
import { useResources } from "../context/ResourcesContext";
import AddReferencesModal from "../components/AddReferencesModal";
import FileUpload from "../components/FileUpload";
import { courseOutcomesService } from "../services/courseOutcomes";
import { uploadAssetResources } from "../services/resources";
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
  const { addFiles } = useFilesContext();
  const { loadResources } = useResources();
  
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
  const [savingMessageId, setSavingMessageId] = useState(null);
  
  // Setup form state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [askClarifyingQuestions, setAskClarifyingQuestions] = useState(false);
  const [fileNames, setFileNames] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  
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
        
        // Always create a new thread for course outcomes (like brainstorm)
        console.log("Creating new course outcomes thread...");
        const response = await courseOutcomesService.createThread(courseId);
        const newThreadId = response.thread_id;
        setThreadId(newThreadId);
        console.log("Created new course outcomes thread:", newThreadId);
        
        // Load the welcome message
        const messagesResponse = await courseOutcomesService.getMessages(courseId, newThreadId);
        setMessages(messagesResponse.messages || []);
        console.log("Loaded course outcomes messages:", messagesResponse.messages?.length || 0);
        
        // Show setup modal after thread is created
        setShowSetupModal(true);
        
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
  }, [courseId]);

  const handleSetupSubmit = async () => {
    if (!courseName.trim()) {
      alert("Please enter a course name");
      return;
    }

    setIsLoading(true);
    try {
      // Parse file names from comma-separated string
      const fileNamesList = fileNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
      
      // Start the session with the setup data
      const response = await courseOutcomesService.startSession(
        courseId, 
        courseName, 
        askClarifyingQuestions, 
        fileNamesList
      );
      
      // Update the thread ID if a new one was created
      if (response.thread_id && response.thread_id !== threadId) {
        setThreadId(response.thread_id);
      }
      
      // Add the setup message to the chat
      const setupMessage = {
        role: "user",
        content: `Course Name: ${courseName}\nAsk Clarifying Questions: ${askClarifyingQuestions ? 'Yes' : 'No'}\nFile Names: ${fileNamesList.length > 0 ? fileNamesList.join(', ') : 'None specified'}`,
        timestamp: new Date().toISOString()
      };
      
      const assistantMessage = {
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, setupMessage, assistantMessage]);
      setSetupComplete(true);
      setShowSetupModal(false);
      
    } catch (error) {
      console.error("Error starting session:", error);
      alert(`Error starting session: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
    const filename = `course-outcomes-${new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    createPDFBlob(content, filename);
  };

  // Handle saving chat response to resources
  const handleSaveToResources = async (content, timestamp, messageIndex) => {
    setSavingMessageId(messageIndex);
    try {
      // Create a PDF blob using jsPDF
      const filename = `course-outcomes-${new Date(timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      const blob = createPDFBlobForUpload(content, filename, 'Course Outcomes Response');
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Upload to resources
      await uploadAssetResources(courseId, threadId, [file]);

      // Reload resources to show the new file
      if (courseId) {
        loadResources(courseId);
      }

      // Show success message (you could add a toast notification here)
      console.log("Course outcomes response saved to resources successfully!");
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
            {isLoading && !messages.length && (
              <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                Initializing course outcomes...
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
              placeholder={setupComplete ? "Continue the conversation..." : "Please complete the setup form first..."}
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
            >
              {isLoading ? "..." : "➤"}
            </button>
          </div>
        </div>
        {/* Sidebar */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 18 }}>
            <FileUpload
              courseId={courseId}
              threadId={threadId}
              title="Course Outcomes Resources"
              onUploadComplete={(response) => {
                console.log("Course outcomes resources uploaded:", response);
              }}
              onResourcesLoaded={(resources) => {
                console.log("Course outcomes resources loaded:", resources);
              }}
              showCheckoutControls={true}
            />
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Course Outcomes Setup</h2>
            <p style={{ color: "#444", fontSize: 15, marginBottom: 18 }}>Please provide the following information to generate course outcomes</p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6, color: "#333" }}>
                Course Name *
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Enter the course name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none"
                }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333" }}>
                <input
                  type="checkbox"
                  checked={askClarifyingQuestions}
                  onChange={(e) => setAskClarifyingQuestions(e.target.checked)}
                  style={{ accentColor: "#1976d2" }}
                />
                Ask clarifying questions before generating outcomes
              </label>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6, color: "#333" }}>
                File Names (comma-separated)
              </label>
              <textarea
                value={fileNames}
                onChange={(e) => setFileNames(e.target.value)}
                placeholder="Enter file names to reference (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  minHeight: 80,
                  resize: "vertical"
                }}
              />
            </div>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                style={{ ...btnStyle, background: "#f5f5f5" }}
                onClick={() => setShowSetupModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...btnStyle,
                  background: isLoading ? "#ccc" : "#1976d2",
                  color: "#fff",
                  border: "none"
                }}
                onClick={handleSetupSubmit}
                disabled={isLoading || !courseName.trim()}
              >
                {isLoading ? "Starting..." : "Start Session"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            setSessionUploadedFiles={setSessionUploadedFiles}
            setSessionUploadedCount={setSessionUploadedCount}
          />
        )}
      </AddReferencesModal>
    </div>
  );
}

function UploadReferencesStep({ onBack, onCancel, setSessionUploadedFiles, setSessionUploadedCount }) {
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

      setSessionUploadedFiles(prev => [...prev, ...successfulUploads]);
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