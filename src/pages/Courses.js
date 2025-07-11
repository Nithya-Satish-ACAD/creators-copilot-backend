import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { logout } from "../services/auth";
import Modal from "../components/Modal";
import { FaRegStar } from "react-icons/fa";

export default function Courses() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("courses")) || [];
    setCourses(stored);
  }, [showModal]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCreate = () => setShowModal(true);
  const handleClose = () => setShowModal(false);
  const handleGetStarted = () => {
    if (!courseName.trim() || !courseDesc.trim()) return;
    const courses = JSON.parse(localStorage.getItem("courses")) || [];
    const newCourse = { title: courseName, desc: courseDesc };
    const updatedCourses = [...courses, newCourse];
    localStorage.setItem("courses", JSON.stringify(updatedCourses));
    localStorage.setItem("currentCourseTitle", courseName);
    setShowModal(false);
    setCourseName("");
    setCourseDesc("");
    setCourses(updatedCourses);
    navigate("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Header Bar */}
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eee", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ background: "#2563eb", color: "#fff", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, marginRight: 8 }}>
            C
          </div>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#222" }}>Creators Copilot</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#222", fontWeight: 500, fontSize: 15, cursor: "pointer", padding: 0 }}
        >
          <FaUserCircle style={{ fontSize: 22, color: "#2563eb" }} /> Logout
        </button>
      </div>
      {/* Courses List or Centered Create Button */}
      {courses.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button
            style={{ padding: "10px 22px", borderRadius: 6, border: "none", background: "#1680ea", color: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}
            onClick={handleCreate}
          >
            Create Course
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 24, padding: '40px 5vw' }}>
          {courses.map((course, idx) => (
            <div
              key={idx}
              style={{
                background: '#f5f7fa',
                borderRadius: 12,
                boxShadow: '0 1px 4px #0001',
                padding: '16px 24px',
                minWidth: 180,
                minHeight: 96,
                height: 96,
                fontWeight: 600,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                border: '2px solid transparent',
              }}
              onClick={() => {
                localStorage.setItem('currentCourseTitle', course.title);
                navigate('/dashboard');
              }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px #2563eb22'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 4px #0001'}
            >
              {course.title}
            </div>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={handleClose} modalStyle={{ minWidth: 0, maxWidth: 600, width: '100%', borderRadius: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Create Course</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Course Name</div>
          <input
            type="text"
            placeholder="e.g. Introduction to Python"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, borderRadius: 6, border: "1px solid #ccc", marginBottom: 22 }}
            required
          />
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>About the course</span>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 18, padding: 0 }}
              title="AI Sparkle"
            >
              <FaRegStar style={{ fontSize: 18 }} />
            </button>
          </div>
          <div style={{ position: "relative", marginBottom: 32 }}>
            <textarea
              placeholder="Type here or click the AI Sparkle button to provide details about the course audience (eg. Year 2 Digital Transformation), topics, projects, assessment methods etc."
              value={courseDesc}
              onChange={e => setCourseDesc(e.target.value)}
              style={{ width: "100%", minHeight: 90, boxSizing: "border-box", padding: "10px 12px", fontSize: 15, borderRadius: 6, border: "1px solid #ccc", resize: "vertical" }}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={handleClose} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Close</button>
            <button onClick={handleGetStarted} disabled={!courseName.trim() || !courseDesc.trim()} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: (!courseName.trim() || !courseDesc.trim()) ? "#bbb" : "#1680ea", color: "#fff", fontWeight: 500, fontSize: 15, cursor: (!courseName.trim() || !courseDesc.trim()) ? "not-allowed" : "pointer" }}>Get Started</button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 