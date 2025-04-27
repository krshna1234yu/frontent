const OTP = require('../models/OTP');
const { sendOTP, sendMockSMS, isTwilioConfigured } = require('../services/smsService');

/**
 * Generate and send OTP for phone verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateAndSendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }
    
    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Check if there are existing OTPs for this phone number
    // and if too many have been created in the last hour (rate limiting)
    const existingOTPs = await OTP.find({ 
      phone,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    if (existingOTPs.length >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after an hour.'
      });
    }
    
    // Check if there's an existing active OTP that hasn't expired
    const existingActiveOTP = await OTP.findOne({
      phone,
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // Last 2 minutes
    });
    
    // If there's an active OTP that hasn't been used up, return error
    if (existingActiveOTP && !existingActiveOTP.isMaxAttemptsReached() && !existingActiveOTP.isExpired()) {
      // Calculate remaining time in minutes
      const createdAt = existingActiveOTP.createdAt;
      const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 1000);
      const remainingTimeMs = expiresAt - new Date();
      const remainingTimeMin = Math.ceil(remainingTimeMs / (1000 * 60));
      
      return res.status(400).json({
        success: false,
        message: `An OTP has already been sent. Please wait ${remainingTimeMin} minute(s) before requesting a new one.`,
        remainingTimeMin
      });
    }
    
    // Generate new OTP
    const otpCode = OTP.generateOTP();
    
    // Create new OTP record
    const newOTP = new OTP({
      phone,
      otp: otpCode,
      purpose: req.body.purpose || 'registration',
      ipAddress,
      userAgent
    });
    
    // Save to database
    await newOTP.save();
    
    // Determine if we're in development/test mode
    const isDev = process.env.NODE_ENV !== 'production';
    
    // Send OTP via SMS (use mock in dev or if Twilio not configured)
    let smsResult;
    if (isDev || !isTwilioConfigured()) {
      smsResult = sendMockSMS(phone, `Your GiftHer verification code is: ${otpCode}. It will expire in 2 minutes.`);
      console.log(`💡 DEV MODE - OTP for ${phone}: ${otpCode}`);
    } else {
      console.log(`Attempting to send real SMS OTP to ${phone}...`);
      smsResult = await sendOTP(phone, otpCode);
      console.log(`SMS send result:`, smsResult);
    }
    
    // Log OTP in non-production
    if (isDev) {
      console.log(`OTP generated for ${phone}: ${otpCode}`);
    }
    
    // Return success but NEVER include the OTP in the response in production
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: '2 minutes',
      // Only include the OTP in development for testing
      ...(isDev && { otp: otpCode })
    });
    
  } catch (error) {
    console.error('Error generating OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate and send OTP',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP submitted by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    // Validate inputs
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }
    
    // Find the most recent OTP record for this phone
    const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });
    
    // Check if OTP exists
    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: 'No OTP found for this phone number. Please request a new OTP.'
      });
    }
    
    // Check if OTP is already verified
    if (otpRecord.verified) {
      return res.status(400).json({
        success: false,
        message: 'This OTP has already been verified.'
      });
    }
    
    // Check if OTP is expired
    if (otpRecord.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }
    
    // Check if max attempts reached
    if (otpRecord.isMaxAttemptsReached()) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }
    
    // Increment attempt counter
    otpRecord.attempts += 1;
    
    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      await otpRecord.save(); // Save updated attempts count
      
      // Calculate remaining attempts
      const remainingAttempts = 5 - otpRecord.attempts;
      
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }
    
    // If we get here, the OTP is valid
    otpRecord.verified = true;
    await otpRecord.save();
    
    return res.status(200).json({
      success: true,
      message: 'Phone number verified successfully'
    });
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

module.exports = {
  generateAndSendOTP,
  verifyOTP
}; 