const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: false // Make it optional to allow for test products or deleted products
  },
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: String
});

// New schema for status updates
const statusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  time: String,
  comments: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const orderSchema = new mongoose.Schema({
  customerName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  phone: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  total: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  statusUpdates: [statusUpdateSchema], // Add status history tracking
  trackingNumber: String, // Add tracking number field
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'cod', 'wallet'],
    default: 'cod'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional as guest checkout is possible
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema); 