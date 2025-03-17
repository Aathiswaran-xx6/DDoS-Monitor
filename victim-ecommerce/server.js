const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Sample product data (in-memory database for simplicity)
const products = [
  {
    id: 1,
    name: 'Smartphone',
    price: 699.99,
    description: 'Latest model smartphone with high-end features',
    image: 'https://via.placeholder.com/200'
  },
  {
    id: 2,
    name: 'Laptop',
    price: 1299.99,
    description: 'Powerful laptop for work and gaming',
    image: 'https://via.placeholder.com/200'
  },
  {
    id: 3,
    name: 'Headphones',
    price: 199.99,
    description: 'Wireless noise-canceling headphones',
    image: 'https://via.placeholder.com/200'
  }
];

// Routes
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// Shopping cart (in-memory)
const carts = new Map();

app.post('/api/cart', (req, res) => {
  const { userId, productId } = req.body;
  if (!carts.has(userId)) {
    carts.set(userId, []);
  }
  const cart = carts.get(userId);
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  cart.push(product);
  res.json(cart);
});

app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const cart = carts.get(userId) || [];
  res.json(cart);
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
}); 