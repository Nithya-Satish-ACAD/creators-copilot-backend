import React, { useRef } from "react";
import { useFilesContext } from "../context/FilesContext";

export default function Sidebar({ onAddContentClick }) {
  const { files, addFiles } = useFilesContext();
  const fileInputRef = useRef();

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
    if (onAddContentClick) {
      onAddContentClick();
    } else {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px #0001", padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Knowledge base</div>
        <div style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Guides AI for content generation.</div>
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
          {files.map((file, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < files.length - 1 ? "1px solid #f0f0f0" : "none" }}>
              <span style={{ fontSize: 15 }}>{getFileIcon(file)} {file.name}</span>
              <span style={{ cursor: "pointer", fontSize: 18 }}>⋮</span>
            </li>
          ))}
        </ul>
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