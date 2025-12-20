import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import StudentSearch from "./pages/StudentSearch";
import FacultyLogin from "./pages/FacultyLogin";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Student</Link>
        <Link to="/login">Faculty</Link>
        <Link to="/admin-login">Admin</Link>
      </nav>

      <Routes>
        <Route path="/" element={<StudentSearch />} />
        <Route path="/login" element={<FacultyLogin />} />
        <Route path="/dashboard" element={<FacultyDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
