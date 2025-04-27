const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const nodemailer = require('nodemailer');

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// @route   POST /api/admin/test-email
// @desc    Send a test email
// @access  Private (Admin only)
router.post('/test-email', adminAuth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Create test email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Test Email from Gifther',
      html: `
        <h1>Email Test Successful</h1>
        <p>This is a test email from the Gifther application.</p>
        <p>If you received this, your email configuration is working correctly.</p>
        <p>Time sent: ${new Date().toLocaleString()}</p>
      `
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ message: 'Error sending test email', error: error.message });
  }
});

module.exports = router; 