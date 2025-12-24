const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { adminProtect } = require('../middleware/auth');

router.get('/', getEvents);
router.get('/:id', getEvent);
router.post('/', adminProtect, createEvent);
router.put('/:id', adminProtect, updateEvent);
router.delete('/:id', adminProtect, deleteEvent);

module.exports = router;

