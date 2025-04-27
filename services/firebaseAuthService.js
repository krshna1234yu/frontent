const admin = require('../config/firebase');
const OTP = require('../models/OTP');

/**
 * Verify Firebase phone authentication token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} User data from Firebase
 */
const verifyFirebaseToken = async (idToken) => {
  try {
    console.log('Starting Firebase token verification...');
    
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Firebase token verified successfully. Details:', {
      uid: decodedToken.uid,
      hasPhoneNumber: !!decodedToken.phone_number,
      issuer: decodedToken.iss,
      authTime: new Date(decodedToken.auth_time * 1000).toISOString(),
    });
    
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    
    // Enhanced error messages based on common Firebase auth errors
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase authentication token has expired. Please authenticate again.');
    } else if (error.code === 'auth/id-token-revoked') {
      throw new Error('Firebase authentication token has been revoked. Please authenticate again.');
    } else if (error.code === 'auth/invalid-id-token') {
      throw new Error('Firebase authentication token is invalid. Please authenticate again.');
    } else if (error.code === 'auth/argument-error') {
      throw new Error('Invalid token format. Please authenticate again.');
    } else {
      throw new Error('Invalid Firebase authentication token: ' + error.message);
    }
  }
};

/**
 * Create or update a local OTP record for a completed Firebase phone verification
 * @param {string} phone - Phone number
 * @param {string} uid - Firebase UID
 * @param {string} purpose - Purpose of verification
 * @returns {Promise<Object>} OTP record
 */
const recordSuccessfulVerification = async (phone, uid, purpose = 'registration') => {
  try {
    // Format phone to standard 10-digit format
    const formattedPhone = phone.replace(/\D/g, '').slice(-10);
    console.log(`Recording verification for phone: ${formattedPhone}, Firebase UID: ${uid}`);
    
    // Find existing OTP record or create new one
    let otpRecord = await OTP.findOne({ phone: formattedPhone });
    
    if (!otpRecord) {
      // Create new OTP record
      console.log(`No existing OTP record found, creating new one for ${formattedPhone}`);
      otpRecord = new OTP({
        phone: formattedPhone,
        otp: 'firebase-verified', // We don't store actual OTP when using Firebase
        verified: true,
        purpose,
        firebaseUid: uid
      });
    } else {
      // Update existing record
      console.log(`Updating existing OTP record for ${formattedPhone}`);
      otpRecord.verified = true;
      otpRecord.firebaseUid = uid;
    }
    
    await otpRecord.save();
    console.log(`Successfully saved OTP record for ${formattedPhone}`);
    return otpRecord;
  } catch (error) {
    console.error('Error recording successful verification:', error);
    throw error;
  }
};

/**
 * Check if a phone number has been verified
 * @param {string} phone - Phone number to check
 * @returns {Promise<boolean>} Whether the phone is verified
 */
const isPhoneVerified = async (phone) => {
  try {
    // Format phone to standard 10-digit format
    const formattedPhone = phone.replace(/\D/g, '').slice(-10);
    console.log(`Checking verification status for phone: ${formattedPhone}`);
    
    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      phone: formattedPhone,
      verified: true,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });
    
    const isVerified = !!otpRecord;
    console.log(`Phone ${formattedPhone} verification status: ${isVerified ? 'Verified' : 'Not verified'}`);
    return isVerified;
  } catch (error) {
    console.error('Error checking phone verification status:', error);
    return false;
  }
};

module.exports = {
  verifyFirebaseToken,
  recordSuccessfulVerification,
  isPhoneVerified
}; 