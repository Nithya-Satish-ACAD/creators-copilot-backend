import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFilesContext } from "../context/FilesContext";
import AddReferencesModal from "../components/AddReferencesModal";

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
  const { files, updateFileChecked, setAllChecked, addFiles } = useFilesContext();
  const title = optionTitles[option] || option;
  const allChecked = files.length > 0 && files.every(f => f.checked);
  const fileInputRef = useRef();
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedRefOption, setSelectedRefOption] = useState(0);
  const [addRefStep, setAddRefStep] = useState(0);
  const [sessionUploadedCount, setSessionUploadedCount] = useState(0);
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState([]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map(file => ({
      name: file.name,
      type: file.type,
      checked: true
    }));
    addFiles(newFiles);
    e.target.value = null;
  };

  const handleAddContentClick = () => {
    setAddRefStep(0);
    setShowAddContentModal(true);
  };

  const handleAddContentModalClose = () => {
    setShowAddContentModal(false);
  };

  const handleAddContentModalAdd = () => {
    setShowAddContentModal(false);
    // You can handle the selected option here
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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px 0 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>✨</span> AI Studio
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, background: "#fff", borderRadius: 6, padding: "6px 12px" }}>
            <input type="checkbox" style={{ accentColor: "#222" }} /> Use reference material only
          </label>
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
            {/* Chat messages would go here */}
          </div>
          <div style={{ borderTop: "1px solid #e0e0e0", padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Type a prompt to generate a lesson, quiz, or outcome..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "10px 14px", borderRadius: 8, background: "#f5f7fa" }}
            />
            <button style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>&#9658;</button>
          </div>
        </div>
        {/* Sidebar */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Knowledge base</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Guides AI for content generation.</div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              onChange={handleFileChange}
            />
            <button style={{ width: "100%", marginBottom: 12, padding: "8px 0", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }} onClick={handleAddContentClick}>Add Content</button>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, fontSize: 14 }}>
                <input type="checkbox" checked={allChecked} onChange={e => setAllChecked(e.target.checked)} /> Select All References
              </label>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {files.map((file, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < files.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={file.checked !== false}
                      onChange={e => updateFileChecked(file.name, e.target.checked)}
                    />
                    {getFileIcon(file)} {file.name}
                  </label>
                  <span style={{ cursor: "pointer", fontSize: 18 }}>⋮</span>
                </li>
              ))}
            </ul>
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
                  if (selectedRefOption === 0 && sessionUploadedFiles.length > 0) {
                    addFiles(sessionUploadedFiles);
                    setSessionUploadedFiles([]);
                    setSessionUploadedCount(0);
                  }
                  handleAddContentModalAdd();
                }}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#222", color: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}
              >
                Add
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

function getFileIcon(file) {
  if (file.type && file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  if (file.name.endsWith(".doc") || file.name.endsWith(".docx")) return "📄";
  if (file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) return "📊";
  if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) return "📊";
  if (file.name.endsWith(".txt")) return "📄";
  if (file.name.endsWith(".zip") || file.name.endsWith(".rar")) return "🗜️";
  if (file.name.endsWith(".csv")) return "📑";
  if (file.name.endsWith(".mp4") || file.name.endsWith(".mov")) return "🎞️";
  if (file.name.endsWith(".mp3") || file.name.endsWith(".wav")) return "🎵";
  if (file.name.endsWith(".html") || file.name.endsWith(".htm")) return "🌐";
  if (file.name.endsWith(".json")) return "🗂️";
  if (file.name.endsWith(".js")) return "📜";
  if (file.name.endsWith(".py")) return "🐍";
  if (file.name.endsWith(".java")) return "☕";
  if (file.name.endsWith(".c") || file.name.endsWith(".cpp")) return "💻";
  if (file.name.endsWith(".md")) return "📝";
  if (file.name.endsWith(".svg")) return "🖼️";
  if (file.name.endsWith(".xml")) return "🗂️";
  if (file.name.endsWith(".yml") || file.name.endsWith(".yaml")) return "🗂️";
  return "📁";
}

function UploadReferencesStep({ onBack, onCancel, setSessionUploadedFiles, setSessionUploadedCount }) {
  const [uploading, setUploading] = useState([]); // [{file, progress, done}]
  const [uploaded, setUploaded] = useState([]); // [{file}]
  const fileInputRef = useRef();

  const handleFiles = files => {
    const filesArr = Array.from(files);
    const newUploads = filesArr.map(file => ({ file, progress: 0, done: false }));
    setUploading(prev => [...prev, ...newUploads]);
    filesArr.forEach((file, idx) => simulateUpload(file, idx + uploading.length));
  };

  const simulateUpload = (file, idx) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      setUploading(prev => prev.map((u, i) => i === idx ? { ...u, progress: Math.min(progress, 100), done: progress >= 100 } : u));
      if (progress >= 100) {
        clearInterval(interval);
        setUploaded(prev => {
          const updated = [...prev, { file }];
          // Only update session state, do not add to global references
          setSessionUploadedFiles(updated.map(u => ({ name: u.file.name, type: u.file.type, checked: true })));
          setSessionUploadedCount(updated.length);
          return updated;
        });
      }
    }, 300);
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
      <div style={{ marginBottom: 12 }}>
        {uploading.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span>{u.file.name}</span>
            <div style={{ flex: 1, height: 8, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${u.progress}%`, height: 8, background: u.done ? "#4caf50" : "#1976d2" }} />
            </div>
            <span style={{ fontSize: 13 }}>{Math.round(u.progress)}%</span>
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