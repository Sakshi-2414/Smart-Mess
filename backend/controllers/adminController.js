const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required.' });
    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET || 'smart_mess_secret', { expiresIn: '24h' });
    res.json({ success: true, message: 'Login successful!', token, admin: { username: admin.username } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getProfile = (req, res) => res.json({ success: true, admin: { username: req.admin.username } });

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both fields required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    if (!(await admin.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password incorrect.' });
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { login, getProfile, changePassword };
