const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: String,
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email format validation
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  password: { 
    type: String, 
    required: true 
  },
  phone: {
    type: String,
    required: function() { return !this.isAdmin && !this.authProvider; }, // Optional for admin users and social auth
    minlength: 10, // Phone number must have exactly 10 digits
    maxlength: 10, // Phone number must have exactly 10 digits
    match: /^[0-9]{10}$/, // Only numeric digits allowed
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerifiedAt: {
    type: Date,
    default: null
  },
  address: { 
    type: String, 
    required: function() { return !this.isAdmin && !this.authProvider; } // Optional for admin users and social auth
  },
  profilePic: {
    type: String,
    default: ""
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Social authentication fields
  googleId: String,
  facebookId: String,
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Additional admin details
  adminRole: {
    type: String,
    enum: ['super-admin', 'content-manager', 'order-manager', 'customer-support'],
    default: 'content-manager'
  },
  department: {
    type: String,
    default: ''
  },
  adminSince: {
    type: Date,
    default: Date.now
  },
  adminNotes: {
    type: String,
    default: ''
  },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      qty: { type: Number, required: true }
    }
  ],
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Suspended', 'Blocked'],
    default: 'Pending'
  },
}, { timestamps: true });

// 🔐 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Password comparison method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Ensure adminRole is always set if isAdmin is true
userSchema.pre("save", function(next) {
  if (this.isAdmin && !this.adminRole) {
    this.adminRole = 'content-manager';
  }
  
  // Automatically set admin users to Active status
  if (this.isAdmin) {
    this.status = 'Active';
  }
  
  // Automatically set user to Active if email is verified
  if (this.emailVerified && this.status === 'Pending') {
    this.status = 'Active';
  }
  
  // For social logins, automatically verify email
  if ((this.googleId || this.facebookId) && this.authProvider !== 'local') {
    this.emailVerified = true;
    this.emailVerifiedAt = this.emailVerifiedAt || new Date();
  }
  
  next();
});

module.exports = mongoose.model("User", userSchema);
