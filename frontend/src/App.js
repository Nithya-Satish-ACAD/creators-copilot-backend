import React, { useState } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setFiles((prev) => [...prev, data]);
  };

  const handleCheckbox = (filename) => {
    setSelectedFiles((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename]
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const formData = new FormData();
    formData.append("message", input);
    selectedFiles.forEach((fname) => formData.append("file_names", fname));
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "assistant", content: data.response },
    ]);
    setInput("");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Main Chat Pane */}
      <div style={{ flex: 1, borderRight: "1px solid #eee", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ margin: "8px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
              <b>{msg.role === "user" ? "You" : "Assistant"}:</b> {msg.content}
            </div>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{ width: "80%", marginRight: 8 }}
            placeholder="Type your message..."
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
      {/* Right Resource Pane */}
      <div style={{ width: 320, padding: 16, background: "#fafbfc" }}>
        <h3>Resources</h3>
        <input type="file" onChange={handleFileUpload} />
        <ul style={{ listStyle: "none", padding: 0 }}>
          {files.map((file, i) => (
            <li key={i} style={{ margin: "8px 0" }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.filename)}
                  onChange={() => handleCheckbox(file.filename)}
                />
                {" "}
                {file.filename}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
