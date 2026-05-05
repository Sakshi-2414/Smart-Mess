const express = require('express');
const r = express.Router();
const { addOrUpdateMenu, getMenu, deleteMenu } = require('../controllers/menuController');
const { protect } = require('../middleware/auth');
r.get('/', getMenu);
r.post('/', protect, addOrUpdateMenu);
r.delete('/:id', protect, deleteMenu);
module.exports = r;
