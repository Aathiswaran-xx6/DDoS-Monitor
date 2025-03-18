import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const Cart: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use useCallback to memoize the fetchCart function so it can be used as a dependency
  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || '1';

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          navigate('/login');
          return;
        }
        throw new Error(`Failed to fetch cart: ${response.status}`);
      }
      
      const data = await response.json();
      setCartItems(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Failed to load cart. Please try again later.');
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // Use fetchCart as a dependency

  const removeFromCart = async (productId: number) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || '1';

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${userId}/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          navigate('/login');
          return;
        }
        throw new Error(`Failed to remove from cart: ${response.status}`);
      }
      
      setCartItems(cartItems.filter(item => item.id !== productId));
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert('Failed to remove item from cart. Please try again.');
    }
  };

  const updateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || '1';

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          productId,
          quantity: newQuantity,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          navigate('/login');
          return;
        }
        throw new Error(`Failed to update quantity: ${response.status}`);
      }
      
      setCartItems(
        cartItems.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity. Please try again.');
    }
  };

  const calculateItemTotal = (price: number, quantity: number): number => {
    return price * quantity;
  };

  const calculateSubtotal = (): number => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item.price, item.quantity), 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * 0.1; // Assuming 10% tax
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading cart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      {cartItems.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <p className="text-xl text-gray-600 mb-4">Your cart is empty</p>
          <a href="/" className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Continue Shopping
          </a>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                            src={`https://source.unsplash.com/random/100x100?product=${item.id}`} 
                            alt={item.name} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      ${calculateItemTotal(item.price, item.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col md:flex-row md:justify-between">
            <div className="md:w-1/2 lg:w-2/3">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 md:mb-0">
                <h2 className="text-lg font-medium mb-4">Special Instructions</h2>
                <textarea 
                  className="w-full border border-gray-300 rounded p-2"
                  rows={3}
                  placeholder="Add any special instructions or notes for your order..."
                ></textarea>
              </div>
            </div>
            
            <div className="md:w-1/2 lg:w-1/3 md:ml-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-medium mb-4">Order Summary</h2>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="flex justify-between py-2 mt-2">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
                <button className="mt-6 w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition duration-200">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart; 