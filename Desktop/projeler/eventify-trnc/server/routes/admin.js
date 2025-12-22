const express = require('express');
const router = express.Router();
const { login, getMe, getAllUsers, deleteUser } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/auth');
const { getEventRegistrations } = require('../controllers/registrationController');

router.post('/login', login);
router.get('/me', adminProtect, getMe);
router.get('/users', adminProtect, getAllUsers);
router.delete('/users/:userId', adminProtect, deleteUser);
router.get('/events/:eventId/registrations', adminProtect, getEventRegistrations);

module.exports = router;

