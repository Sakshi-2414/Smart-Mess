const Menu = require('../models/Menu');

const toDateStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const addOrUpdateMenu = async (req, res) => {
  try {
    const { date, meal_type, items } = req.body;
    if (!date || !meal_type || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'Date, meal_type, and items required.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
    const cleanItems = items.map(i => String(i).trim()).filter(Boolean);
    if (!cleanItems.length) return res.status(400).json({ success: false, message: 'At least one item required.' });
    const menu = await Menu.findOneAndUpdate({ date, meal_type }, { $set: { items: cleanItems } }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, message: `${meal_type} menu for ${date} saved.`, data: menu });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Menu already exists.' });
    if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors).map(e=>e.message).join('. ') });
    console.error('addOrUpdateMenu:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getMenu = async (req, res) => {
  try {
    const dateParam = req.query.date || toDateStr(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam))
      return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
    const data = await Menu.find({ date: dateParam }).sort({ meal_type: 1 });
    res.json({ success: true, date: dateParam, data });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.id);
    if (!menu) return res.status(404).json({ success: false, message: 'Menu not found.' });
    res.json({ success: true, message: 'Menu deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { addOrUpdateMenu, getMenu, deleteMenu };
