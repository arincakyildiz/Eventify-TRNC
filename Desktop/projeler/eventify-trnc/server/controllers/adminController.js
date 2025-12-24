const Admin = require('../models/Admin');
const User = require('../models/User');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = admin.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      data: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current admin
// @route   GET /api/admin/me
// @access  Private (Admin)
exports.getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password -verificationCode -verificationCodeExpires').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

