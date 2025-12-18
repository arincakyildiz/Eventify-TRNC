const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an event title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide an event description'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Please provide a city'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: ['Sports', 'Culture', 'Education', 'Environment', 'Music & Entertainment'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please provide an event date']
  },
  time: {
    type: String,
    required: [true, 'Please provide an event time'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time (HH:MM)']
  },
  location: {
    type: String,
    required: [true, 'Please provide a location'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide a capacity'],
    min: [1, 'Capacity must be at least 1']
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
EventSchema.index({ date: 1, city: 1, category: 1 });

// Virtual for available spots
EventSchema.virtual('availableSpots', {
  ref: 'Registration',
  localField: '_id',
  foreignField: 'event',
  count: true
});

module.exports = mongoose.model('Event', EventSchema);

