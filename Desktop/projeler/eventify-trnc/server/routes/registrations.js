const express = require('express');
const router = express.Router();
const {
  getMyRegistrations,
  getRegistration,
  registerForEvent,
  cancelRegistration
} = require('../controllers/registrationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMyRegistrations);
router.get('/:id', protect, getRegistration);
router.post('/', protect, registerForEvent);
router.put('/:id/cancel', protect, cancelRegistration);

module.exports = router;

