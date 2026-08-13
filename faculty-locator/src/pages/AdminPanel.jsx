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
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [navLinks, setNavLinks] = useState([]);
  const [showNavForm, setShowNavForm] = useState(false);

  // Geofence state
  const [geofenceLat, setGeofenceLat] = useState("");
  const [geofenceLng, setGeofenceLng] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [isSavingGeofence, setIsSavingGeofence] = useState(false);

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
    cabinNo: "",
    lat: "",
    lng: ""
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
    loadAttendanceLogs();
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
          const lat = data.find(c => c.key === "collegeLatitude")?.value;
          const lng = data.find(c => c.key === "collegeLongitude")?.value;
          const rad = data.find(c => c.key === "geofenceRadius")?.value;
          if (lat) setGeofenceLat(lat);
          if (lng) setGeofenceLng(lng);
          if (rad) setGeofenceRadius(Number(rad));
        }
      })
      .catch(err => console.error(err));
  }

  async function saveGeofenceSetting(key, value) {
    return fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.token}` },
      body: JSON.stringify({ key, value: String(value) })
    });
  }

  async function saveGeofenceSettings() {
    if (!geofenceLat || !geofenceLng) {
      toast.error("Please enter valid coordinates first.");
      return;
    }
    setIsSavingGeofence(true);
    try {
      await Promise.all([
        saveGeofenceSetting("collegeLatitude", geofenceLat),
        saveGeofenceSetting("collegeLongitude", geofenceLng),
        saveGeofenceSetting("geofenceRadius", geofenceRadius)
      ]);
      toast.success("Geofence settings saved! Faculty dashboards updated automatically.");
    } catch (err) {
      toast.error("Failed to save geofence settings.");
    }
    setIsSavingGeofence(false);
  }

  function fetchAdminGPS() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return; }
    setIsFetchingGPS(true);
    toast.loading("Detecting your location...", { id: "admin-gps" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeofenceLat(pos.coords.latitude.toFixed(6));
        setGeofenceLng(pos.coords.longitude.toFixed(6));
        setIsFetchingGPS(false);
        toast.success("Location captured!", { id: "admin-gps" });
      },
      () => { setIsFetchingGPS(false); toast.error("Failed to get location.", { id: "admin-gps" }); },
      { enableHighAccuracy: true }
    );
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

  function loadAttendanceLogs() {
    fetch("/api/faculty/attendance/all", {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAttendanceLogs(data);
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

  function captureLocationGPS() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return; }
    toast.loading("Capturing GPS for this location...", { id: "loc-gps" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        toast.success(`GPS captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, { id: "loc-gps" });
      },
      () => toast.error("Failed to get GPS.", { id: "loc-gps" }),
      { enableHighAccuracy: true }
    );
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
          setLocationForm({ block: "", floor: "", cabinNo: "", lat: "", lng: "" });
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
          <button className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}>
            <span className="icon">📝</span> Attendance Register
          </button>
          <button className={activeTab === "geofence" ? "active" : ""} onClick={() => setActiveTab("geofence")}>
            <span className="icon">🗺️</span> Geofence Settings
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
                    <div className="form-group">
                      <label>GPS COORDINATES <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional but recommended)</span></label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input name="lat" placeholder="Latitude" value={locationForm.lat} onChange={handleLocationChange} style={{ flex: 1 }} />
                        <input name="lng" placeholder="Longitude" value={locationForm.lng} onChange={handleLocationChange} style={{ flex: 1 }} />
                        <button
                          type="button"
                          onClick={captureLocationGPS}
                          style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        >
                          📍 Capture
                        </button>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Stand at the location and click Capture to set GPS automatically. This helps auto-match faculty position.</p>
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
                    <th>GPS Linked</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr><td colSpan="5" className="empty-state">No locations found</td></tr>
                  ) : (
                    locations.map(loc => (
                      <tr key={loc.id}>
                        <td className="font-medium">{loc.block}</td>
                        <td>{loc.floor}</td>
                        <td>{loc.cabinNo}</td>
                        <td>{loc.lat ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ GPS Set</span> : <span style={{ color: '#94a3b8' }}>No GPS</span>}</td>
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
                    <select name="department" value={form.department} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem' }} required>
                      <option value="" disabled>Select a department...</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
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

        {activeTab === "geofence" && (
          <div className="tab-section fade-in">
            <h1>Geofence Settings</h1>
            <p className="subtitle">Set your college location and check-in radius for the attendance system</p>

            {/* Live Preview Banner */}
            {geofenceLat && geofenceLng && (
              <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>Active Geofence</p>
                  <p style={{ margin: 0, opacity: 0.85, fontSize: "0.82rem" }}>{geofenceLat}, {geofenceLng} · Radius: {geofenceRadius}m</p>
                </div>
              </div>
            )}

            <div className="premium-card" style={{ padding: "28px" }}>
              {/* GPS Auto-Detect */}
              <div style={{ marginBottom: "28px" }}>
                <label style={{ display: "block", fontWeight: 600, color: "#1e293b", marginBottom: "8px", fontSize: "0.95rem" }}>College Location</label>
                <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "0.88rem" }}>Click the button below to automatically set your current location as the college centre point, or enter the coordinates manually.</p>
                <button
                  onClick={fetchAdminGPS}
                  disabled={isFetchingGPS}
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: isFetchingGPS ? "#e2e8f0" : "#4f46e5", color: isFetchingGPS ? "#94a3b8" : "#fff", border: "none", borderRadius: "10px", padding: "12px 20px", fontWeight: 600, fontSize: "0.95rem", cursor: isFetchingGPS ? "not-allowed" : "pointer", marginBottom: "20px", transition: "all 0.2s" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  {isFetchingGPS ? "Detecting..." : "Use My Current Location"}
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Latitude</label>
                    <input
                      type="number"
                      placeholder="e.g. 13.082700"
                      value={geofenceLat}
                      onChange={e => setGeofenceLat(e.target.value)}
                      step="0.000001"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.95rem", boxSizing: "border-box", fontFamily: "monospace" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Longitude</label>
                    <input
                      type="number"
                      placeholder="e.g. 80.270700"
                      value={geofenceLng}
                      onChange={e => setGeofenceLng(e.target.value)}
                      step="0.000001"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.95rem", boxSizing: "border-box", fontFamily: "monospace" }}
                    />
                  </div>
                </div>
              </div>

              {/* Radius Slider */}
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>Check-in Radius</label>
                  <span style={{ background: "#e0e7ff", color: "#4f46e5", padding: "4px 14px", borderRadius: "50px", fontWeight: 700, fontSize: "0.9rem" }}>{geofenceRadius} m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={geofenceRadius}
                  onChange={e => setGeofenceRadius(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#4f46e5", height: "6px", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px" }}>
                  <span>50m (Strict)</span>
                  <span>1000m</span>
                  <span>2000m (Relaxed)</span>
                </div>
                <p style={{ margin: "10px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>Faculty must be within this distance from the college pin to check in.</p>
              </div>

              {/* Save Button */}
              <button
                onClick={saveGeofenceSettings}
                disabled={isSavingGeofence || !geofenceLat || !geofenceLng}
                style={{ width: "100%", padding: "14px", borderRadius: "10px", background: (!geofenceLat || !geofenceLng || isSavingGeofence) ? "#cbd5e1" : "#4f46e5", color: "#fff", border: "none", fontWeight: 700, fontSize: "1rem", cursor: (!geofenceLat || !geofenceLng || isSavingGeofence) ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: (!geofenceLat || !geofenceLng) ? "none" : "0 4px 12px rgba(79,70,229,0.3)" }}
              >
                {isSavingGeofence ? "Saving..." : "💾 Save Geofence Settings"}
              </button>
            </div>

            {/* Info Box */}
            <div style={{ marginTop: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px 20px" }}>
              <p style={{ margin: 0, color: "#166534", fontSize: "0.88rem", fontWeight: 500 }}>✅ <strong>How this works:</strong> When you save these settings, every faculty member's dashboard will automatically use these coordinates for geofence checking — no code change or re-deployment required!</p>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (() => {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          
          // Filter logs for current month
          const monthLogs = attendanceLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate.getFullYear() === year && logDate.getMonth() === month;
          });

          // Group by faculty
          const facultyMap = {};
          monthLogs.forEach(log => {
            const fid = log.facultyId;
            if (!facultyMap[fid]) {
              facultyMap[fid] = {
                id: fid,
                name: log.Faculty?.name || fid,
                department: log.Faculty?.department || 'Unknown',
                attendance: {}
              };
            }
            const day = new Date(log.date).getDate();
            facultyMap[fid].attendance[day] = true;
          });

          const facultyList = Object.values(facultyMap).sort((a, b) => a.name.localeCompare(b.name));
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <div className="tab-section fade-in">
              <h1>Monthly Attendance Register</h1>
              <p className="subtitle">View auto-detected faculty attendance formatted as a physical register.</p>

              <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 20px', borderBottom: '2px solid #e2e8f0' }}>
                  <button 
                    onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                    style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ◀ Previous
                  </button>
                  <h3 style={{ margin: 0, color: '#1e293b', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {monthName}
                  </h3>
                  <button 
                    onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                    style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Next ▶
                  </button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 10, borderBottom: '2px solid #cbd5e1' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', minWidth: '200px', borderRight: '1px solid #e2e8f0', color: '#475569' }}>Name & Department</th>
                        {daysArray.map(day => (
                          <th key={day} style={{ padding: '12px 6px', minWidth: '36px', borderRight: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {facultyList.length === 0 ? (
                        <tr>
                          <td colSpan={daysInMonth + 1} style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>No attendance records for {monthName}.</td>
                        </tr>
                      ) : (
                        facultyList.map(faculty => (
                          <tr key={faculty.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{faculty.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{faculty.department}</div>
                            </td>
                            {daysArray.map(day => (
                              <td key={day} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', background: faculty.attendance[day] ? '#d1fae5' : 'transparent' }}>
                                {faculty.attendance[day] ? <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span> : ''}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      {/* Signature Modal */}
      {selectedSignature && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setSelectedSignature(null)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Digital Signature</h3>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '10px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
              <img src={selectedSignature} alt="Faculty Signature" style={{ maxWidth: '100%', maxHeight: '200px' }} />
            </div>
            <button 
              onClick={() => setSelectedSignature(null)}
              style={{ width: '100%', padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', marginTop: '20px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
