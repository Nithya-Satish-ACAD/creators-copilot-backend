import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { login } from "../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // backend integration: replace with real authentication API call
    if (login(username, password)) {
      navigate("/courses");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <Input label="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
        <Button type="submit">Login</Button>
      </form>
      <div style={{ margin: "18px 0", textAlign: "center", color: "#888" }}>or</div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* backend integration: replace this button with real Google Login */}
        <button
          type="button"
          style={{
            width: "100%",
            background: "#fff",
            color: "#222",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "10px 0",
            fontWeight: 500,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 1px 2px #0001",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
          onClick={() => alert('Google Login (placeholder)')}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 8 }}><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.68 2.36 30.74 0 24 0 14.82 0 6.71 5.1 2.69 12.44l8.01 6.22C12.6 13.13 17.88 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.64 7.02l7.19 5.6C43.93 37.13 46.1 31.36 46.1 24.55z"/><path fill="#FBBC05" d="M10.7 28.66c-1.01-2.99-1.01-6.33 0-9.32l-8.01-6.22C.68 17.1 0 20.47 0 24c0 3.53.68 6.9 2.69 10.88l8.01-6.22z"/><path fill="#EA4335" d="M24 48c6.48 0 11.92-2.15 15.89-5.86l-7.19-5.6c-2.01 1.35-4.6 2.16-8.7 2.16-6.12 0-11.4-3.63-13.3-8.88l-8.01 6.22C6.71 42.9 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          Sign in with Google
        </button>
      </div>
      <div style={{ marginTop: 16 }}>
        Don't have an account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}