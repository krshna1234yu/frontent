const EmailVerification = require('../models/EmailVerification');
const { sendVerificationEmail, sendMockEmail } = require('../services/emailService');

/**
 * Generate and send verification code via email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateAndSendVerificationCode = async (req, res) => {
  try {
    console.log('Email verification request received:', req.body);
    const { email } = req.body;
    
    // Validate email format
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Check if too many codes have been sent to this email in the last hour (rate limiting)
    const existingCodes = await EmailVerification.find({ 
      email,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    if (existingCodes.length >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again after an hour.'
      });
    }
    
    // Check if there's an existing active code that hasn't expired
    const existingActiveCode = await EmailVerification.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });
    
    // If there's an active code that hasn't been used up, return error
    if (existingActiveCode && !existingActiveCode.isMaxAttemptsReached() && !existingActiveCode.isExpired()) {
      // Calculate remaining time in minutes
      const createdAt = existingActiveCode.createdAt;
      const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
      const remainingTimeMs = expiresAt - new Date();
      const remainingTimeMin = Math.ceil(remainingTimeMs / (1000 * 60));
      
      console.log(`Active verification code exists for ${email}, expires in ${remainingTimeMin} minutes`);
      
      return res.status(400).json({
        success: false,
        message: `A verification code has already been sent. Please wait ${remainingTimeMin} minute(s) before requesting a new one or check your spam folder.`,
        remainingTimeMin
      });
    }
    
    // Generate new verification code
    const verificationCode = EmailVerification.generateCode();
    console.log(`Generated new verification code for ${email}: ${verificationCode}`);
    
    // Create new verification record
    const newVerification = new EmailVerification({
      email,
      code: verificationCode,
      purpose: req.body.purpose || 'registration',
      ipAddress,
      userAgent
    });
    
    // Save to database
    await newVerification.save();
    console.log(`Saved verification code to database for ${email}`);
    
    // Determine if we're in development/test mode
    const isDev = process.env.NODE_ENV !== 'production';
    console.log(`Running in ${isDev ? 'development' : 'production'} mode`);
    
    // Send verification email
    let emailResult;
    if (isDev) {
      emailResult = sendMockEmail(email, verificationCode);
      console.log(`💡 DEV MODE - Verification code for ${email}: ${verificationCode}`);
    } else {
      console.log(`Sending real verification email to ${email}`);
      emailResult = await sendVerificationEmail(email, verificationCode);
      
      if (!emailResult.success) {
        console.error(`Failed to send verification email to ${email}:`, emailResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.'
        });
      }
    }
    
    // Return success but NEVER include the code in the response in production
    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully. Please check your inbox and spam folder.',
      expiresIn: '10 minutes',
      // Only include the code in development for testing
      ...(isDev && { code: verificationCode })
    });
    
  } catch (error) {
    console.error('Error generating verification code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate and send verification code',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Verify email code submitted by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyEmailCode = async (req, res) => {
  try {
    console.log('Email verification attempt:', req.body);
    const { email, code } = req.body;
    
    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }
    
    // Find the most recent verification record for this email
    const verificationRecord = await EmailVerification.findOne({ email }).sort({ createdAt: -1 });
    
    // Check if verification record exists
    if (!verificationRecord) {
      console.log(`No verification record found for email: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'No verification code found for this email. Please request a new code.'
      });
    }
    
    console.log(`Found verification record for ${email}, stored code: ${verificationRecord.code}, provided code: ${code}`);
    
    // Check if code is already verified
    if (verificationRecord.verified) {
      return res.status(400).json({
        success: false,
        message: 'This code has already been verified.'
      });
    }
    
    // Check if code is expired
    if (verificationRecord.isExpired()) {
      console.log(`Verification code expired for ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }
    
    // Check if max attempts reached
    if (verificationRecord.isMaxAttemptsReached()) {
      console.log(`Max verification attempts reached for ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new verification code.'
      });
    }
    
    // Increment attempt counter
    verificationRecord.attempts += 1;
    
    // Check if code matches
    if (verificationRecord.code !== code) {
      console.log(`Invalid verification code for ${email} - attempt ${verificationRecord.attempts}/5`);
      await verificationRecord.save(); // Save updated attempts count
      
      // Calculate remaining attempts
      const remainingAttempts = 5 - verificationRecord.attempts;
      
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }
    
    // If we get here, the code is valid
    console.log(`Email verification successful for ${email}`);
    verificationRecord.verified = true;
    await verificationRecord.save();
    
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Error verifying email code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email code',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

module.exports = {
  generateAndSendVerificationCode,
  verifyEmailCode
}; 