/**
 * Admin Password Reset Utility
 * This script creates or updates an admin user with the specified email and password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Get MongoDB URI from environment or use default
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gifther';

// Admin credentials to set
const adminEmail = 'adit@gmail.com';  // Change this to your admin email
const adminPassword = 'password123';  // Change this to your desired password

// Import User model - path may need adjustment
const User = require('./models/User');

async function resetAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully!');
    
    // Find the admin user or create if not exists
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log(`Creating new admin user with email: ${adminEmail}`);
      
      adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        isAdmin: true,
        status: 'Active',
        createdAt: new Date()
      });
    } else {
      console.log(`Found existing user with email: ${adminEmail}`);
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Update the user's password and ensure they're an admin
    adminUser.password = hashedPassword;
    adminUser.isAdmin = true;
    
    // Save the user
    await adminUser.save();
    
    console.log('========================================');
    console.log('✅ Admin password reset successfully!');
    console.log('----------------------------------------');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('========================================');
    console.log('You can now log in to the admin dashboard with these credentials.');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
resetAdminPassword(); 