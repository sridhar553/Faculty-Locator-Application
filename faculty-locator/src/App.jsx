import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentSearch from "./pages/StudentSearch";
import FacultyLogin from "./pages/FacultyLogin";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";
import FacultySetup from "./pages/FacultySetup";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-center" />
        <BrowserRouter>
          <nav className="nav">
            <Link to="/">Student</Link>
            <Link to="/login">Faculty</Link>
            <Link to="/admin-login">Admin</Link>
          </nav>

          <Routes>
            <Route path="/" element={<StudentSearch />} />
            <Route path="/login" element={<FacultyLogin />} />
            <Route path="/faculty-setup" element={<FacultySetup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="faculty">
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin-login" element={<AdminLogin />} />
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
