// routes/feedback.js
const express = require('express');
const r = express.Router();
const { submitFeedback, getAllFeedback, getFeedbackById } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
r.post('/', submitFeedback);
r.get('/', protect, getAllFeedback);
r.get('/:id', protect, getFeedbackById);
module.exports = r;
