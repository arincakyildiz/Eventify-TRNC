const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  birthdate: {
    type: Date,
    required: true
  }
}, { _id: false });

const RegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Please provide an event'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user'],
    index: true
  },
  participants: {
    type: [ParticipantSchema],
    required: [true, 'Please provide at least one participant']
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate registrations
RegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

// Index for querying user registrations
RegistrationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Registration', RegistrationSchema);

