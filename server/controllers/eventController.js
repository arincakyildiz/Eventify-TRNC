const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get all events with optional filters
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res, next) => {
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available. Please check MongoDB connection.',
        error: 'MongoDB connection state: ' + ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
      });
    }

    const { city, category, date, search, upcoming } = req.query;

    // Build query
    const query = {};

    if (city) {
      query.city = city;
    }

    if (category) {
      query.category = category;
    }

    if (date) {
      const dateObj = new Date(date);
      query.date = {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lt: new Date(dateObj.setHours(23, 59, 59, 999))
      };
    }

    if (upcoming === 'true') {
      query.date = { ...query.date, $gte: new Date() };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // If no date filter and upcoming is true, add date filter
    if (upcoming === 'true' && !date) {
      query.date = { $gte: new Date() };
    }

    const events = await Event.find(query)
      .sort({ date: 1, time: 1 })
      .populate('createdBy', 'email')
      .lean();

    // Add registration count and available spots
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const registrationCount = await Registration.countDocuments({
          event: event._id,
          status: 'active'
        });
        return {
          ...event,
          registeredCount: registrationCount,
          availableSpots: event.capacity - registrationCount,
          isFull: registrationCount >= event.capacity
        };
      })
    );

    res.status(200).json({
      success: true,
      count: eventsWithStats.length,
      data: eventsWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'email')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registrationCount = await Registration.countDocuments({
      event: event._id,
      status: 'active'
    });

    const eventWithStats = {
      ...event,
      registeredCount: registrationCount,
      availableSpots: event.capacity - registrationCount,
      isFull: registrationCount >= event.capacity
    };

    res.status(200).json({
      success: true,
      data: eventWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create event (Admin only)
// @route   POST /api/events
// @access  Private (Admin)
exports.createEvent = async (req, res, next) => {
  try {
    // Add admin ID to request body
    req.body.createdBy = req.admin.id;

    const event = await Event.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event (Admin only)
// @route   PUT /api/events/:id
// @access  Private (Admin)
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event (Admin only)
// @route   DELETE /api/events/:id
// @access  Private (Admin)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Also delete associated registrations
    await Registration.deleteMany({ event: event._id });

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

