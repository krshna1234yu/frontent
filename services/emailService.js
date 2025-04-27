/**
 * Email Service - Dummy Implementation
 * 
 * This is a placeholder implementation that doesn't actually send emails
 * but prevents errors from occurring when the service is referenced.
 */

const sendVerificationEmail = async (email, token) => {
  console.log('📧 [MOCK] Verification email would be sent to:', email);
  console.log('Token:', token);
  return { success: true, message: 'Verification email mock successful' };
};

const sendPasswordResetEmail = async (email, token) => {
  console.log('📧 [MOCK] Password reset email would be sent to:', email);
  console.log('Token:', token);
  return { success: true, message: 'Password reset email mock successful' };
};

const sendOrderConfirmationEmail = async (email, orderDetails) => {
  console.log('📧 [MOCK] Order confirmation email would be sent to:', email);
  console.log('Order details:', JSON.stringify(orderDetails, null, 2));
  return { success: true, message: 'Order confirmation email mock successful' };
};

const sendContactFormEmail = async (name, email, message) => {
  console.log('📧 [MOCK] Contact form email would be sent:');
  console.log('From:', name, email);
  console.log('Message:', message);
  return { success: true, message: 'Contact form email mock successful' };
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendContactFormEmail
}; 