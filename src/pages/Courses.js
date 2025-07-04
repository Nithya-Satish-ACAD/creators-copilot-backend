import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Modal from "../components/Modal";
import { logout } from "../services/auth";
import { FaTrash } from "react-icons/fa";

function getCourses() {
  try {
    return JSON.parse(localStorage.getItem("courses")) || [];
  } catch {
    return [];
  }
}

function saveCourses(courses) {
  localStorage.setItem("courses", JSON.stringify(courses));
}

export default function Courses() {
  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courses, setCourses] = useState(getCourses());
  const navigate = useNavigate();

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  const handleCreate = () => setShowModal(true);
  const handleClose = () => setShowModal(false);
  const handleGetStarted = () => {
    const newCourse = { title: courseName, desc: courseDesc };
    const updatedCourses = [...courses, newCourse];
    saveCourses(updatedCourses);
    setCourses(updatedCourses);
    localStorage.setItem("currentCourseTitle", courseName);
    setShowModal(false);
    setCourseName("");
    setCourseDesc("");
    navigate("/dashboard");
  };
  const handleLogout = () => {
    // backend integration
    logout();
    navigate("/login");
  };
  const handleGenerateAI = () => {
    setCourseDesc("This course helps the students to have a comprehensive knowledge about " + (courseName || "the subject"));
  };

  const isFormValid = courseName.trim() !== "" && courseDesc.trim() !== "";

  const handleCardClick = (course) => {
    localStorage.setItem("currentCourseTitle", course.title);
    navigate("/dashboard");
  };

  const handleDeleteCourse = (idx, e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (window.confirm("Are you sure you want to delete this course?")) {
      const updatedCourses = courses.filter((_, i) => i !== idx);
      saveCourses(updatedCourses);
      setCourses(updatedCourses);
    }
  };

  const trashBtnStyle = {
    position: "absolute",
    top: 12,
    right: 12,
    background: "rgba(255, 255, 255, 0.7)",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 4px #0001",
    transition: "background 0.18s, box-shadow 0.18s",
    cursor: "pointer",
    zIndex: 2,
    padding: 0
  };
  const trashBtnHoverStyle = {
    background: "#ffeaea",
    boxShadow: "0 2px 8px #f00a"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Header />
        <button
          onClick={handleLogout}
          style={{ marginRight: 32, padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "32px 32px 0 32px" }}>
        <div style={{ fontWeight: 700, fontSize: 24 }}>Courses</div>
        {courses.length > 0 && (
          <button
            style={{ padding: "10px 22px", borderRadius: 6, border: "none", background: "#222", color: "#fff", fontWeight: 500, fontSize: 16, cursor: "pointer" }}
            onClick={handleCreate}
          >
            + Create Course
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: courses.length === 0 ? "center" : "flex-start", justifyContent: courses.length === 0 ? "center" : "flex-start", width: "100%" }}>
        {courses.length === 0 ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ marginBottom: 16, fontSize: 17 }}>No courses created yet.</div>
            <button
              style={{ padding: "10px 22px", borderRadius: 6, border: "none", background: "#222", color: "#fff", fontWeight: 500, fontSize: 16, cursor: "pointer" }}
              onClick={handleCreate}
            >
              Create Course
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start", margin: "32px 0 0 32px" }}>
            {courses.map((course, idx) => (
              <div
                key={idx}
                onClick={() => handleCardClick(course)}
                style={{
                  width: 320,
                  height: 120,
                  background: "#fafbfc",
                  borderRadius: 12,
                  boxShadow: "0 1px 4px #0001",
                  padding: "28px 24px",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  border: "1px solid #eee",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative"
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 19 }}>{course.title}</div>
                <button
                  onClick={e => handleDeleteCourse(idx, e)}
                  style={{ ...trashBtnStyle }}
                  title="Delete Course"
                  onMouseOver={e => Object.assign(e.currentTarget.style, trashBtnHoverStyle)}
                  onMouseOut={e => Object.assign(e.currentTarget.style, trashBtnStyle)}
                >
                  <FaTrash style={{ color: "#e53935", fontSize: 17 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={showModal} onClose={handleClose}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Create Course</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Course Name</div>
        <input
          type="text"
          placeholder="e.g Web Development with JS"
          value={courseName}
          onChange={e => setCourseName(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", fontSize: 15, borderRadius: 6, border: "1px solid #ccc", marginBottom: 18 }}
          required
        />
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>About the course</span>
          <button
            onClick={handleGenerateAI}
            style={{ fontWeight: 500, fontSize: 14, color: "#222", background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 6, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
          >
            <span style={{ fontSize: 18 }}>✨</span> Generate with AI
          </button>
        </div>
        <textarea
          placeholder="e.g This course helps the students to have a comprehensive knowledge about web development"
          value={courseDesc}
          onChange={e => setCourseDesc(e.target.value)}
          style={{ width: "100%", minHeight: 80, padding: "10px 12px", fontSize: 15, borderRadius: 6, border: "1px solid #ccc", marginBottom: 24, resize: "vertical" }}
          required
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={handleClose} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #bbb", background: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleGetStarted} disabled={!isFormValid} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: isFormValid ? "#222" : "#888", color: "#fff", fontWeight: 500, fontSize: 15, cursor: isFormValid ? "pointer" : "not-allowed" }}>Get started</button>
        </div>
      </Modal>
    </div>
  );
} 