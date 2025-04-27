const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/,
    index: true
  },
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Auto-delete after 10 minutes (600 seconds)
    expires: 600,
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
    enum: ['registration', 'password-reset', 'email-change'],
    default: 'registration'
  },
  // Client information for security
  ipAddress: String,
  userAgent: String
});

// Index for quick retrieval by email
emailVerificationSchema.index({ email: 1 });

// Function to check if code is expired
emailVerificationSchema.methods.isExpired = function() {
  const now = new Date();
  const createdAt = this.createdAt;
  const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));
  
  // Consider code expired after 10 minutes
  return diffInMinutes >= 10;
};

// Function to check if max attempts reached
emailVerificationSchema.methods.isMaxAttemptsReached = function() {
  return this.attempts >= 5; // Max 5 attempts
};

// Static method to generate a new verification code
emailVerificationSchema.statics.generateCode = function() {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

module.exports = EmailVerification; 