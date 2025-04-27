const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Create uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Root route
app.get('/', (req, res) => {
  res.send('GiftHer API is running!');
});

// Load and use routes (minimal copies to avoid any issues)
// User routes
const userRouter = express.Router();
userRouter.post('/register', (req, res) => res.json({ message: 'Register user (mock)' }));
userRouter.post('/login', (req, res) => res.json({ message: 'Login user (mock)' }));
userRouter.get('/profile/:userId', (req, res) => res.json({ message: `Get profile for ${req.params.userId}` }));
app.use('/api/users', userRouter);

// Product routes
const productRouter = express.Router();
productRouter.get('/', (req, res) => res.json({ message: 'Get all products (mock)' }));
productRouter.get('/:productId', (req, res) => res.json({ message: `Get product ${req.params.productId}` }));
app.use('/api/products', productRouter);

// Order routes
const orderRouter = express.Router();
orderRouter.get('/', (req, res) => res.json({ message: 'Get all orders (mock)' }));
orderRouter.get('/:orderId', (req, res) => res.json({ message: `Get order ${req.params.orderId}` }));
app.use('/api/orders', orderRouter);

// Message routes
const messageRouter = express.Router();
messageRouter.get('/', (req, res) => res.json({ message: 'Get all messages (mock)' }));
messageRouter.put('/:messageId/read', (req, res) => res.json({ message: `Mark message ${req.params.messageId} as read` }));
app.use('/api/messages', messageRouter);

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 