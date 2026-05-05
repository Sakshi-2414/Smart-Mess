const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating:        { type: Number, required: true, min: 1, max: 5 },
  feedback_text: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
  meal_type:     { type: String, required: true, enum: ['Breakfast','Lunch','Dinner'] },
  sentiment:     { type: String, enum: ['Positive','Negative','Neutral'], default: 'Neutral' },
  keywords:      { type: [String], default: [] },
  date:          { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

feedbackSchema.index({ date: -1 });
feedbackSchema.index({ meal_type: 1 });
feedbackSchema.index({ sentiment: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
