import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#0f172a' }}>
        Welcome to Faculty Locator
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '600px', marginBottom: '40px', lineHeight: '1.6' }}>
        Instantly find your professors, check their real-time availability, and locate them across the campus with our advanced tracking system.
      </p>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <Link 
          to="/departments" 
          className="primary-btn" 
          style={{ padding: '12px 32px', fontSize: '1.1rem', borderRadius: '50px', textDecoration: 'none' }}
        >
          View Departments
        </Link>
        <Link 
          to="/map" 
          className="primary-btn" 
          style={{ padding: '12px 32px', fontSize: '1.1rem', borderRadius: '50px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', textDecoration: 'none' }}
        >
          Campus Map
        </Link>
      </div>
    </div>
  );
}
