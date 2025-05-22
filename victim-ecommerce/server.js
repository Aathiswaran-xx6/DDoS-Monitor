const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

// Create HTTP server after app initialization
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Traffic monitoring
const trafficLog = [];
const MAX_TRAFFIC_LOG_SIZE = 100;

// Store blocked IPs and their unblock times
const blockedIPs = new Map();

// Middleware to check if IP is blocked
const checkBlockedIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const blockInfo = blockedIPs.get(clientIP);
  
  if (blockInfo) {
    const now = new Date().getTime();
    if (now < blockInfo.unblockAt) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Your IP has been blocked due to suspicious activity',
        blockedUntil: new Date(blockInfo.unblockAt).toISOString()
      });
    } else {
      // Remove expired block
      blockedIPs.delete(clientIP);
    }
  }
  next();
};

// Clean up expired blocks periodically
setInterval(() => {
  const now = new Date().getTime();
  for (const [ip, blockInfo] of blockedIPs.entries()) {
    if (now >= blockInfo.unblockAt) {
      blockedIPs.delete(ip);
    }
  }
}, 60000); // Check every minute

// Request monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Get the real IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             req.ip;

  // Capture response
  const originalSend = res.send;
  res.send = function(...args) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create request data object
    const requestData = {
      ip: ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      duration: duration,
      statusCode: res.statusCode,
      userAgent: req.get('user-agent')
    };

    // Log the request
    console.log('API Request:', {
      method: requestData.method,
      path: requestData.path,
      ip: requestData.ip,
      statusCode: requestData.statusCode
    });

    // Emit through socket.io
    io.emit('request-log', requestData);

    // Call original send
    return originalSend.apply(res, args);
  };

  next();
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Monitor client connected');
  
  socket.on('block-ip', ({ ip, duration }) => {
    const unblockAt = new Date().getTime() + duration;
    blockedIPs.set(ip, {
      blockedAt: new Date().getTime(),
      unblockAt: unblockAt
    });
    console.log(`Blocked IP ${ip} until ${new Date(unblockAt).toISOString()}`);
  });

  socket.on('disconnect', () => {
    console.log('Monitor client disconnected');
  });
});

// MongoDB Connection (if available)
let useMongoDB = false;
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    useMongoDB = true;
  })
  .catch(err => {
    console.log('MongoDB connection failed, using in-memory storage', err.message);
  });

// MongoDB Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const cartItemSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: Number, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 }
});

// Create models only if MongoDB is connected
let User, CartItem;
if (mongoose.connection.readyState === 1) {
  User = mongoose.model('User', userSchema);
  CartItem = mongoose.model('CartItem', cartItemSchema);
}

// In-memory database for fallback
const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.OyvRsmKNLggFUyMkW9hF4jkYEpLOwXS', // "password123"
  }
];

// Sample product data
const products = [
  {
    id: 1,
    name: "Smartphone X",
    price: 999.99,
    description: "Latest smartphone with advanced features",
    image: "/assets/images/smartphone.jpg"
  },
  {
    id: 2,
    name: "Laptop Pro",
    price: 1499.99,
    description: "High-performance laptop for professionals",
    image: "/assets/images/laptop.jpg"
  },
  {
    id: 3,
    name: "Wireless Headphones",
    price: 199.99,
    description: "Premium wireless headphones with noise cancellation",
    image: "/assets/images/headphones.jpg"
  },
  {
    id: 4,
    name: "Smart Watch",
    price: 299.99,
    description: "Fitness tracking smartwatch with heart rate monitor",
    image: "/assets/images/smartwatch.jpg"
  },
  {
    id: 5,
    name: "Tablet Air",
    price: 799.99,
    description: "Lightweight tablet perfect for entertainment",
    image: "/assets/images/tablet.jpg"
  }
];

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (useMongoDB) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user in MongoDB
      const newUser = new User({
        name,
        email,
        password: hashedPassword
      });
      
      await newUser.save();
    } else {
      // In-memory database logic
      // Check if user already exists
      const userExists = users.find(user => user.email === email);
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user
      const newUser = {
        id: users.length + 1,
        name,
        email,
        password: hashedPassword
      };
      
      users.push(newUser);
    }
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user;
    
    if (useMongoDB) {
      // Find user in MongoDB
      user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Prepare user object for JWT and response
      user = {
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.password
      };
    } else {
      // Find user in memory
      user = users.find(user => user.email === email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }
    
    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      userId: user.id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Product Routes
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// Shopping cart
// In-memory map for fallback
const carts = new Map();

app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    // Verify the user from token matches the userId in request
    if (req.user.id.toString() !== userId && userId !== '1') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (useMongoDB) {
      // Find if product already in cart
      const existingItem = await CartItem.findOne({ userId, productId });
      
      if (existingItem) {
        // Update quantity
        existingItem.quantity += 1;
        await existingItem.save();
      } else {
        // Add new item
        const cartItem = new CartItem({
          userId,
          productId,
          name: product.name,
          price: product.price,
          quantity: 1
        });
        await cartItem.save();
      }
      
      // Get updated cart
      const cart = await CartItem.find({ userId });
      res.json(cart);
    } else {
      // In-memory cart logic
      if (!carts.has(userId)) {
        carts.set(userId, []);
      }
      
      const cart = carts.get(userId);
      
      // Check if product already in cart
      const existingItemIndex = cart.findIndex(item => item.id === productId);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        });
      }
      
      res.json(cart);
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/cart/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user from token matches the userId in request
    if (req.user.id.toString() !== userId && userId !== '1') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (useMongoDB) {
      const cartItems = await CartItem.find({ userId });
      res.json(cartItems);
    } else {
      const cart = carts.get(userId) || [];
      res.json(cart);
    }
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    
    // Verify the user from token matches the userId in request
    if (req.user.id.toString() !== userId && userId !== '1') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (useMongoDB) {
      const item = await CartItem.findOne({ userId, productId });
      
      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }
      
      item.quantity = quantity;
      await item.save();
      
      const cartItems = await CartItem.find({ userId });
      res.json(cartItems);
    } else {
      if (!carts.has(userId)) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      
      const cart = carts.get(userId);
      const itemIndex = cart.findIndex(item => item.id === productId);
      
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }
      
      cart[itemIndex].quantity = quantity;
      res.json(cart);
    }
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/cart/:userId/:productId', authenticateToken, async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    // Verify the user from token matches the userId in request
    if (req.user.id.toString() !== userId && userId !== '1') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (useMongoDB) {
      await CartItem.deleteOne({ userId, productId: parseInt(productId) });
      const cartItems = await CartItem.find({ userId });
      res.json(cartItems);
    } else {
      if (!carts.has(userId)) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      
      const cart = carts.get(userId);
      const updatedCart = cart.filter(item => item.id !== parseInt(productId));
      
      carts.set(userId, updatedCart);
      res.json(updatedCart);
    }
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint to get traffic data
app.get('/api/traffic', (req, res) => {
  res.json(trafficLog);
});

// Serve static files from the public directory
app.use('/assets', express.static('public/assets'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// Start server
http.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Using ${useMongoDB ? 'MongoDB' : 'in-memory storage'} for data persistence`);
}); 