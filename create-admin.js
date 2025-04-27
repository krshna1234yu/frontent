const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
    
    // Load User model
    const User = require('./models/User');
    
    // Generate random email to avoid duplicates
    const email = `admin${Date.now()}@test.com`;
    
    // Create password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create admin user
    const admin = new User({
      name: 'Test Admin',
      email: email,
      password: hashedPassword,
      isAdmin: true,
      adminRole: 'super-admin',
      department: 'IT',
      adminNotes: 'Created directly via script'
    });
    
    // Save admin to database
    const savedAdmin = await admin.save();
    console.log('Admin created successfully:', {
      id: savedAdmin._id,
      name: savedAdmin.name,
      email: savedAdmin.email,
      isAdmin: savedAdmin.isAdmin,
      role: savedAdmin.adminRole
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createTestAdmin(); 