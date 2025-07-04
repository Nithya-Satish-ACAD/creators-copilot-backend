import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>404</h1>
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Page Not Found</h2>
      <p style={{ color: "#666", marginBottom: 24 }}>Sorry, the page you are looking for does not exist.</p>
      <button
        onClick={() => navigate("/courses")}
        style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "#222", color: "#fff", fontWeight: 500, fontSize: 16, cursor: "pointer" }}
      >
        Go to Courses
      </button>
    </div>
  );
} 