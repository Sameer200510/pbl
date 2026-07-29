const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { 
          id: true, name: true, email: true, role: true, isVerified: true,
          studentProfile: { select: { id: true, moodleId: true } },
          facultyProfile: { select: { id: true, moodleId: true } }
        }
      });
      
      if (req.user && req.user.studentProfile) {
        req.user.studentProfileId = req.user.studentProfile.id;
      }
      if (req.user && req.user.facultyProfile) {
        req.user.facultyProfileId = req.user.facultyProfile.id;
      }
      
      if (!req.user) {
         res.status(401);
         throw new Error('Not authorized, user not found');
      }
      
      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`User role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route`));
    }
    next();
  };
};

module.exports = { protect, authorize };
