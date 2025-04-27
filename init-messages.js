/**
 * This script creates initial test messages between users and admins
 * Run it with: node init-messages.js
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
require('dotenv').config();

// Connect to the database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Find users and admins
async function findUsersAndAdmins() {
  try {
    // Find regular users
    const users = await User.find({ isAdmin: false }).limit(3);
    
    // Find admin users
    const admins = await User.find({ isAdmin: true }).limit(2);
    
    if (users.length === 0) {
      console.error('No regular users found. Please create users first.');
      process.exit(1);
    }
    
    if (admins.length === 0) {
      console.error('No admin users found. Please create admin users first.');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users and ${admins.length} admins`);
    return { users, admins };
  } catch (error) {
    console.error('Error finding users:', error);
    process.exit(1);
  }
}

// Create test messages
async function createTestMessages(users, admins) {
  try {
    let messageCount = 0;
    
    // For each user, create a message to each admin
    for (const user of users) {
      for (const admin of admins) {
        // Check if messages already exist between this user and admin
        const existingMessages = await Message.countDocuments({
          $or: [
            { sender: user._id, recipient: admin._id },
            { sender: admin._id, recipient: user._id }
          ]
        });
        
        if (existingMessages > 0) {
          console.log(`Messages already exist between ${user.name} and admin ${admin.name}`);
          continue;
        }
        
        // User message to admin
        const userMessage = new Message({
          sender: user._id,
          recipient: admin._id,
          content: `Hello, this is ${user.name}. I need help with my order.`,
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
          read: true
        });
        
        await userMessage.save();
        messageCount++;
        
        // Admin response
        const adminResponse = new Message({
          sender: admin._id,
          recipient: user._id,
          content: `Hi ${user.name}, this is ${admin.name}. How can I assist you today?`,
          createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
          read: false
        });
        
        await adminResponse.save();
        messageCount++;
      }
    }
    
    console.log(`Created ${messageCount} test messages`);
  } catch (error) {
    console.error('Error creating test messages:', error);
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    
    // Find users and admins
    const { users, admins } = await findUsersAndAdmins();
    
    // Create test messages
    await createTestMessages(users, admins);
    
    console.log('Initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 