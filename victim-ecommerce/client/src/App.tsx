import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is logged in based on token in localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-2xl font-bold text-blue-600">
                E-Commerce Store
              </Link>
              <nav className="flex space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                >
                  Products
                </Link>
                {isLoggedIn ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/cart" 
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                    >
                      Cart
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                    >
                      Register
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto py-8">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/login" element={!isLoggedIn ? <Login setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!isLoggedIn ? <Register /> : <Navigate to="/dashboard" />} />
            <Route 
              path="/dashboard" 
              element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/cart" 
              element={isLoggedIn ? <Cart /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>

        <footer className="bg-white shadow-lg mt-8">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-gray-600">
              © 2024 E-Commerce Store. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
