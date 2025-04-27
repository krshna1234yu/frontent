/**
 * Standalone script to reset a user's password in MongoDB
 * This script doesn't require the server to be running
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// MongoDB connection string - set as environment variable or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gifther';

// User schema definition (simplified version from the model)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
});

// Create User model
const User = mongoose.model('User', userSchema);

// Main function to reset password
async function resetPassword() {
  try {
    // Get email from command line arguments
    const email = process.argv[2] || 'amit3834@gmail.com';
    
    // Generate a new password if not provided
    const newPassword = process.argv[3] || 'password123';
    
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Successfully connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found!`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user's password
    await User.updateOne({ email }, { $set: { password: hashedPassword } });
    
    console.log(`Password successfully reset for ${email}`);
    console.log(`New password: ${newPassword}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Execute password reset
resetPassword(); 