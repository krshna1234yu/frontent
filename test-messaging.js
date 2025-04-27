/**
 * This script tests the messaging functionality by:
 * 1. Creating test users (if they don't exist)
 * 2. Sending a test message from one user to another
 * 3. Retrieving conversations for each user
 * 4. Retrieving messages for a specific conversation
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Test Users
const testUsers = [
  {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'password123',
    phone: '1234567890',
    address: '123 Test Street',
  },
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    phone: '1234567890',
    address: '456 Admin Street',
    isAdmin: true,
  },
];

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// Create test users if they don't exist
async function createTestUsers() {
  console.log('Checking for test users...');
  
  const createdUsers = [];
  
  for (const userData of testUsers) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    
    if (existingUser) {
      console.log(`User ${userData.email} already exists.`);
      createdUsers.push(existingUser);
    } else {
      console.log(`Creating user ${userData.email}...`);
      
      // Create new user
      const newUser = new User(userData);
      
      // Save the user
      const savedUser = await newUser.save();
      console.log(`User ${userData.email} created.`);
      
      createdUsers.push(savedUser);
    }
  }
  
  return createdUsers;
}

// Send a test message
async function sendTestMessage(sender, recipient, content) {
  console.log(`Sending test message from ${sender.email} to ${recipient.email}...`);
  
  // Create new message
  const newMessage = new Message({
    sender: sender._id,
    recipient: recipient._id,
    content,
  });
  
  // Save the message
  const savedMessage = await newMessage.save();
  console.log('Message sent successfully.');
  
  return savedMessage;
}

// Get conversations for a user
async function getConversations(user) {
  console.log(`Getting conversations for ${user.email}...`);
  
  // Find all messages where the user is sender or recipient
  const messages = await Message.find({
    $or: [
      { sender: user._id },
      { recipient: user._id },
    ],
  }).sort({ createdAt: -1 });
  
  // Extract unique conversation partners
  const conversations = [];
  const conversationPartners = new Set();
  
  for (const message of messages) {
    const partnerId = message.sender.equals(user._id) 
      ? message.recipient.toString()
      : message.sender.toString();
    
    if (!conversationPartners.has(partnerId)) {
      conversationPartners.add(partnerId);
      
      // Get partner details
      const partner = await User.findById(partnerId);
      
      conversations.push({
        userId: partnerId,
        name: partner.name,
        email: partner.email,
        lastMessage: message.content,
        updatedAt: message.createdAt,
      });
    }
  }
  
  console.log(`Found ${conversations.length} conversations.`);
  return conversations;
}

// Get messages between two users
async function getMessages(user1, user2) {
  console.log(`Getting messages between ${user1.email} and ${user2.email}...`);
  
  // Find all messages between the two users
  const messages = await Message.find({
    $or: [
      { sender: user1._id, recipient: user2._id },
      { sender: user2._id, recipient: user1._id },
    ],
  }).sort({ createdAt: 1 })
    .populate('sender', 'name email')
    .populate('recipient', 'name email');
  
  console.log(`Found ${messages.length} messages.`);
  return messages;
}

// Run the test
async function runTest() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Create test users
    const users = await createTestUsers();
    const user = users[0];
    const admin = users[1];
    
    // Send a test message from user to admin
    const userToAdminMessage = await sendTestMessage(
      user, 
      admin, 
      'Hello admin, this is a test message from the user.'
    );
    
    // Send a test message from admin to user
    const adminToUserMessage = await sendTestMessage(
      admin, 
      user, 
      'Hello user, this is a test response from the admin.'
    );
    
    // Get conversations for user
    const userConversations = await getConversations(user);
    console.log('User conversations:', userConversations);
    
    // Get conversations for admin
    const adminConversations = await getConversations(admin);
    console.log('Admin conversations:', adminConversations);
    
    // Get messages between user and admin
    const messages = await getMessages(user, admin);
    console.log('Messages:', messages);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
}

// Run the test
runTest(); 