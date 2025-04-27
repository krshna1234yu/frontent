/**
 * Fixed Express Server
 * 
 * This is a simplified version of the app.js file with robust error handling
 * for path-to-regexp errors and other common issues.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// URL sanitization middleware to prevent path-to-regexp errors
app.use((req, res, next) => {
  // Check for problematic URL patterns
  const url = req.url;
  
  // List of patterns known to cause path-to-regexp errors
  const dangerousPatterns = [
    'https://', 
    'http://', 
    'git.new'
  ];
  
  // Check if any dangerous pattern is in the URL
  const hasDangerousPattern = dangerousPatterns.some(pattern => url.includes(pattern));
  
  if (hasDangerousPattern) {
    console.warn(`⚠️ Blocked potentially dangerous URL: ${url}`);
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The URL contains patterns that are not supported'
    });
  }
  
  // Continue to next middleware
  next();
});

// Static files
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// Basic route
app.get('/', (req, res) => {
  res.send('Fixed Server is working! 🎉');
});

// Add test API route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// Simple route handlers to test if the basic routing works
const userRouter = express.Router();
userRouter.get('/', (req, res) => res.json({ message: 'Get all users' }));
userRouter.get('/:userId', (req, res) => res.json({ message: `Get user with ID: ${req.params.userId}` }));
app.use('/api/users', userRouter);

const productRouter = express.Router();
productRouter.get('/', (req, res) => res.json({ message: 'Get all products' }));
productRouter.get('/:productId', (req, res) => res.json({ message: `Get product with ID: ${req.params.productId}` }));
app.use('/api/products', productRouter);

const orderRouter = express.Router();
orderRouter.get('/', (req, res) => res.json({ message: 'Get all orders' }));
orderRouter.get('/:orderId', (req, res) => res.json({ message: `Get order with ID: ${req.params.orderId}` }));
app.use('/api/orders', orderRouter);

const messageRouter = express.Router();
messageRouter.get('/', (req, res) => res.json({ message: 'Get all messages' }));
// Use a more restrictive pattern for route parameters that might cause issues
messageRouter.get('/:messageId([0-9a-fA-F]{24})', (req, res) => res.json({ 
  message: `Get message with ID: ${req.params.messageId}` 
}));
app.use('/api/messages', messageRouter);

// Catch 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check for path-to-regexp errors
  if (err.message && (
    err.message.includes('Missing parameter name') ||
    err.message.includes('Unexpected') ||
    err.message.includes('expected END'))
  ) {
    console.error('Caught path-to-regexp error:', err.message);
    return res.status(400).json({
      error: 'Invalid URL format',
      message: 'The URL format is not supported by the server'
    });
  }
  
  // Generic error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error(err.stack);
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Fixed server running on http://localhost:${PORT}`);
}); 