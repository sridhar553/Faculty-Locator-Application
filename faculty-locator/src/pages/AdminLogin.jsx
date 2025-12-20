import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function login() {
    if (password === "admin123") {
      localStorage.setItem("isAdminLoggedIn", "true");
      navigate("/admin");
    } else {
      alert("Invalid admin password");
    }
  }

  return (
    <div className="container">
      <h1>Admin Login</h1>

      <input
        type="password"
        placeholder="Admin Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button className="primary" onClick={login}>
        Login
      </button>
    </div>
  );
}
