import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Studio from "./pages/Studio";
import Courses from "./pages/Courses";
import CourseOutcomes from "./pages/CourseOutcomes";
import { FilesProvider } from "./context/FilesContext";
import { ResourcesProvider } from "./context/ResourcesContext";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    <ToastProvider>
      <FilesProvider>
        <ResourcesProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/studio/:option" element={<Studio />} />
              <Route path="/course-outcomes/:courseId" element={<CourseOutcomes />} />
              {/* Redirect root to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </ResourcesProvider>
      </FilesProvider>
    </ToastProvider>
  );
}

export default App;
