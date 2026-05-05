require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const feedbackRoutes  = require('./routes/feedback');
const adminRoutes     = require('./routes/admin');
const menuRoutes      = require('./routes/menu');
const analyticsRoutes = require('./routes/analytics');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: `${Math.floor(process.uptime())}s` });
});

app.use('/api/feedback',  feedbackRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/menu',      menuRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT      = parseInt(process.env.PORT, 10) || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_mess';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected →', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀  Smart Mess running → http://localhost:${PORT}`);
    });
  })
  .catch(err => { console.error('❌  MongoDB failed:', err.message); process.exit(1); });

module.exports = app;
