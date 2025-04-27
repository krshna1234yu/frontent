/**
 * Password Reset Utility Script
 * 
 * Usage:
 * node scripts/reset-password.js <email> <newPassword>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/gifther";

// Import User model
const User = require('../models/User');

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.js <email> <newPassword>');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('Error: Password must be at least 6 characters long');
  process.exit(1);
}

// Function to reset password
async function resetPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`Error: User with email ${email} not found`);
      process.exit(1);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    console.log(`Password reset successfully for user: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Execute password reset
resetPassword(); 