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

    // First try to find by providerId and provider
    let user = await User.findOne({ providerId: googleData.providerId, provider: 'google' });

    // If not found, check if user exists with same email (from different provider)
    if (!user) {
      user = await User.findOne({ email: googleData.email });
      
      if (user) {
        // Update existing user with Google provider info
        user.provider = 'google';
        user.providerId = googleData.providerId;
        user.avatarUrl = googleData.avatarUrl || user.avatarUrl;
        user.name = googleData.name || user.name;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          name: googleData.name,
          email: googleData.email,
          avatarUrl: googleData.avatarUrl,
          provider: 'google',
          providerId: googleData.providerId
        });
      }
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
    console.log('🍎 Apple Sign In isteği alındı');
    console.log('🍎 Request body:', JSON.stringify(req.body, null, 2));
    
    const { identityToken } = req.body;

    if (!identityToken) {
      console.log('❌ Identity token bulunamadı');
      return res.status(400).json({ error: 'Identity token required' });
    }

    console.log('🍎 Identity token doğrulanıyor...');
    const appleData = await verifyAppleToken(identityToken);
    console.log('🍎 Apple data:', JSON.stringify(appleData, null, 2));

    // First try to find by providerId and provider
    let user = await User.findOne({ providerId: appleData.providerId, provider: 'apple' });

    // If not found, check if user exists with same email (from different provider)
    if (!user) {
      user = await User.findOne({ email: appleData.email });
      
      if (user) {
        // Update existing user with Apple provider info
        user.provider = 'apple';
        user.providerId = appleData.providerId;
        user.name = appleData.name || user.name;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          name: appleData.name,
          email: appleData.email,
          provider: 'apple',
          providerId: appleData.providerId
        });
      }
    }

    const token = generateToken(user._id, 'user');

    console.log('✅ Apple Sign In başarılı, token oluşturuldu');
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
    console.error('❌ Apple auth error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

// Debug login (Development only - bypasses OAuth)
router.post('/debug-login', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug login not available in production' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find or create test user
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please run seed script first.' });
    }

    const token = generateToken(user._id, 'user');

    res.json({
      token,
      user: {
        id: user._id,
        role: 'user',
        provider: user.provider,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        loyaltyPoints: user.loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

module.exports = router;
