import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentSearch from "./pages/StudentSearch";
import Home from "./pages/Home";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminPanel from "./pages/AdminPanel";
import FacultySetup from "./pages/FacultySetup";
import Login from "./pages/Login";
import Map from "./pages/Map";
import About from "./pages/About";
import { useAuth } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <DynamicNav />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/departments" element={<StudentSearch />} />
            <Route path="/map" element={<Map />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/faculty-setup" element={<FacultySetup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="faculty">
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

function DynamicNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  return (
    <header className="top-nav-wrapper">
      <div className="nav-container">
        {/* Left: Logo */}
        <div className="nav-left">
          <Link to="/" style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Faculty Locator Logo" style={{ height: "45px" }} />
          </Link>
        </div>

        {/* Center: Hardcoded Links matching mockup */}
        <nav className="centered-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/departments" className={`nav-link ${location.pathname === '/departments' ? 'active' : ''}`}>Departments</Link>
          <Link to="/departments" className={`nav-link ${location.pathname === '/departments' ? 'active' : ''}`}>Faculty</Link>
          <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>Map</Link>
          <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
        </nav>
        
        {/* Right: Auth / Dashboard Links */}
        <div className="nav-right">
          {user?.role === "faculty" && (
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          )}
          
          {user?.role === "admin" && (
            <Link to="/admin" className="nav-link">Admin</Link>
          )}

          {!user ? (
            <Link to="/login" className="nav-link" style={{ fontWeight: 500 }}>Sign In</Link>
          ) : (
            <button onClick={logout} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Sign Out</button>
          )}
        </div>
      </div>
    </header>
  );
}
