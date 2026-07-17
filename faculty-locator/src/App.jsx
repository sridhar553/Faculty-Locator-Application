import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentSearch from "./pages/StudentSearch";
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
            <Route path="/" element={<StudentSearch />} />
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
  const [navLinks, setNavLinks] = useState([]);
  const location = useLocation();
  
  useEffect(() => {
    fetch("/api/nav")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNavLinks(data);
      })
      .catch(err => console.error(err));
  }, []);
  
  return (
    <header className="top-nav-wrapper">
      <div className="nav-container">
        {/* Left: Logo */}
        <div className="nav-left">
          <Link to="/" style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Faculty Locator Logo" style={{ height: "45px" }} />
          </Link>
        </div>

        {/* Center: Dynamic Links */}
        <nav className="centered-nav">
          {navLinks.map(link => {
            const isActive = location.pathname === link.url;
            return (
              <Link key={link.id} to={link.url} className={`nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </Link>
            );
          })}
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
            <Link to="/login" className="primary-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Login</Link>
          ) : (
            <button onClick={logout} className="action-btn delete" style={{ padding: '8px 16px' }}>Logout</button>
          )}
        </div>
      </div>
    </header>
  );
}
