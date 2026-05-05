const express = require('express');
const r = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
r.get('/', protect, getAnalytics);
module.exports = r;
