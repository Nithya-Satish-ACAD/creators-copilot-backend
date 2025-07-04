import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SectionCard from "../components/SectionCard";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import AddReferencesModal from "../components/AddReferencesModal";
import SettingsModal from "../components/SettingsModal";
import { useFilesContext } from "../context/FilesContext";

function TopRow({ onAddContentClick, onSettingsClick }) {
  const courseTitle = localStorage.getItem("currentCourseTitle") || "Course Title";
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "1rem auto 0.5rem auto", width: "100%" }}>
      <div>
        <div style={{ color: "#888", fontSize: 15, marginBottom: 2 }}>
          <span
            style={{
              color: "#444",
              cursor: "pointer",
              borderBottom: "1px dotted #888",
              transition: "border-bottom 0.2s",
              textDecoration: "none"
            }}
            onMouseOver={e => (e.target.style.borderBottom = "1px solid #222")}
            onMouseOut={e => (e.target.style.borderBottom = "1px dotted #888")}
            onClick={() => navigate("/courses")}
          >
            Courses
          </span>
          {" > "}
          <span style={{ color: "#222" }}>{courseTitle}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 26, marginTop: 0 }}>{courseTitle}</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={btnStyle} onClick={onSettingsClick}>Settings</button>
        <button style={btnStyle}>Share</button>
        <button style={{ ...btnStyle, background: "#222", color: "#fff", border: "none" }}>Export to LMS</button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "7px 14px",
  borderRadius: 5,
  border: "1px solid #bbb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const GAP = 14;
const HEADER_HEIGHT = 56;
const TOPROW_HEIGHT = 80;

const curriculumOptions = [
  {
    label: "Brainstorm",
    desc: "Generate and organize initial ideas for your course curriculum.",
    url: "brainstorm"
  },
  {
    label: "Course Outcomes",
    desc: "Set clear learning goals students are expected to achieve by the end of the course.",
    url: "course-outcomes"
  },
  {
    label: "Modules & Topics",
    desc: "Organize content into structured modules and focused topics for easy navigation.",
    url: "modules-topics"
  },
  {
    label: "Lesson Plans",
    desc: "Plan each session with defined objectives, activities, and resources.",
    url: "lesson-plans"
  },
  {
    label: "Concept Map",
    desc: "Visualize relationships between key ideas and topics in the course.",
    url: "concept-map"
  },
  {
    label: "Course Notes",
    desc: "Add notes to support student understanding and revision.",
    url: "course-notes"
  },
];

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

export default function Dashboard() {
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(0);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedRefOption, setSelectedRefOption] = useState(0);
  const [addRefStep, setAddRefStep] = useState(0);
  const [sessionUploadedCount, setSessionUploadedCount] = useState(0);
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState([]); // [{name, type, checked}]
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const navigate = useNavigate();
  const { addFiles } = useFilesContext();
  

  const handleCurriculumCreate = () => setShowCurriculumModal(true);
  const handleModalClose = () => setShowCurriculumModal(false);
  const handleModalCreate = () => {
    const url = curriculumOptions[selectedOption].url;
    setShowCurriculumModal(false);
    // backend integration: create curriculum component in backend
    navigate(`/studio/${url}`);
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
    // backend integration: add uploaded/selected references to backend knowledge base
    // You can handle the selected option here
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fafbfc", display: "flex", flexDirection: "column" }}>
      <Header />
      <TopRow onSettingsClick={() => setShowSettingsModal(true)} />
      <div className="main-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start", flex: 1, height: `calc(100vh - ${HEADER_HEIGHT + TOPROW_HEIGHT}px)`, padding: "0 5vw" }}>
        {/* Main Content: 3 cards stacked vertically, equal height */}
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: GAP, height: "100%" }}>
          <SectionCard
            title="Curriculum"
            description="Start creating content"
            buttonLabel="Create"
            style={{ flex: 1, minHeight: 0, padding: "20px 20px" }}
            onButtonClick={handleCurriculumCreate}
          />
          <SectionCard
            title="Assessment"
            description="Begin on Assessments"
            buttonLabel="Create"
            style={{ flex: 1, minHeight: 0, padding: "20px 20px" }}
          />
          <SectionCard
            title="AI Evaluation"
            description="Launch automated response evaluation"
            buttonLabel="Start Evaluation"
            style={{ flex: 1, minHeight: 0, padding: "20px 20px" }}
          />
        </div>
        {/* Sidebar */}
        <div className="sidebar" style={{ flex: 1, minWidth: 280, height: "100%" }}>
          <Sidebar onAddContentClick={handleAddContentClick} />
        </div>
      </div>
      <Modal open={showCurriculumModal} onClose={handleModalClose}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>✨</span> Curriculum
        </div>
        <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 18 }}>Select Curriculum component</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {curriculumOptions.map((opt, i) => (
            <label key={opt.label} style={{
              border: selectedOption === i ? "2px solid #1976d2" : "1px solid #ddd",
              borderRadius: 8,
              padding: 10,
              minWidth: 150,
              flex: "1 1 38%",
              background: selectedOption === i ? "#f0f7ff" : "#fafbfc",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: selectedOption === i ? "0 2px 8px #1976d222" : "none"
            }}>
              <input
                type="radio"
                name="curriculum-option"
                checked={selectedOption === i}
                onChange={() => setSelectedOption(i)}
                style={{ marginBottom: 6 }}
              />
              <span style={{ fontWeight: 600, fontSize: 15 }}>{opt.label}</span>
              <span style={{ color: "#444", fontSize: 13 }}>{opt.desc}</span>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={handleModalClose} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleModalCreate} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#222", color: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Create</button>
        </div>
      </Modal>
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
                    <span style={{ marginTop: 6, background: '#eafaf1', color: '#219653', borderRadius: 6, fontSize: 13, fontWeight: 600, padding: '2px 10px', display: 'inline-block' }}>{sessionUploadedCount} files uploaded</span>
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
      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} onSave={() => setShowSettingsModal(false)} />
    </div>
  );
}

function UploadReferencesStep({ onBack, onCancel, setSessionUploadedFiles, setSessionUploadedCount }) {
  const [uploading, setUploading] = useState([]); // [{file, progress, done}]
  const [, setUploaded] = useState([]);
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