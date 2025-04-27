const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order_status', 'order_shipped', 'order_delivered', 'payment_confirmed', 'delivery_update', 'general'],
    default: 'order_status'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index for faster queries by user
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema); 