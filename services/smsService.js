const twilio = require('twilio');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
let client;
try {
  client = twilio(accountSid, authToken);
  console.log('✅ Twilio client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
}

/**
 * Check if Twilio is properly configured
 * @returns {boolean} Whether Twilio is configured
 */
const isTwilioConfigured = () => {
  return !!(accountSid && authToken && twilioPhoneNumber && client);
};

/**
 * Format phone number to include country code if not present
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit number without country code, add Indian country code (+91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // If it already has country code but missing + prefix
  if (cleaned.length > 10 && !phoneNumber.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  // Return as is if it already has + prefix or is in an unexpected format
  return phoneNumber;
};

/**
 * Send SMS using Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - SMS content
 * @returns {Promise} Promise resolving to message details or error
 */
const sendSMS = async (to, body) => {
  // Check if Twilio is configured
  if (!isTwilioConfigured()) {
    console.warn('⚠️ Twilio is not properly configured. SMS will not be sent.');
    console.log('⚠️ Check your TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
    
    return {
      success: false,
      error: 'SMS service not configured',
      demo: true,
      message: body,
      to: to
    };
  }
  
  try {
    // Format the phone number
    const formattedPhone = formatPhoneNumber(to);
    console.log(`📱 Attempting to send SMS to formatted number: ${formattedPhone}`);
    
    // Send the SMS via Twilio
    const message = await client.messages.create({
      body: body,
      from: twilioPhoneNumber,
      to: formattedPhone
    });
    
    console.log(`✅ SMS sent to ${formattedPhone}, SID: ${message.sid}`);
    
    return {
      success: true,
      messageId: message.sid,
      to: formattedPhone
    };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error);
    console.error(`❌ Error code: ${error.code}, Status: ${error.status}, Message: ${error.message}`);
    
    if (error.code === 21211) {
      console.error('❌ This error indicates an invalid phone number format.');
    } else if (error.code === 21608) {
      console.error('❌ This error indicates the Twilio number cannot send to this destination.');
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
      code: error.code,
      to: to
    };
  }
};

/**
 * Send OTP via SMS
 * @param {string} to - Phone number to send OTP to
 * @param {string} otp - OTP code
 * @returns {Promise} Promise resolving to result of send operation
 */
const sendOTP = async (to, otp) => {
  const message = `Your GiftHer verification code is: ${otp}. This code will expire in 2 minutes. Please do not share this code with anyone.`;
  return sendSMS(to, message);
};

// For dev/test environments, provide a mock SMS sender that logs instead of sending real SMS
const sendMockSMS = (to, body) => {
  console.log(`📱 MOCK SMS to ${to}: ${body}`);
  return {
    success: true,
    demo: true,
    message: body,
    to: to
  };
};

module.exports = {
  sendSMS,
  sendOTP,
  sendMockSMS,
  isTwilioConfigured,
  formatPhoneNumber
}; 