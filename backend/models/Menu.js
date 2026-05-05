const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  date:      { type: String, required: true },
  meal_type: { type: String, required: true, enum: ['Breakfast','Lunch','Dinner'] },
  items:     { type: [String], required: true, validate: v => v.length > 0 },
}, { timestamps: true, versionKey: false });

menuSchema.index({ date: 1, meal_type: 1 }, { unique: true });

module.exports = mongoose.model('Menu', menuSchema);
