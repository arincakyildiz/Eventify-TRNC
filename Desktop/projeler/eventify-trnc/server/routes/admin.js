const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/auth');
const { getEventRegistrations } = require('../controllers/registrationController');

router.post('/login', login);
router.get('/me', adminProtect, getMe);
router.get('/events/:eventId/registrations', adminProtect, getEventRegistrations);

module.exports = router;

