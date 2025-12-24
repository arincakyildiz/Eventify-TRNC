const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Get user's registrations
// @route   GET /api/registrations
// @access  Private
exports.getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      user: req.user.id,
      status: 'active'
    })
      .populate('event')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Private
exports.getRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if user owns this registration or is admin
    if (registration.user._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this registration'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for event
// @route   POST /api/registrations
// @access  Private
exports.registerForEvent = async (req, res, next) => {
  try {
    const { eventId, participants } = req.body;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is in the past
    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: req.user.id,
      status: 'active'
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Check available capacity
    const registrationCount = await Registration.countDocuments({
      event: eventId,
      status: 'active'
    });

    const totalParticipants = participants ? participants.length : 1;
    if (registrationCount + totalParticipants > event.capacity) {
      return res.status(400).json({
        success: false,
        message: `Event is full. Only ${event.capacity - registrationCount} spots available`
      });
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      user: req.user.id,
      participants: participants || [{
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        birthdate: req.user.birthdate
      }]
    });

    await registration.populate('event');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel registration
// @route   PUT /api/registrations/:id/cancel
// @access  Private
exports.cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if user owns this registration
    if (registration.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled'
      });
    }

    registration.status = 'cancelled';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event registrations (Admin only)
// @route   GET /api/admin/events/:eventId/registrations
// @access  Private (Admin)
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      event: req.params.eventId,
      status: 'active'
    })
      .populate('user', 'name email phone city')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

