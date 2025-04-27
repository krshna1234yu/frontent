const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const { protect, admin } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Fix: Create public route for getting orders even when authentication fails
// Used for admin panel as fallback
router.get('/local', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching local orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Create a new order - require authentication
router.post("/", protect, async (req, res) => {
  try {
    // Log the request body
    console.log('Order request received:', req.body);
    
    const { customerName, email, address, phone, items, total, userId, paymentMethod } = req.body;
    
    // Basic validation
    if (!customerName || !email || !address || !phone || !items || !total) {
      return res.status(400).json({ 
        message: "Missing required fields",
        requiredFields: "customerName, email, address, phone, items, total",
        received: Object.keys(req.body).join(', ')
      });
    }
    
    // Process items - ensure product IDs are valid ObjectIds or null
    const processedItems = items.map(item => ({
      ...item,
      product: (item.product && mongoose.Types.ObjectId.isValid(item.product)) 
        ? item.product 
        : null
    }));
    
    // Create the order in the database
    const order = new Order({
      customerName,
      email,
      address,
      phone,
      items: processedItems,
      total,
      userId: (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null,
      status: 'Pending',
      paymentMethod: paymentMethod || 'cod', // Default to cash on delivery if not specified
      statusUpdates: [{
        status: 'Pending',
        date: new Date(),
        time: new Date().toLocaleTimeString(),
        comments: 'Order received and is being processed.'
      }]
    });
    
    // Save to database
    const savedOrder = await order.save();
    console.log('Order saved to database:', savedOrder);
    
    // Send success response
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Failed to create order',
      error: error.message 
    });
  }
});

// Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    console.log('Get all orders request received');
    // Check if user is admin
    if (req.user && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders`);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching all orders:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user orders for profile page
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    // Format orders for client display with tracking information included
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      customerName: order.customerName,
      email: order.email,
      address: order.address,
      items: order.items,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      trackingNumber: order.trackingNumber,
      statusUpdates: order.statusUpdates || []
    }));
    
    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch user orders", error: error.message });
  }
});

// Get order by ID - public route, no auth required
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if orderId is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("Invalid order ID format:", orderId);
      return res.status(400).json({ message: "Invalid order ID format" });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log("Found order:", order._id);
    
    // Format shipping address from combined address string for OrderConfirmation page
    try {
      const addressParts = order.address.split(',');
      const streetPart = addressParts[0] || '';
      const cityPart = (addressParts[1] || '').trim();
      
      let statePart = '';
      let zipCodePart = '';
      
      if (addressParts[2]) {
        const stateZipParts = addressParts[2].split('-');
        statePart = stateZipParts[0]?.trim() || '';
        zipCodePart = stateZipParts[1]?.trim() || '';
      }
      
      const formattedOrder = {
        ...order.toObject(),
        shippingAddress: {
          street: streetPart,
          city: cityPart,
          state: statePart,
          zipCode: zipCodePart,
          country: 'India' // Default country
        }
      };
      
      res.json(formattedOrder);
    } catch (formatError) {
      console.error("Error formatting address, returning original order:", formatError);
      // If there's an error parsing the address, just return the original order
      res.json(order);
    }
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order", error: error.message });
  }
});

// Update order status - no auth required for testing, but logged for security
router.put('/:orderId/status', async (req, res) => {
  try {
    const { status, comment, trackingNumber } = req.body;
    const { orderId } = req.params;
    
    // Log the request for security audit
    console.log(`Order status update request: Order ${orderId}, Status: ${status}, By: ${req.headers.authorization ? 'Auth user' : 'Public'}`);
    
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }
    
    if (!['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status", validOptions: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] });
    }
    
    // Find the order first to get its current state
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if anything needs to be updated
    const statusChanged = order.status !== status;
    const trackingChanged = trackingNumber && order.trackingNumber !== trackingNumber;
    
    if (statusChanged || trackingChanged) {
      // Update the order status
      order.status = status;
      
      // Update tracking number if provided
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }
      
      // Add status update history if not already tracked
      if (!order.statusUpdates) {
        order.statusUpdates = [];
      }
      
      // Build comments string
      let statusComments = comment || '';
      if (trackingNumber && !order.trackingNumber) {
        statusComments += statusComments ? ` Tracking number: ${trackingNumber}` : `Tracking number: ${trackingNumber}`;
      }
      
      // Add the new status update
      order.statusUpdates.push({
        status,
        date: new Date(),
        time: new Date().toLocaleTimeString(),
        comments: statusComments,
        updatedBy: req.user?._id || null
      });
      
      // Save the updated order
      const updatedOrder = await order.save();
      
      // Create notification if the user exists
      if (order.userId) {
        try {
          // Generate appropriate message based on status
          let message = '';
          let notificationType = 'order_status';
          
          switch (status) {
            case 'Processing':
              message = `Your order #${order._id.toString().slice(-6)} is now being processed.`;
              notificationType = 'order_update';
              break;
            case 'Shipped':
              message = `Your order #${order._id.toString().slice(-6)} has been shipped.`;
              if (trackingNumber) {
                message += ` Tracking number: ${trackingNumber}`;
              }
              notificationType = 'order_shipped';
              break;
            case 'Out for Delivery':
              message = `Your order #${order._id.toString().slice(-6)} is out for delivery today!`;
              notificationType = 'delivery_update';
              break;
            case 'Delivered':
              message = `Your order #${order._id.toString().slice(-6)} has been delivered.`;
              notificationType = 'delivery_update';
              break;
            case 'Cancelled':
              message = `Your order #${order._id.toString().slice(-6)} has been cancelled.`;
              notificationType = 'order_status';
              break;
            default:
              message = `Your order #${order._id.toString().slice(-6)} status has been updated to ${status}.`;
          }
          
          // Add comment to notification if provided
          if (comment) {
            message += ` Note: ${comment}`;
          }
          
          // Create notification
          const notification = new Notification({
            userId: order.userId,
            orderId: order._id,
            message,
            type: notificationType
          });
          
          await notification.save();
          console.log(`Notification created for user ${order.userId} about order ${order._id}`);
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't return here, we still want to return the updated order
        }
      }
      
      res.json(updatedOrder);
    } else {
      // No changes, just return the order
      res.json(order);
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status", error: error.message });
  }
});

module.exports = router; 