const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");

// CREATE MESSAGE (admin to user)
exports.createAdminMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    // Validate input
    if (!recipientId || !content) {
      return res.status(400).json({ message: "Recipient ID and message content are required" });
    }
    
    // Validate recipient exists
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient ID format" });
    }
    
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }
    
    // Get admin user (usually from req.user in protected routes)
    const adminId = req.user._id;
    
    // Create and save the message
    const newMessage = new Message({
      sender: adminId,
      recipient: recipientId,
      content: content.trim(),
      read: false
    });
    
    const savedMessage = await newMessage.save();
    
    // Populate sender and recipient info for the response
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email profilePic isAdmin')
      .populate('recipient', 'name email profilePic');
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error("Admin message creation error:", err);
    res.status(400).json({ message: "Failed to send message", error: err.message });
  }
};

// GET ALL MESSAGES (for admin)
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'name email profilePic isAdmin')
      .populate('recipient', 'name email profilePic')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// GET UNREAD MESSAGES COUNT (for admin)
exports.getUnreadCount = async (req, res) => {
  try {
    // Count unread messages where the recipient is the admin
    const count = await Message.countDocuments({ 
      recipient: req.user._id,
      read: false 
    });
    res.json({ count });
  } catch (err) {
    console.error("Error counting unread messages:", err);
    res.status(500).json({ message: "Failed to count unread messages" });
  }
};

// MARK MESSAGE AS READ
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    res.json(message);
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(400).json({ message: "Failed to update message status" });
  }
};

// CREATE MESSAGE (user to admin or admin to user)
exports.createMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    // Validate input
    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient ID and message content are required' });
    }
    
    // Validate recipient exists
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID format' });
    }
    
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }
    
    // Create and save the message
    const newMessage = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim()
    });
    
    const savedMessage = await newMessage.save();
    
    // Populate sender info for the response
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email profilePic isAdmin')
      .populate('recipient', 'name email profilePic');
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// DELETE MESSAGE
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    // Verify user has permission to delete this message
    if (message.sender.toString() !== req.user._id.toString() && 
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }
    
    await Message.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(400).json({ message: "Failed to delete message" });
  }
}; 