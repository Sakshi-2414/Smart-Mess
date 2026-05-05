const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
  }
  try {
    req.admin = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'smart_mess_secret');
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = { protect };
