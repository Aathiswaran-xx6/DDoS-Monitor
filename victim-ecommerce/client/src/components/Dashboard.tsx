import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface UserInfo {
  name: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user info from localStorage
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userName && userEmail) {
      setUserInfo({
        name: userName,
        email: userEmail
      });
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard</h1>
        {userInfo ? (
          <div className="mb-6">
            <p className="text-xl mb-2">Hello, <span className="font-semibold">{userInfo.name}</span>!</p>
            <p className="text-gray-600">Email: {userInfo.email}</p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">Please log in to view your dashboard.</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold mb-2">Your Recent Activity</h2>
            <p className="text-gray-600">You have no recent activity.</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h2 className="text-xl font-semibold mb-2">Your Cart</h2>
            <p className="text-gray-600 mb-3">You have items waiting in your cart.</p>
            <Link 
              to="/cart" 
              className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              View Cart
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Featured Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((id) => (
            <div key={id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="w-full h-40 bg-gray-200 mb-3 rounded-md overflow-hidden">
                <img 
                  src={`https://source.unsplash.com/random/300x200?product=${id}`} 
                  alt={`Featured product ${id}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-semibold">Featured Product {id}</h3>
              <p className="text-sm text-gray-600">Special offer for you!</p>
              <Link 
                to="/" 
                className="text-blue-500 text-sm mt-2 inline-block hover:underline"
              >
                View Products
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 