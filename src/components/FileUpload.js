import React, { useState, useRef, useEffect } from 'react';
import { 
  uploadCourseResources, 
  uploadAssetResources, 
  checkoutResource,
  checkinResource,
  deleteResource,
  addCheckedInFilesToThread
} from '../services/resources';
import { useResources } from '../context/ResourcesContext';
import { FiMoreVertical, FiDownload, FiTrash2 } from 'react-icons/fi';

const FileUpload = ({ 
  courseId, 
  threadId = null, 
  onUploadComplete, 
  onResourcesLoaded,
  showCheckoutControls = true,
  title = "Upload Files"
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef(null);
  
  // Use global resources context
  const { 
    getResources, 
    loadResources: loadGlobalResources, 
    addResource,
    removeResource,
    updateResource,
    isLoading 
  } = useResources();
  
  const resources = getResources(courseId);
  const loading = isLoading(courseId);

  // Load resources on component mount
  React.useEffect(() => {
    if (courseId) {
      loadGlobalResources(courseId);
    }
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu) {
        handleMenuClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.length || !courseId) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      let response;
      if (threadId) {
        // Asset-level upload
        response = await uploadAssetResources(courseId, threadId, files);
        console.log('Asset-level upload completed:', response);
      } else {
        // Course-level upload
        response = await uploadCourseResources(courseId, files);
        console.log('Course-level upload completed:', response);
      }

      // Add new resources to context immediately
      if (response && response.resources) {
        response.resources.forEach(resource => {
          addResource(courseId, resource);
        });
      }
      // Optionally, you can still refresh for universal updates
      // await refreshResources(courseId);
      
      // Clear files and reset progress
      setFiles([]);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete(response);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };



  const handleCheckout = async (fileId) => {
    try {
      setError(null);
      // Get user ID from localStorage or use a default
      const userId = localStorage.getItem('userId') || 'current_user';
      await checkoutResource(courseId, fileId, userId);
      
      // Update resource status immediately for instant UI update
      updateResource(courseId, fileId, { status: 'checked_out' });
      
      console.log('Resource checked out successfully');
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed');
    }
  };

  const handleCheckin = async (fileId) => {
    try {
      setError(null);
      await checkinResource(courseId, fileId);
      
      // Update resource status immediately for instant UI update
      updateResource(courseId, fileId, { status: 'checked_in' });
      
      console.log('Resource checked in successfully');
      
      // If this is an asset-level resource, add to thread
      if (threadId) {
        try {
          await addCheckedInFilesToThread(courseId, threadId);
          console.log('Added checked-in files to thread');
        } catch (err) {
          console.warn('Failed to add files to thread:', err);
        }
      }
    } catch (err) {
      console.error('Checkin error:', err);
      setError(err.message || 'Checkin failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteResource(courseId, fileId);
      
      // Remove from context immediately for instant UI update
      removeResource(courseId, fileId);
      
      console.log('Resource deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Delete failed');
    }
  };

  const handleMenuClick = (resource, event) => {
    event.stopPropagation();
    setSelectedResource(resource);
    setShowMenu(true);
  };

  const handleMenuClose = () => {
    setShowMenu(false);
    setSelectedResource(null);
  };

  const getFileIcon = (resource) => {
    const fileName = resource.fileName || resource.name || '';
    if (fileName.endsWith(".pdf")) return "📄";
    if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) return "📄";
    if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx")) return "📊";
    if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) return "📊";
    if (fileName.endsWith(".txt")) return "📄";
    if (fileName.endsWith(".zip") || fileName.endsWith(".rar")) return "🗜️";
    if (fileName.endsWith(".csv")) return "📑";
    if (fileName.endsWith(".mp4") || fileName.endsWith(".mov")) return "🎞️";
    if (fileName.endsWith(".mp3") || fileName.endsWith(".wav")) return "🎵";
    if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "🌐";
    if (fileName.endsWith(".json")) return "🗂️";
    if (fileName.endsWith(".js")) return "📜";
    if (fileName.endsWith(".py")) return "🐍";
    if (fileName.endsWith(".java")) return "☕";
    if (fileName.endsWith(".c") || fileName.endsWith(".cpp")) return "💻";
    if (fileName.endsWith(".md")) return "📝";
    if (fileName.endsWith(".svg")) return "🖼️";
    if (fileName.endsWith(".xml")) return "🗂️";
    if (fileName.endsWith(".yml") || fileName.endsWith(".yaml")) return "🗂️";
    if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png") || fileName.endsWith(".gif")) return "🖼️";
    return "📁";
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 2px 12px #0001',
      padding: 20,
      maxWidth: 540,
      margin: '32px auto',
      minHeight: 320,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{title}</div>
      {/* File Upload Section */}
      <div style={{
        border: '2px dashed #ddd',
        borderRadius: 10,
        padding: 14,
        textAlign: 'center',
        background: '#fafafa',
        marginBottom: 6
      }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.txt,.md"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "6px 12px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500
          }}
          disabled={uploading}
        >
          Select Files
        </button>
        {files.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>Selected files:</p>
            <ul style={{ fontSize: 13, marginBottom: 10 }}>
              {files.map((file, index) => (
                <li key={index} style={{ color: "#333", marginBottom: 2 }}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                padding: "6px 12px",
                background: uploading ? "#ccc" : "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            {uploading && (
              <div style={{ marginTop: 6 }}>
                <div style={{
                  width: "100%",
                  background: "#e0e0e0",
                  borderRadius: 3,
                  height: 7,
                  overflow: "hidden"
                }}>
                  <div
                    style={{
                      background: "#1976d2",
                      height: "100%",
                      width: `${uploadProgress}%`,
                      transition: "width 0.3s ease"
                    }}
                  ></div>
                </div>
                <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{uploadProgress.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Error Display */}
      {error && (
        <div style={{
          background: "#ffebee",
          border: "1px solid #f44336",
          color: "#c62828",
          padding: "10px",
          borderRadius: 5,
          fontSize: 13,
          marginBottom: 6
        }}>
          {error}
        </div>
      )}
      {/* Resources List - Only show if showCheckoutControls is true */}
      {showCheckoutControls && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Resources</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 10 }}>
              <p style={{ color: "#666" }}>Loading resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div style={{ textAlign: "center", padding: 10 }}>
              <p style={{ color: "#666" }}>No resources uploaded yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resources.map((resource, index) => {
                const isCheckedOut = resource.status === 'checked_out';
                return (
                  <div
                    key={resource.fileId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: isCheckedOut ? "#fbe9e7" : "#f5f7fa",
                      borderRadius: 10,
                      boxShadow: "0 1px 3px #0001",
                      padding: '8px 12px',
                      opacity: isCheckedOut ? 0.7 : 1,
                      position: "relative",
                      minHeight: 44
                    }}
                  >
                    {/* Check in/out checkbox at the start */}
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 10, minWidth: 24 }}>
                      <input
                        type="checkbox"
                        checked={isCheckedOut}
                        onChange={() => {
                          if (isCheckedOut) {
                            handleCheckin(resource.fileId);
                          } else {
                            handleCheckout(resource.fileId);
                          }
                        }}
                        style={{ width: 18, height: 18, accentColor: isCheckedOut ? '#fb8c00' : '#43a047', cursor: 'pointer' }}
                        id={`checkinout-${resource.fileId}`}
                      />
                    </div>
                    {/* File icon */}
                    <span style={{ fontSize: 18, marginRight: 10 }}>{getFileIcon(resource)}</span>
                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: isCheckedOut ? '#b71c1c' : '#222', marginBottom: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {resource.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: isCheckedOut ? '#b71c1c' : '#388e3c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isCheckedOut ? (
                          <>
                            <span style={{ fontSize: 13 }}>❌</span> Checked Out
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 13 }}>✔️</span> Available
                          </>
                        )}
                      </div>
                    </div>
                    {/* 3-dots menu */}
                    <div style={{ position: "relative", marginLeft: 4 }}>
                      <button
                        onClick={(e) => handleMenuClick(resource, e)}
                        style={{
                          cursor: "pointer",
                          padding: 4,
                          borderRadius: 5,
                          border: "none",
                          background: "transparent"
                        }}
                      >
                        <FiMoreVertical size={15} style={{ color: "#666" }} />
                      </button>
                      {showMenu && selectedResource?.fileId === resource.fileId && (
                        <div style={{
                          position: "absolute",
                          right: 0,
                          top: "100%",
                          width: 140,
                          backgroundColor: "white",
                          borderRadius: 7,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 1000,
                          border: "1px solid #e0e0e0",
                          marginTop: 2
                        }}>
                          <div style={{ padding: "3px 0" }}>
                            <button
                              onClick={() => {
                                // Download functionality
                                const link = document.createElement('a');
                                link.href = `/api/courses/${courseId}/resources/${resource.fileId}/download`;
                                link.download = resource.fileName;
                                link.click();
                                handleMenuClose();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                padding: "7px 10px",
                                fontSize: 13,
                                color: "#333",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                              <FiDownload size={12} style={{ marginRight: 7 }} />
                              Download
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(resource.fileId);
                                handleMenuClose();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                padding: "7px 10px",
                                fontSize: 13,
                                color: "#dc2626",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                              <FiTrash2 size={12} style={{ marginRight: 7 }} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 