import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

const getImageUrl = (productId: number): string => {
  // Real images for products using Unsplash
  return `https://source.unsplash.com/random/300x200?product=${productId}`;
};

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Enhance products with better images
      const enhancedProducts = data.map((product: Product) => ({
        ...product,
        image: getImageUrl(product.id)
      }));
      
      setProducts(enhancedProducts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again later.');
      setLoading(false);
    }
  };

  const addToCart = async (productId: number) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || '1';

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          productId,
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
        throw new Error(`Failed to add to cart: ${response.status}`);
      }
      
      alert('Product added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading products...</div>
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

  // If no products from backend, show placeholders
  if (products.length === 0) {
    const placeholderProducts = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      name: `Product ${index + 1}`,
      price: (index + 1) * 9.99,
      description: 'This is a sample product description.',
      image: getImageUrl(index + 1)
    }));

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Our Products</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholderProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="relative w-full h-48 mb-4 rounded overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-4">{product.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                <button 
                  onClick={() => addToCart(product.id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Our Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="relative w-full h-48 mb-4 rounded overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/300x200?text=Product';
                }}
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
              <button
                onClick={() => addToCart(product.id)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList; 