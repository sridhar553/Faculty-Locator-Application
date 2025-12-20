import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    department: "",
    timetableLocation: ""
  });

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdminLoggedIn");
    if (!isAdmin) {
      navigate("/admin-login");
      return;
    }
    loadFaculty();
  }, [navigate]);

  // GET faculty from backend
  function loadFaculty() {
    fetch("http://localhost:5000/api/faculty")
      .then(res => res.json())
      .then(data => setFaculty(data))
      .catch(err => console.error(err));
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // POST faculty to backend
  function addFaculty() {
    if (!form.id || !form.name) {
      alert("Faculty ID and Name required");
      return;
    }

    fetch("http://localhost:5000/api/faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(() => {
        setForm({ id: "", name: "", department: "", timetableLocation: "" });
        loadFaculty();
      })
      .catch(err => console.error(err));
  }

  // DELETE faculty from backend
  function deleteFaculty(id) {
    fetch(`http://localhost:5000/api/faculty/${id}`, {
      method: "DELETE"
    })
      .then(() => loadFaculty())
      .catch(err => console.error(err));
  }

  function logout() {
    localStorage.removeItem("isAdminLoggedIn");
    navigate("/admin-login");
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>

      <div className="card">
        <h3>Add Faculty</h3>

        <input name="id" placeholder="Faculty ID" value={form.id} onChange={handleChange} />
        <input name="name" placeholder="Faculty Name" value={form.name} onChange={handleChange} />
        <input name="department" placeholder="Department" value={form.department} onChange={handleChange} />
        <input
          name="timetableLocation"
          placeholder="Default Location"
          value={form.timetableLocation}
          onChange={handleChange}
        />

        <button className="primary" onClick={addFaculty}>
          Add Faculty
        </button>
      </div>

      <div className="card">
        <h3>Faculty List</h3>

        {faculty.length === 0 && <p>No faculty available</p>}

        {faculty.map(f => (
          <div
            key={f._id}
            style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}
          >
            <span>
              {f.name} ({f.id})
            </span>
            <button onClick={() => deleteFaculty(f.id)}>Delete</button>
          </div>
        ))}
      </div>

      <button
        style={{ background: "#ef4444", color: "#fff", marginTop: "10px" }}
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}
