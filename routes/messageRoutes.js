const express = require("express");
const router = express.Router();
const {
  createMessage,
  getAllMessages,
  getUnreadCount,
  markAsRead,
  markAsReplied,
  deleteMessage
} = require("../controllers/messageController");
const { protect, admin } = require("../middleware/authMiddleware");
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a new message
router.post("/", protect, async (req, res) => {
  try {
    let { recipientId, content } = req.body;
    console.log(`Attempting to create message from ${req.user._id} to ${recipientId}: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    
    // Validate input
    if (!recipientId || !content) {
      console.error('Missing required fields:', { recipientId, contentLength: content?.length });
      return res.status(400).json({ message: 'Recipient ID and message content are required' });
    }
    
    // Special case: If recipientId is 'admin', find an admin user
    if (recipientId === 'admin') {
      console.log('Finding an admin user for messaging');
      const adminUser = await User.findOne({ isAdmin: true });
      
      if (!adminUser) {
        console.error('No admin users found in the system');
        return res.status(404).json({ message: 'No admin users found in the system' });
      }
      
      recipientId = adminUser._id.toString();
      console.log(`Found admin user with ID: ${recipientId}`);
    }
    
    // Validate recipient exists
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      console.error('Invalid recipient ID format:', recipientId);
      return res.status(400).json({ message: 'Invalid recipient ID format' });
    }
    
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.error('Recipient not found:', recipientId);
      return res.status(404).json({ message: 'Recipient user not found' });
    }
    
    // Convert IDs to proper ObjectIds
    const senderObjectId = mongoose.Types.ObjectId(req.user._id.toString());
    const recipientObjectId = mongoose.Types.ObjectId(recipientId);
    
    // Create and save the message
    const newMessage = new Message({
      sender: senderObjectId,
      recipient: recipientObjectId,
      content: content.trim()
    });
    
    const savedMessage = await newMessage.save();
    console.log(`Message created successfully: ${savedMessage._id}`);
    
    // Populate sender info for the response
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email profilePic')
      .populate('recipient', 'name email profilePic');
    
    // Send initialization message back if this is the first message in conversation
    // and it's from a user to an admin (or vice versa)
    const isFirstMessage = await isFirstConversationMessage(senderObjectId, recipientObjectId);
    
    if (isFirstMessage) {
      console.log('This is the first message in the conversation. Initializing conversation.');
      
      // If this is a user (not admin) messaging an admin
      if (!req.user.isAdmin && recipient.isAdmin) {
        // Schedule welcome message from admin
        setTimeout(async () => {
          try {
            const welcomeMsg = new Message({
              sender: recipientObjectId,
              recipient: senderObjectId,
              content: "Thank you for contacting support. How can I help you today?"
            });
            await welcomeMsg.save();
            console.log('Auto-welcome message created for new conversation');
          } catch (err) {
            console.error('Failed to create welcome message:', err);
          }
        }, 1000);
      }
    }
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// Helper to check if this is the first message between these users
async function isFirstConversationMessage(userId1, userId2) {
  const previousMessages = await Message.countDocuments({
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 }
    ]
  });
  
  return previousMessages <= 1; // We're checking after saving the current message, so count should be 1
}

// Get unread message count - Important: This specific route needs to be before the /:conversationId route
router.get('/unread/count', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Message.countDocuments({
      recipient: userId,
      read: false
    });
    
    res.json({ unreadCount });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Failed to fetch unread count', error: err.message });
  }
});

// Get all conversations for the current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Fetching conversations for user:', userId);
    
    // Convert userId to ObjectId only once
    const userObjectId = mongoose.Types.ObjectId(userId.toString());
    
    // Aggregate to get the latest message from each conversation
    const conversations = await Message.aggregate([
      // Find messages where the current user is either sender or recipient
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      // Sort by creation date (newest first)
      {
        $sort: { createdAt: -1 }
      },
      // Group by the conversation (the other person in the conversation)
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$content' },
          lastMessageDate: { $first: '$createdAt' },
          unread: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipient', userObjectId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          },
          messageId: { $first: '$_id' }
        }
      },
      // Lookup to get the user details (name, email, profile pic) for the other person
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      // Unwind the user details array (will always have one element)
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // Project only the fields we need
      {
        $project: {
          _id: '$messageId',
          userId: '$_id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          profilePic: '$userDetails.profilePic',
          lastMessage: 1,
          updatedAt: '$lastMessageDate',
          unread: { $gt: ['$unread', 0] }
        }
      },
      // Sort by last message date (newest first)
      {
        $sort: { updatedAt: -1 }
      }
    ]);
    
    console.log(`Found ${conversations.length} conversations for user:`, userId);
    
    // Additional logging to debug
    if (conversations.length === 0) {
      console.log('No conversations found for user:', userId);
      
      // Check if this user has any messages at all
      const messageCount = await Message.countDocuments({
        $or: [
          { sender: userObjectId },
          { recipient: userObjectId }
        ]
      });
      
      console.log(`Message count for this user: ${messageCount}`);
    } else {
      console.log('First conversation:', conversations[0]);
    }
    
    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ 
      message: 'Failed to fetch conversations', 
      error: err.message,
      errorDetails: err.stack 
    });
  }
});

// Get messages between current user and another user
router.get('/:conversationId([0-9a-fA-F]{24})', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const conversationId = req.params.conversationId;
    
    console.log(`Fetching messages between ${userId} and ${conversationId}`);
    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      console.error('Invalid conversation ID format:', conversationId);
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }
    
    // Convert IDs to ObjectId
    const userObjectId = mongoose.Types.ObjectId(userId.toString());
    const conversationObjectId = mongoose.Types.ObjectId(conversationId);
    
    // Find all messages between the two users
    const messages = await Message.find({
      $or: [
        { 
          sender: userObjectId, 
          recipient: conversationObjectId 
        },
        { 
          sender: conversationObjectId, 
          recipient: userObjectId 
        }
      ]
    })
    .populate('sender', 'name email profilePic')
    .populate('recipient', 'name email profilePic')
    .sort({ createdAt: 1 }); // Sort by creation date (oldest first)
    
    // Mark unread messages as read
    await Message.updateMany(
      { 
        sender: conversationObjectId,
        recipient: userObjectId,
        read: false
      },
      { $set: { read: true } }
    );
    
    console.log(`Found ${messages.length} messages for conversation between ${userId} and ${conversationId}`);
    
    // Additional logging to debug
    if (messages.length > 0) {
      console.log('First message excerpt:', {
        _id: messages[0]._id,
        sender: messages[0].sender._id,
        recipient: messages[0].recipient._id,
        content: messages[0].content.substring(0, 30) + (messages[0].content.length > 30 ? '...' : '')
      });
    } else {
      console.log('No messages found between these users');
      
      // Verify the users exist
      const user1 = await User.findById(userId);
      const user2 = await User.findById(conversationId);
      
      console.log('User 1 exists:', !!user1);
      console.log('User 2 exists:', !!user2);
    }
    
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

// Mark message as read
router.put('/:messageId/read', protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { read: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ message: 'Failed to mark message as read', error: err.message });
  }
});

// Delete a message
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the user is the sender or recipient of the message
    if (message.sender.toString() !== req.user._id.toString() && 
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    await Message.findByIdAndDelete(messageId);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
});

module.exports = router; 