/**
 * Direct Admin Creation Script
 * This is a standalone script to create an admin user directly in MongoDB
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ky905037:C17k7W9Q5eBQSyjZ@cluster0.qbhquha.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Admin user configuration
const admin = {
  name: 'Admin User',
  email: 'adit@gmail.com',
  password: 'admin123', // Plain password to be hashed
  isAdmin: true,
  adminRole: 'super-admin',
  status: 'Active',
  department: 'Administration'
};

// User schema definition (simplified version from User.js model)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  adminRole: { type: String, default: 'content-manager' },
  department: { type: String, default: '' },
  adminSince: { type: Date, default: Date.now },
  adminNotes: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

// Create User model
const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB.');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: admin.email });
    if (existingAdmin) {
      console.log('Admin user already exists. Updating password and admin status...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);
      
      // Update admin user
      existingAdmin.password = hashedPassword;
      existingAdmin.isAdmin = true;
      existingAdmin.adminRole = admin.adminRole;
      existingAdmin.status = 'Active';
      
      await existingAdmin.save();
      console.log('Admin user updated successfully.');
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);
      
      // Create new admin with hashed password
      const newAdmin = new User({
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        isAdmin: true,
        adminRole: admin.adminRole,
        status: 'Active',
        department: admin.department,
        adminSince: new Date()
      });
      
      await newAdmin.save();
      console.log('New admin user created successfully.');
    }

    console.log('========================================');
    console.log('✅ ADMIN USER READY');
    console.log('----------------------------------------');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${admin.password}`);
    console.log(`Admin Role: ${admin.adminRole}`);
    console.log('========================================');
    console.log('You can now log in to the admin dashboard with these credentials.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Execute the function
createAdmin().then(() => {
  console.log('Admin creation script completed.');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 