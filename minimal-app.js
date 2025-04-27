const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// User routes
const userRouter = express.Router();
userRouter.get('/', (req, res) => res.json({ message: 'Get all users' }));
userRouter.get('/:userId', (req, res) => res.json({ message: `Get user with ID: ${req.params.userId}` }));
userRouter.post('/', (req, res) => res.json({ message: 'Create a user' }));
userRouter.put('/:userId', (req, res) => res.json({ message: `Update user with ID: ${req.params.userId}` }));
userRouter.delete('/:userId', (req, res) => res.json({ message: `Delete user with ID: ${req.params.userId}` }));

// Order routes
const orderRouter = express.Router();
orderRouter.get('/', (req, res) => res.json({ message: 'Get all orders' }));
orderRouter.get('/:orderId', (req, res) => res.json({ message: `Get order with ID: ${req.params.orderId}` }));
orderRouter.post('/', (req, res) => res.json({ message: 'Create an order' }));
orderRouter.put('/:orderId/status', (req, res) => res.json({ message: `Update status of order with ID: ${req.params.orderId}` }));

// Message routes
const messageRouter = express.Router();
messageRouter.get('/', (req, res) => res.json({ message: 'Get all messages' }));
messageRouter.put('/:messageId/read', (req, res) => res.json({ message: `Mark message with ID: ${req.params.messageId} as read` }));
messageRouter.put('/:messageId/replied', (req, res) => res.json({ message: `Mark message with ID: ${req.params.messageId} as replied` }));
messageRouter.delete('/:messageId', (req, res) => res.json({ message: `Delete message with ID: ${req.params.messageId}` }));

// Register routes
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/messages', messageRouter);

// Static folder for uploaded images
app.use('/uploads', express.static(uploadsDir));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log('All routes registered successfully!'); 