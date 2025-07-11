import React, { useRef, useState } from "react";
import { useFilesContext } from "../context/FilesContext";

export default function Sidebar({ onAddContentClick }) {
  const { files, addFiles } = useFilesContext();
  const fileInputRef = useRef();
  const [menuIndex, setMenuIndex] = useState(null);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map(file => ({
      name: file.name,
      type: file.type,
      checked: false
    }));
    addFiles(newFiles);
    e.target.value = null;
  };

  const handleAddContentClick = () => {
    if (onAddContentClick) {
      onAddContentClick();
    } else {
      fileInputRef.current.click();
    }
  };

  const handleMenuClick = (idx) => {
    setMenuIndex(idx === menuIndex ? null : idx);
  };

  const handleMenuClose = () => {
    setMenuIndex(null);
  };

  // Adjust this value if your header/top row height changes
  const sidebarBoxHeight = '60vh';

  return (
    <div>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "none",
        padding: 24,
        height: sidebarBoxHeight,
        maxHeight: sidebarBoxHeight,
        display: "flex",
        flexDirection: "column",
        gap: 0
      }}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 2, color: "#1a2533" }}>Knowledge Base</div>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 18, fontWeight: 500 }}>
        Add resources from the web or course documents you’ve already created — this helps AI give relevant results.
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
            padding: "12px 0",
            borderRadius: 8,
            border: "1px solid #bbb",
            background: "#fff",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 18,
            width: "100%"
          }}
          onClick={handleAddContentClick}
        >
          Add Resource
        </button>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {files.map((file, i) => (
              <li key={i} style={{ position: 'relative', display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < files.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <span style={{ fontSize: 15 }}>{getFileIcon(file)} {file.name}</span>
                <span style={{ cursor: "pointer", fontSize: 18 }} onClick={e => { e.stopPropagation(); handleMenuClick(i); }}>⋮</span>
                {menuIndex === i && (
                  <div style={{ position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 2px 8px #0002', zIndex: 10, minWidth: 120 }}>
                    <div style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => { alert('View: ' + file.name); handleMenuClose(); }}>View</div>
                    <div style={{ padding: '10px 16px', cursor: 'pointer' }} onClick={() => { alert('Download: ' + file.name); handleMenuClose(); }}>Download</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {menuIndex !== null && <div onClick={handleMenuClose} style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 5 }} />}
        </div>
      </div>
    </div>
  );
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
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