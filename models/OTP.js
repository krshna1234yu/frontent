const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/, // Validates for 10-digit phone numbers
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Auto-delete after 2 minutes (120 seconds)
    expires: 120,
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password-reset', 'profile-update'],
    default: 'registration'
  },
  // Add Firebase Authentication fields
  firebaseUid: String,
  firebaseVerified: {
    type: Boolean,
    default: false
  },
  // Client information for security
  ipAddress: String,
  userAgent: String
});

// Index for quick retrieval by phone number
otpSchema.index({ phone: 1 });

// Function to check if OTP is expired
otpSchema.methods.isExpired = function() {
  const now = new Date();
  const createdAt = this.createdAt;
  const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));
  
  // Consider OTP expired after 2 minutes
  return diffInMinutes >= 2;
};

// Function to check if max attempts reached
otpSchema.methods.isMaxAttemptsReached = function() {
  return this.attempts >= 5; // Max 5 attempts
};

// Static method to generate a new OTP
otpSchema.statics.generateOTP = function() {
  // Generate a random 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP; 