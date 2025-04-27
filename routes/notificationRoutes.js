const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

// Get all notifications for a user
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    // Check if the requesting user is the same as the user in the params
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to access these notifications" });
    }
    
    // Fetch notifications for the user, sorted by date (newest first)
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20); // Limit to avoid overwhelming the client
    
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

// Mark all notifications for a user as read
router.put("/user/:userId/read-all", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    // Check if the requesting user is the same as the user in the params
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to modify these notifications" });
    }
    
    // Update all unread notifications to read
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ 
      message: "All notifications marked as read", 
      modified: result.modifiedCount 
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to update notifications", error: error.message });
  }
});

// Mark a single notification as read
router.put("/notification/:notificationId/read", protect, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID format" });
    }
    
    // Find the notification
    const notification = await Notification.findById(notificationId);
    
    // Check if notification exists
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    // Check if the user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this notification" });
    }
    
    // Mark as read
    notification.isRead = true;
    await notification.save();
    
    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to update notification", error: error.message });
  }
});

module.exports = router;
