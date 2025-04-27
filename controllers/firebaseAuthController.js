const { verifyFirebaseToken, recordSuccessfulVerification, isPhoneVerified } = require('../services/firebaseAuthService');

/**
 * Verify a Firebase phone authentication token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyFirebasePhone = async (req, res) => {
  try {
    console.log('Received Firebase phone verification request:', { 
      phoneProvided: !!req.body.phone,
      tokenProvided: !!req.body.idToken,
      purpose: req.body.purpose 
    });
    
    const { idToken, phone } = req.body;
    
    // Validate inputs
    if (!idToken || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token and phone number are required'
      });
    }
    
    // Verify Firebase token
    console.log('Verifying Firebase ID token...');
    const decodedToken = await verifyFirebaseToken(idToken);
    console.log('Token verified successfully. User UID:', decodedToken.uid);
    console.log('Token phone number:', decodedToken.phone_number);
    
    // Check if the phone number in the token matches the one provided
    // Note: Firebase phone_number includes country code (+91)
    if (!decodedToken.phone_number) {
      console.error('No phone number in decoded token');
      return res.status(400).json({
        success: false,
        message: 'Firebase token does not contain a verified phone number'
      });
    }
    
    // Normalize phone numbers for comparison
    const tokenPhone = decodedToken.phone_number.replace(/\D/g, '');
    const requestPhone = phone.replace(/\D/g, '');
    
    console.log('Comparing phone numbers:', {
      tokenPhone: decodedToken.phone_number,
      requestPhone: phone,
      tokenPhoneDigits: tokenPhone,
      requestPhoneDigits: requestPhone
    });
    
    // Check if one contains the other (to handle country code differences)
    if (!tokenPhone.includes(requestPhone.slice(-10)) && !requestPhone.includes(tokenPhone.slice(-10))) {
      console.error('Phone number mismatch');
      return res.status(400).json({
        success: false,
        message: 'Phone number does not match the one verified by Firebase'
      });
    }
    
    // Record successful verification in our database
    console.log('Recording successful verification in database...');
    await recordSuccessfulVerification(phone, decodedToken.uid, req.body.purpose || 'registration');
    
    return res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number
    });
  } catch (error) {
    console.error('Error verifying Firebase phone auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify phone authentication',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Check phone verification status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkPhoneVerification = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    // Check if phone is verified
    const verified = await isPhoneVerified(phone);
    
    return res.status(200).json({
      success: true,
      verified
    });
  } catch (error) {
    console.error('Error checking phone verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check phone verification status',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

module.exports = {
  verifyFirebasePhone,
  checkPhoneVerification
}; 