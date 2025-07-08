import React from "react";

export default function Header() {
  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0.75rem 0", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ borderRadius: "50%", background: "#222", color: "#fff", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>O</span>
        Creators Copilot
      </div>
    </header>
  );
} 