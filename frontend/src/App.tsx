import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import EcommerceMonitor from './components/EcommerceMonitor';
import './App.css';

// Set up axios defaults
axios.defaults.baseURL = 'http://localhost:8080';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (token && storedUsername) {
      // Set up axios auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
    
    setLoading(false);
  }, []);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      // For demo purposes, accept any credentials
      if (credentials.username && credentials.password) {
        // Simulate a token
        const token = `demo-token-${Date.now()}`;
        
        // Store token in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('username', credentials.username);
        
        // Set up axios auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setIsAuthenticated(true);
        setUsername(credentials.username);
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    
    // Remove axios auth header
    delete axios.defaults.headers.common['Authorization'];
    
    setIsAuthenticated(false);
    setUsername('');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <EcommerceMonitor username={username} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 