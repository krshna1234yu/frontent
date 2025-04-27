const User = require("../models/User");
const jwt = require("jsonwebtoken");
const EmailVerification = require("../models/EmailVerification");

// Token generator
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || "7d" 
  });
};

// ✅ Register a new user
exports.registerUser = async (req, res) => {
  const { name, email, password, phone, address, emailVerificationCode } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Check if email verification code is valid
    if (emailVerificationCode) {
      const verificationRecord = await EmailVerification.findOne({ 
        email, 
        code: emailVerificationCode,
        verified: true
      });

      if (!verificationRecord) {
        return res.status(400).json({ 
          message: "Email verification failed. Please verify your email first." 
        });
      }
    }

    // Create new user
    const user = new User({ 
      name, 
      email, 
      password, 
      phone, 
      address,
      emailVerified: !!emailVerificationCode,
      emailVerifiedAt: emailVerificationCode ? new Date() : null,
      status: emailVerificationCode ? 'Active' : 'Pending'
    });
    
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        emailVerified: user.emailVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration error", error: err.message });
  }
};

// ✅ Login existing user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Check if user is active
    if (user.status === 'Suspended' || user.status === 'Blocked') {
      return res.status(403).json({ 
        message: `Your account is ${user.status.toLowerCase()}. Please contact support.`
      });
    }

    // Check if email is verified
    if (!user.emailVerified && user.status === 'Pending') {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresEmailVerification: true,
        email: user.email
      });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        emailVerified: user.emailVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login error", error: err.message });
  }
};

// Update user's email verification status
exports.verifyUserEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Find the verification record
    const verificationRecord = await EmailVerification.findOne({ 
      email,
      code,
      verified: true
    });
    
    if (!verificationRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    
    // Find the user and update verification status
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    
    // If user was pending, activate them
    if (user.status === 'Pending') {
      user.status = 'Active';
    }
    
    await user.save();
    
    const token = generateToken(user._id);
    
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Verification error", error: error.message });
  }
};
