const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Business = require('../models/Business');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on role
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else if (decoded.role === 'business') {
      user = await Business.findById(decoded.id).select('-password');
      
      // İşletme aktif mi kontrol et - HEMEN çıkış yap, başka işlem yapma
      if (user && !user.isActive) {
        return res.status(403).json({ 
          error: 'Business deactivated',
          message: 'İşletmeniz devre dışı bırakılmıştır. Lütfen destek ekibiyle iletişime geçin.',
          supportPhone: '+90 555 123 4567',
          supportEmail: 'destek@sistem.com',
          deactivated: true
        });
      }
    } else if (decoded.role === 'user') {
      user = await User.findById(decoded.id);
      
      // Kullanıcı aktif mi kontrol et
      if (user && !user.isActive) {
        return res.status(403).json({ 
          error: 'Account deactivated',
          message: 'Hesabınız usulsüzlük kullanımı saptandığı için devre dışı bırakılmıştır. Lütfen destek ekibiyle iletişime geçin.',
          supportPhone: '+90 555 123 4567',
          supportEmail: 'destek@sistem.com',
          deactivated: true
        });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = decoded.role;
    
    if (decoded.role === 'business') {
      req.businessId = user._id;
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
};
