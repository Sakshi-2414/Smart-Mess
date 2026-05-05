const express = require('express');
const r = express.Router();
const { login, getProfile, changePassword } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
r.post('/login', login);
r.get('/profile', protect, getProfile);
r.put('/change-password', protect, changePassword);
module.exports = r;
