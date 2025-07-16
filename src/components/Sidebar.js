import React, { useRef, useEffect, useState } from "react";
import { useResources } from "../context/ResourcesContext";
import { deleteResource } from "../services/resources";
import { FiMoreVertical, FiDownload, FiTrash2 } from "react-icons/fi";

export default function Sidebar({ onAddContentClick }) {
  const { getResources, loadResources, removeResource } = useResources();
  const [selectedResource, setSelectedResource] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef();
  
  // Get current course ID from localStorage
  const courseId = localStorage.getItem("currentCourseId");
  
  // Load resources when component mounts
  useEffect(() => {
    if (courseId) {
      loadResources(courseId);
    }
  }, [courseId, loadResources]);
  
  // Get resources for current course
  const resources = getResources(courseId);

  const handleFileChange = (e) => {
    // This is now handled by the Add Content modal
    e.target.value = null;
  };

  const handleAddContentClick = () => {
    if (onAddContentClick) {
      onAddContentClick();
    } else {
      fileInputRef.current.click();
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

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteResource(courseId, fileId);
      
      // Remove from context immediately for instant UI update
      removeResource(courseId, fileId);
      
      console.log('Resource deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete file: ' + err.message);
    }
  };

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

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Knowledge base</div>
        <div style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Guides AI for content generation.</div>
        <div style={{ marginBottom: 10 }}>
          {/* Removed Manage Resources button */}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          onChange={handleFileChange}
        />
        <button
          style={{
            padding: "10px 0",
            borderRadius: 6,
            border: "1px solid #bbb",
            background: "#fff",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 12,
            width: "100%"
          }}
          onClick={handleAddContentClick}
        >
          Add Content
        </button>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {resources.map((resource, i) => (
            <li key={resource.fileId} style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              padding: "7px 0", 
              borderBottom: i < resources.length - 1 ? "1px solid #f0f0f0" : "none",
              opacity: resource.status === 'checked_out' ? 0.6 : 1
            }}>
              <span style={{ fontSize: 15 }}>
                {getFileIcon(resource)} {resource.fileName}
                {resource.status === 'checked_out' && (
                  <span style={{ color: '#ff9800', fontSize: 12, marginLeft: 5 }}>❌</span>
                )}
              </span>
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => handleMenuClick(resource, e)}
                  style={{
                    cursor: "pointer",
                    padding: "2px",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent"
                  }}
                >
                  <FiMoreVertical size={16} style={{ color: "#666" }} />
                </button>
                
                {showMenu && selectedResource?.fileId === resource.fileId && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    width: "160px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    border: "1px solid #e0e0e0",
                    marginTop: "4px"
                  }}>
                    <div style={{ padding: "4px 0" }}>
                      <button
                        onClick={() => {
                          // Download functionality
                          const courseId = localStorage.getItem("currentCourseId");
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
                          padding: "8px 12px",
                          fontSize: "14px",
                          color: "#333",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                      >
                        <FiDownload size={14} style={{ marginRight: "8px" }} />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          // Delete functionality - you might want to add confirmation
                          handleDelete(resource.fileId);
                          handleMenuClose();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "14px",
                          color: "#dc2626",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                      >
                        <FiTrash2 size={14} style={{ marginRight: "8px" }} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getFileIcon(resource) {
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
} 