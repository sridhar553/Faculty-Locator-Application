import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [faculty, setFaculty] = useState([]);
  const [locations, setLocations] = useState([]);
  const [examMode, setExamMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [navLinks, setNavLinks] = useState([]);
  const [showNavForm, setShowNavForm] = useState(false);

  const [form, setForm] = useState({
    email: "",
    name: "",
    department: "",
    subject: "",
    timetableLocation: ""
  });

  const [locationForm, setLocationForm] = useState({
    block: "",
    floor: "",
    cabinNo: ""
  });

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    imageFile: null
  });

  const [navForm, setNavForm] = useState({
    label: "",
    url: "",
    orderIndex: 0
  });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadFaculty();
    loadConfig();
    loadLogs();
    loadLocations();
    loadDepartments();
    loadNavLinks();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("statusUpdate", () => loadFaculty());
    socket.on("configUpdate", ({ key, value }) => {
      if (key === "examMode") setExamMode(value);
    });
    return () => {
      socket.off("statusUpdate");
      socket.off("configUpdate");
    };
  }, [socket]);

  function loadConfig() {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mode = data.find(c => c.key === "examMode")?.value;
          setExamMode(!!mode);
        }
      })
      .catch(err => console.error(err));
  }

  function loadLogs() {
    fetch("/api/config/logs", {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(err => console.error(err));
  }

  function loadLocations() {
    fetch("/api/locations")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLocations(data);
      })
      .catch(err => console.error(err));
  }

  function loadDepartments() {
    fetch("/api/departments")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(err => console.error(err));
  }

  function loadNavLinks() {
    fetch("/api/nav")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNavLinks(data);
      })
      .catch(err => console.error(err));
  }

  function toggleExamMode() {
    const newValue = !examMode;
    fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ key: "examMode", value: newValue })
    })
      .then(res => {
        if (res.ok) {
          setExamMode(newValue);
          toast.success(`Exam Mode ${newValue ? "Enabled" : "Disabled"}`);
        }
      });
  }

  function loadFaculty() {
    fetch("/api/faculty")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFaculty(data);
      })
      .catch(err => console.error(err));
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleLocationChange(e) {
    setLocationForm({ ...locationForm, [e.target.name]: e.target.value });
  }

  function addLocation(e) {
    e.preventDefault();
    if (!locationForm.block || !locationForm.floor || !locationForm.cabinNo) {
      toast.error("Block, Floor, and Cabin No are required");
      return;
    }
    
    if (!window.confirm("Are you sure you want to save this location?")) return;

    fetch("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify(locationForm)
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setLocationForm({ block: "", floor: "", cabinNo: "" });
          setShowLocationForm(false);
          loadLocations();
          toast.success("Location saved!");
        } else {
          toast.error(data.message || data.error || "Error adding location");
        }
      })
      .catch(err => {
        toast.error("Network error");
        console.error(err);
      });
  }

  function cancelLocation() {
    if (!window.confirm("Are you sure you want to cancel?")) return;
    setLocationForm({ block: "", floor: "", cabinNo: "" });
    setShowLocationForm(false);
  }

  function deleteLocation(id) {
    if (!window.confirm("Are you sure you want to delete this location?")) return;
    fetch(`/api/locations/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(async res => {
        if (res.ok) {
          loadLocations();
          toast.success("Location removed");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error deleting location");
        }
      })
      .catch(err => console.error(err));
  }

  function handleDepartmentChange(e) {
    setDepartmentForm({ ...departmentForm, [e.target.name]: e.target.value });
  }

  function handleDepartmentFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setDepartmentForm({ ...departmentForm, imageFile: e.target.files[0] });
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setDepartmentForm({ ...departmentForm, imageFile: e.dataTransfer.files[0] });
    }
  }

  function addDepartment(e) {
    e.preventDefault();
    if (!departmentForm.name || !departmentForm.imageFile) {
      toast.error("Name and Image file are required");
      return;
    }
    
    const toastId = toast.loading("Uploading image and saving department...");
    
    const formData = new FormData();
    formData.append("name", departmentForm.name);
    formData.append("image", departmentForm.imageFile);

    fetch("/api/departments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.token}`
      },
      body: formData
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setDepartmentForm({ name: "", imageFile: null });
          setShowDepartmentForm(false);
          loadDepartments();
          toast.success("Department added successfully!", { id: toastId });
        } else {
          toast.error(data.message || data.error || "Error adding department", { id: toastId });
        }
      })
      .catch(err => {
        toast.error("Network error", { id: toastId });
        console.error(err);
      });
  }

  function deleteDepartment(id) {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    fetch(`/api/departments/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(async res => {
        if (res.ok) {
          loadDepartments();
          toast.success("Department removed");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error deleting department");
        }
      })
      .catch(err => console.error(err));
  }

  function handleNavChange(e) {
    setNavForm({ ...navForm, [e.target.name]: e.target.value });
  }

  function addNavLink(e) {
    e.preventDefault();
    if (!navForm.label || !navForm.url) {
      toast.error("Label and URL are required");
      return;
    }
    
    fetch("/api/nav", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ ...navForm, orderIndex: navLinks.length })
    })
      .then(async res => {
        if (res.ok) {
          setNavForm({ label: "", url: "", orderIndex: 0 });
          setShowNavForm(false);
          loadNavLinks();
          toast.success("Navigation link added!");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error adding link");
        }
      })
      .catch(err => console.error(err));
  }

  function deleteNavLink(id) {
    if (!window.confirm("Delete this navigation link?")) return;
    fetch(`/api/nav/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(async res => {
        if (res.ok) {
          loadNavLinks();
          toast.success("Link removed");
        }
      })
      .catch(err => console.error(err));
  }

  function addFaculty(e) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }

    const toastId = toast.loading("Creating account & sending invite...");

    fetch("/api/faculty", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify(form)
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setForm({ email: "", name: "", department: "", subject: "", timetableLocation: "" });
          loadFaculty();
          toast.success("Faculty added! Invitation email sent.", { id: toastId });
          setActiveTab("directory");
        } else {
          toast.error(data.message || data.error || "Error adding faculty", { id: toastId });
        }
      })
      .catch(err => {
        toast.error("Network error", { id: toastId });
        console.error(err);
      });
  }

  function deleteFaculty(id) {
    if (!window.confirm("Are you sure you want to delete this faculty?")) return;

    fetch(`/api/faculty/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${user.token}`
      }
    })
      .then(async res => {
        if (res.ok) {
          loadFaculty();
          toast.success("Faculty removed");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error deleting faculty");
        }
      })
      .catch(err => console.error(err));
  }

  function handleLogout() {
    logout();
    navigate("/admin-login");
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            <span className="icon">📊</span> Dashboard
          </button>
          <button className={activeTab === "locations" ? "active" : ""} onClick={() => setActiveTab("locations")}>
            <span className="icon">📍</span> Campus Locations
          </button>
          <button className={activeTab === "departments" ? "active" : ""} onClick={() => setActiveTab("departments")}>
            <span className="icon">🏛️</span> Departments
          </button>
          <button className={activeTab === "nav-menu" ? "active" : ""} onClick={() => setActiveTab("nav-menu")}>
            <span className="icon">🧭</span> Navigation Menu
          </button>
          <button className={activeTab === "add-faculty" ? "active" : ""} onClick={() => setActiveTab("add-faculty")}>
            <span className="icon">✉️</span> Invite Faculty
          </button>
          <button className={activeTab === "directory" ? "active" : ""} onClick={() => setActiveTab("directory")}>
            <span className="icon">👥</span> Faculty Directory
          </button>
          <button className={activeTab === "logs" ? "active" : ""} onClick={() => setActiveTab("logs")}>
            <span className="icon">📜</span> Audit Logs
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        {activeTab === "dashboard" && (
          <div className="tab-section fade-in">
            <h1>System Controls</h1>
            <p className="subtitle">Manage global application settings</p>
            <div className="premium-card control-card">
              <div className="control-info">
                <h3>Exam Mode</h3>
                <p>When enabled, all faculty locations are hidden from students to maintain exam integrity.</p>
              </div>
              <div className="control-action">
                <span className={`status-indicator ${examMode ? "active" : "inactive"}`}>
                  {examMode ? "Currently ACTIVE" : "Currently OFF"}
                </span>
                <button
                  onClick={toggleExamMode}
                  className={`toggle-btn ${examMode ? "btn-danger" : "btn-success"}`}
                >
                  {examMode ? "Disable Exam Mode" : "Enable Exam Mode"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "locations" && (
          <div className="tab-section fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0 }}>Campus Locations</h1>
                <p className="subtitle" style={{ margin: '8px 0 0 0' }}>Manage all available blocks, floors, and cabins</p>
              </div>
              {!showLocationForm && (
                <button onClick={() => setShowLocationForm(true)} className="primary-btn" style={{ padding: '10px 20px' }}>
                  + New Location
                </button>
              )}
            </div>
            
            {showLocationForm && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '500px', padding: '40px' }}>
                  <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: '#0f172a' }}>Add New Location</h2>
                  <form onSubmit={addLocation} className="modern-form">
                    <div className="form-group">
                      <label>BLOCK</label>
                      <input name="block" placeholder="e.g. Block A" value={locationForm.block} onChange={handleLocationChange} required />
                    </div>
                    <div className="form-group">
                      <label>FLOOR</label>
                      <input name="floor" placeholder="e.g. Ground Floor" value={locationForm.floor} onChange={handleLocationChange} required />
                    </div>
                    <div className="form-group">
                      <label>CABIN NO</label>
                      <input name="cabinNo" placeholder="e.g. 104" value={locationForm.cabinNo} onChange={handleLocationChange} required />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                       <button type="submit" className="primary-btn submit-btn" style={{ flex: 1, padding: '14px 24px' }}>
                          Save
                       </button>
                       <button type="button" onClick={cancelLocation} className="primary-btn" style={{ flex: 1, padding: '14px 24px', background: '#f1f5f9', color: '#475569' }}>
                          Cancel
                       </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="premium-card table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Block</th>
                    <th>Floor</th>
                    <th>Cabin No</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr><td colSpan="4" className="empty-state">No locations found</td></tr>
                  ) : (
                    locations.map(loc => (
                      <tr key={loc.id}>
                        <td className="font-medium">{loc.block}</td>
                        <td>{loc.floor}</td>
                        <td>{loc.cabinNo}</td>
                        <td>
                          <button onClick={() => deleteLocation(loc.id)} className="action-btn delete">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "departments" && (
          <div className="tab-section fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0 }}>Departments</h1>
                <p className="subtitle" style={{ margin: '8px 0 0 0' }}>Manage department cards shown on the home page</p>
              </div>
              {!showDepartmentForm && (
                <button onClick={() => setShowDepartmentForm(true)} className="primary-btn" style={{ padding: '10px 20px' }}>
                  + New Department
                </button>
              )}
            </div>
            
            {showDepartmentForm && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '500px', padding: '40px' }}>
                  <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: '#0f172a' }}>Add New Department</h2>
                  <form onSubmit={addDepartment} className="modern-form">
                    <div className="form-group">
                      <label>DEPARTMENT NAME</label>
                      <input name="name" placeholder="e.g. Computer Science" value={departmentForm.name} onChange={handleDepartmentChange} required />
                    </div>
                    <div className="form-group">
                      <label>DEPARTMENT IMAGE</label>
                      <div 
                        className={`dropzone ${isDragging ? "active" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("fileInput").click()}
                      >
                        <input 
                          id="fileInput"
                          type="file" 
                          accept="image/*" 
                          onChange={handleDepartmentFileChange} 
                          style={{ display: "none" }}
                        />
                        {departmentForm.imageFile ? (
                          <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', backgroundImage: `url(${URL.createObjectURL(departmentForm.imageFile)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        ) : (
                          <div className="dropzone-text">
                            <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📁</span>
                            <strong>Click to browse</strong> or drag and drop<br/>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>PNG, JPG, GIF up to 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                       <button type="submit" className="primary-btn submit-btn" style={{ flex: 1, padding: '14px 24px' }}>
                          Save
                       </button>
                       <button type="button" onClick={() => setShowDepartmentForm(false)} className="primary-btn" style={{ flex: 1, padding: '14px 24px', background: '#f1f5f9', color: '#475569' }}>
                          Cancel
                       </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="premium-card table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr><td colSpan="3" className="empty-state">No departments found</td></tr>
                  ) : (
                    departments.map(dept => (
                      <tr key={dept.id}>
                        <td>
                          <div style={{ width: '60px', height: '40px', borderRadius: '6px', backgroundImage: `url(${dept.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        </td>
                        <td className="font-medium" style={{ verticalAlign: 'middle' }}>{dept.name}</td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <button onClick={() => deleteDepartment(dept.id)} className="action-btn delete">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "nav-menu" && (
          <div className="tab-section fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0 }}>Navigation Menu</h1>
                <p className="subtitle" style={{ margin: '8px 0 0 0' }}>Manage the top navigation links shown on the website</p>
              </div>
              {!showNavForm && (
                <button onClick={() => setShowNavForm(true)} className="primary-btn" style={{ padding: '10px 20px' }}>
                  + Add Link
                </button>
              )}
            </div>
            
            {showNavForm && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '400px', padding: '40px' }}>
                  <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: '#0f172a' }}>Add Navigation Link</h2>
                  <form onSubmit={addNavLink} className="modern-form">
                    <div className="form-group">
                      <label>LINK LABEL</label>
                      <input name="label" placeholder="e.g. Map" value={navForm.label} onChange={handleNavChange} required />
                    </div>
                    <div className="form-group">
                      <label>URL / PATH</label>
                      <input name="url" placeholder="e.g. /map" value={navForm.url} onChange={handleNavChange} required />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                       <button type="submit" className="primary-btn submit-btn" style={{ flex: 1 }}>Save</button>
                       <button type="button" onClick={() => setShowNavForm(false)} className="primary-btn" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="premium-card table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {navLinks.length === 0 ? (
                    <tr><td colSpan="3" className="empty-state">No navigation links configured</td></tr>
                  ) : (
                    navLinks.map(link => (
                      <tr key={link.id}>
                        <td className="font-medium">{link.label}</td>
                        <td style={{ color: "var(--primary)" }}>{link.url}</td>
                        <td>
                          <button onClick={() => deleteNavLink(link.id)} className="action-btn delete">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "add-faculty" && (
          <div className="tab-section fade-in">
            <h1>Invite New Faculty</h1>
            <p className="subtitle">An auto-generated ID will be sent via email for them to set their password.</p>
            
            <div className="premium-card">
              <form onSubmit={addFaculty} className="modern-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input name="name" placeholder="Dr. John Doe" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input name="email" type="email" placeholder="faculty@university.edu" value={form.email} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input name="department" placeholder="e.g. Computer Science" value={form.department} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Subject / Specialization</label>
                    <input name="subject" placeholder="e.g. Data Structures" value={form.subject} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Default Location 📍</label>
                  <select name="timetableLocation" value={form.timetableLocation} onChange={handleChange} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem' }}>
                    <option value="" disabled>Select a location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={`${loc.block}, ${loc.floor}, Cabin ${loc.cabinNo}`}>
                        {loc.block} - {loc.floor} - Cabin {loc.cabinNo}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="primary-btn submit-btn" style={{ marginTop: '10px' }}>
                  Send Invitation Email
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "directory" && (
          <div className="tab-section fade-in">
            <h1>Faculty Directory</h1>
            <p className="subtitle">Manage all registered faculty members</p>
            
            <div className="premium-card table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.length === 0 ? (
                    <tr><td colSpan="5" className="empty-state">No faculty members found</td></tr>
                  ) : (
                    faculty.map(f => (
                      <tr key={f.id}>
                        <td className="font-mono">{f.id}</td>
                        <td className="font-medium">{f.name}</td>
                        <td>{f.department || "-"}</td>
                        <td>
                          <span className={`status-badge ${f.liveStatus?.availability === "Available" ? "available" : f.liveStatus?.availability === "Busy" ? "busy" : "offline"}`}>
                            {f.liveStatus?.availability || "Offline"}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => deleteFaculty(f.id)} className="action-btn delete">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="tab-section fade-in">
            <h1>Audit Logs</h1>
            <p className="subtitle">Recent system activity and status changes</p>
            
            <div className="premium-card logs-container">
              {logs.length === 0 ? (
                <div className="empty-state">No logs available</div>
              ) : (
                <div className="timeline">
                  {logs.map((log, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-time">{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="timeline-content">
                        <strong>{log.facultyName}</strong> performed <em>{log.action}</em>
                        {log.details?.current && (
                          <div className="timeline-details">
                            Updated to: {log.details.current.availability} @ {log.details.current.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
