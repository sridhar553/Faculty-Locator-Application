export default function About() {
  return (
    <div className="container" style={{ textAlign: "center", padding: "60px 20px" }}>
      <h1>About Us</h1>
      <p className="subtitle" style={{ maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
        Welcome to the Faculty Locator Application. Our mission is to seamlessly connect students and faculty members by providing real-time availability and location tracking across the campus.
      </p>
      
      <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "40px" }}>
        <div className="premium-card" style={{ flex: 1, padding: "30px", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>🎯</span>
          <h3 style={{ marginTop: "16px" }}>Our Mission</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Bridging the gap between students and educators.</p>
        </div>
        <div className="premium-card" style={{ flex: 1, padding: "30px", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>🚀</span>
          <h3 style={{ marginTop: "16px" }}>Technology</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Built with React, Supabase, and real-time websockets.</p>
        </div>
      </div>
    </div>
  );
}
