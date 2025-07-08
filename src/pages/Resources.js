import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { getCourse } from '../services/course';
import { useResources } from '../context/ResourcesContext';
import { checkoutResource, checkinResource, deleteResource } from '../services/resources';
import { FiMoreVertical, FiDownload, FiTrash2 } from 'react-icons/fi';

const Resources = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const { 
    getResources, 
    loadResources, 
    isLoading, 
    getError, 
    clearError,
    refreshResources
  } = useResources();
  
  const resources = getResources(courseId);
  const loading = isLoading(courseId);
  const error = getError(courseId);

  useEffect(() => {
    const loadCourseAndResources = async () => {
      if (!courseId) {
        return;
      }

      try {
        // Load course details
        const courseData = await getCourse(courseId);
        setCourse(courseData);

        // Load resources using context
        await loadResources(courseId);

      } catch (err) {
        console.error('Error loading course and resources:', err);
      }
    };

    loadCourseAndResources();
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

  const handleUploadComplete = (response) => {
    console.log('Resources uploaded:', response);
    // Refresh resources after upload to ensure universal updates
    refreshResources(courseId);
  };



  const handleDelete = async (fileId) => {
    console.log('Delete clicked for file:', fileId);
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteResource(courseId, fileId);
      // Refresh resources to ensure universal updates
      await refreshResources(courseId);
      console.log('Resource deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
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

  const handleCheckboxChange = async (resource, event) => {
    const isChecked = event.target.checked;
    try {
      if (isChecked) {
        // Check out
        const userId = localStorage.getItem('userId') || 'current-user';
        await checkoutResource(courseId, resource.fileId, userId);
      } else {
        // Check in
        await checkinResource(courseId, resource.fileId);
      }
      await refreshResources(courseId);
    } catch (err) {
      console.error('Checkout/Checkin error:', err);
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked_in': return '📄';
      case 'checked_out': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in': return 'text-green-600';
      case 'checked_out': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'checked_in': return 'Available';
      case 'checked_out': return 'Checked Out';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => clearError(courseId)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#cbe0f7", padding: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px 0 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>📚</span> Resources
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button 
            style={{ 
              padding: "7px 14px", 
              borderRadius: 5, 
              border: "1px solid #bbb", 
              background: "#fff", 
              cursor: "pointer", 
              fontSize: 14, 
              fontWeight: 500 
            }} 
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", maxWidth: 1200, margin: "24px auto 0 auto", gap: 18, alignItems: "flex-start" }}>
        {/* Upload Section */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 18 }}>
            <FileUpload
              courseId={courseId}
              title="Upload Resources"
              onUploadComplete={handleUploadComplete}
              showCheckoutControls={false}
            />
          </div>
        </div>

        {/* Resources List */}
        <div style={{ flex: 2 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Knowledge base - {course?.name || 'Course'}</div>
        <div style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Guides AI for content generation.</div>
            
            {resources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 48, color: "#ccc", marginBottom: 16 }}>📁</div>
                <div style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>No resources yet</div>
                <div style={{ fontSize: 14, color: "#999" }}>Upload your first resource to get started.</div>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resources.map((resource, i) => {
                  const isCheckedOut = resource.status === 'checked_out';
                  return (
                    <li key={resource.fileId} style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: isCheckedOut ? '#fbe9e7' : '#f5f7fa',
                      borderRadius: 12,
                      boxShadow: '0 1px 4px #0001',
                      padding: 18,
                      opacity: isCheckedOut ? 0.7 : 1,
                      position: 'relative',
                      gap: 0,
                    }}>
                      {/* File icon */}
                      <span style={{ fontSize: 22, marginRight: 16 }}>{getFileIcon(resource)}</span>
                      {/* File info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: isCheckedOut ? '#b71c1c' : '#222', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {resource.fileName}
                        </div>
                        <div style={{ fontSize: 13, color: isCheckedOut ? '#b71c1c' : '#388e3c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isCheckedOut ? (
                            <>
                              <span style={{ fontSize: 16 }}>❌</span> Checked Out
                              {resource.checkedOutBy && (
                                <span style={{ color: '#888', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                                  (by {resource.checkedOutBy})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: 16 }}>✔️</span> Available
                            </>
                          )}
                        </div>
                      </div>
                      {/* Check in/out button */}
                      <button
                        onClick={async () => {
                          try {
                            if (isCheckedOut) {
                              await checkinResource(courseId, resource.fileId);
                            } else {
                              const userId = localStorage.getItem('userId') || 'current-user';
                              await checkoutResource(courseId, resource.fileId, userId);
                            }
                            await refreshResources(courseId);
                          } catch (err) {
                            console.error('Checkout/Checkin error:', err);
                          }
                        }}
                        style={{
                          marginLeft: 16,
                          padding: '7px 16px',
                          borderRadius: 6,
                          border: 'none',
                          background: isCheckedOut ? '#43a047' : '#fb8c00',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px #0001',
                          transition: 'background 0.2s',
                          minWidth: 90
                        }}
                      >
                        {isCheckedOut ? 'Check In' : 'Check Out'}
                      </button>
                      {/* 3-dots menu */}
                      <div style={{ position: 'relative', marginLeft: 8 }}>
                        <button
                          onClick={(e) => handleMenuClick(resource, e)}
                          style={{
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent'
                          }}
                        >
                          <FiMoreVertical size={18} style={{ color: '#666' }} />
                        </button>
                        {showMenu && selectedResource?.fileId === resource.fileId && (
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            width: 160,
                            backgroundColor: 'white',
                            borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            border: '1px solid #e0e0e0',
                            marginTop: 4
                          }}>
                            <div style={{ padding: '4px 0' }}>
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
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: 14,
                                  color: '#333',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <FiDownload size={14} style={{ marginRight: 8 }} />
                                Download
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(resource.fileId);
                                  handleMenuClose();
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: 14,
                                  color: '#dc2626',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <FiTrash2 size={14} style={{ marginRight: 8 }} />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources; 