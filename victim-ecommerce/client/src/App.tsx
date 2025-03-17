import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="text-2xl font-bold text-blue-600">
                E-Commerce Store
              </Link>
              <nav className="flex space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                >
                  Products
                </Link>
                <Link 
                  to="/cart" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
                >
                  Cart
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto py-8">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/cart" element={<Cart />} />
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
