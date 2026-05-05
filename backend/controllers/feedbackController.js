const Feedback = require('../models/Feedback');
const { analyzeSentiment, extractKeywords, extractComplaintKeywords } = require('../utils/nlp');

const submitFeedback = async (req, res) => {
  try {
    const { rating, feedback_text, meal_type } = req.body;
    if (!rating || !feedback_text || !meal_type)
      return res.status(400).json({ success: false, message: 'Rating, feedback text, and meal type are required.' });
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    const { sentiment } = analyzeSentiment(feedback_text, ratingNum);
    const keywords = [...new Set([...extractKeywords(feedback_text, 10), ...extractComplaintKeywords(feedback_text)])];
    const feedback = await Feedback.create({ rating: ratingNum, feedback_text: feedback_text.trim(), meal_type, sentiment, keywords });
    res.status(201).json({ success: true, message: 'Feedback submitted successfully!', data: feedback });
  } catch (err) {
    if (err.name === 'ValidationError')
      return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join('. ') });
    console.error('submitFeedback:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const { meal_type, sentiment, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (meal_type) filter.meal_type = meal_type;
    if (sentiment) filter.sentiment = sentiment;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) { const s = new Date(startDate); if (!isNaN(s)) filter.date.$gte = s; }
      if (endDate)   { const e = new Date(endDate);   if (!isNaN(e)) { e.setHours(23,59,59,999); filter.date.$lte = e; } }
    }
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
    const total    = await Feedback.countDocuments(filter);
    const data     = await Feedback.find(filter).sort({ date: -1 }).skip((pageNum-1)*limitNum).limit(limitNum).lean();
    res.json({ success: true, total, page: pageNum, totalPages: Math.ceil(total/limitNum), data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).lean();
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });
    res.json({ success: true, data: feedback });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { submitFeedback, getAllFeedback, getFeedbackById };
