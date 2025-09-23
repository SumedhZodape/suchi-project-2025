import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// Middleware to authenticate JWT token
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to authorize by role name (e.g., ['admin'])
export const authorize = (roles = []) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role_id?.toString())) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
