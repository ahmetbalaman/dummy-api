const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Business = require('../models/Business');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { verifyGoogleToken, verifyAppleToken } = require('../utils/oauth');
const { logger } = require('../utils/logger');

// Admin login
router.post('/admin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      await logger.auth(`Başarısız admin giriş denemesi: ${email}`, 'warning', {
        metadata: { email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, 'admin');

    await logger.auth(`Admin giriş yaptı: ${admin.email}`, 'success', {
      metadata: { adminId: admin._id, email: admin.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      token,
      user: {
        id: admin._id,
        role: 'admin',
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    await logger.auth(`Admin giriş hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Business login
router.post('/business', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const business = await Business.findOne({ email });
    if (!business || !(await business.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // İşletme aktif mi kontrol et - TOKEN DÖNMEDEN ÖNCE!
    if (!business.isActive) {
      return res.status(403).json({ 
        error: 'Business deactivated',
        message: 'İşletmeniz devre dışı bırakılmıştır. Lütfen destek ekibiyle iletişime geçin.',
        supportPhone: '+90 555 123 4567',
        supportEmail: 'destek@sistem.com',
        deactivated: true
      });
    }

    const token = generateToken(business._id, 'business');

    res.json({
      token,
      user: {
        id: business._id,
        role: 'business',
        businessId: business._id,
        businessName: business.name,
        email: business.email
      }
    });
  } catch (error) {
    console.error('Business login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }

    const googleData = await verifyGoogleToken(idToken);

    let user = await User.findOne({ providerId: googleData.providerId, provider: 'google' });

    if (!user) {
      user = await User.create({
        name: googleData.name,
        email: googleData.email,
        avatarUrl: googleData.avatarUrl,
        provider: 'google',
        providerId: googleData.providerId
      });
    }

    const token = generateToken(user._id, 'user');

    res.json({
      token,
      user: {
        id: user._id,
        role: 'user',
        provider: 'google',
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

// Apple Sign In
router.post('/apple', async (req, res) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Identity token required' });
    }

    const appleData = await verifyAppleToken(identityToken);

    let user = await User.findOne({ providerId: appleData.providerId, provider: 'apple' });

    if (!user) {
      user = await User.create({
        name: appleData.name,
        email: appleData.email,
        provider: 'apple',
        providerId: appleData.providerId
      });
    }

    const token = generateToken(user._id, 'user');

    res.json({
      token,
      user: {
        id: user._id,
        role: 'user',
        provider: 'apple',
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

module.exports = router;
