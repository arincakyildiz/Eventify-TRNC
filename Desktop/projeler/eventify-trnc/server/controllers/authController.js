const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationCode, sendPasswordResetEmail } = require('../utils/emailService');

// @desc    Register user (Step 1: Send verification code)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, birthdate, city, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      birthdate,
      city,
      password, // Will be hashed by pre-save hook
      verificationCode,
      verificationCodeExpires,
      emailVerified: false
    });

    // Send verification code via email
    try {
      await sendVerificationCode(user.email, verificationCode, user.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails - user can request resend
    }

    res.status(201).json({
      success: true,
      message: 'Verification code sent to email',
      data: {
        userId: user._id,
        email: user.email
        // Don't send code in response for security
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email and complete registration
// @route   POST /api/auth/verify
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    }).select('+verificationCode +verificationCodeExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        city: user.city
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-code
// @access  Public
exports.resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationCode +verificationCodeExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    // Send verification code via email
    try {
      await sendVerificationCode(user.email, verificationCode, user.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Verification code resent',
      data: {
        email: user.email
        // Don't send code in response for security
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        city: user.city
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal existence; respond success
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
    // Remove trailing slash if any before appending path
    const cleanBase = baseUrl.replace(/\/$/, '');
    const resetUrl = `${cleanBase}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // still respond success to avoid info leak
    }

    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, email, and new password are required'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

