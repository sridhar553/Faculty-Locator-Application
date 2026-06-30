import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentSearch from "./pages/StudentSearch";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminPanel from "./pages/AdminPanel";
import FacultySetup from "./pages/FacultySetup";
import Login from "./pages/Login";
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
  
  return (
    <nav className="nav" style={{ justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <Link to="/" style={{ fontWeight: "bold", color: "#0f172a", fontSize: "1.2rem" }}>FacultyLocator</Link>
        
        {/* Dynamic Links */}
        {!user && <Link to="/">Search</Link>}
        
        {user?.role === "faculty" && (
          <>
            <Link to="/">Search</Link>
            <Link to="/dashboard" className="active">My Dashboard</Link>
          </>
        )}
        
        {user?.role === "admin" && (
          <>
            <Link to="/">Search</Link>
            <Link to="/admin" className="active">Admin Panel</Link>
          </>
        )}
      </div>

      <div>
        {!user ? (
          <Link to="/login" style={{ background: "#4f46e5", color: "white", padding: "8px 16px", borderRadius: "6px" }}>Login</Link>
        ) : (
          <button onClick={logout} style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", padding: "6px 16px", borderRadius: "6px", fontSize: "0.9rem" }}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
