const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Business = require('../models/Business');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const KioskSession = require('../models/KioskSession');

// Get menu for a business (no auth required for kiosk)
router.get('/menu/:businessId', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.businessId)) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    const business = await Business.findById(req.params.businessId);
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const [categories, collections, productsTL, productsPoint] = await Promise.all([
      Category.find({ businessId: req.params.businessId, isActive: true }),
      Collection.find({ businessId: req.params.businessId, isActive: true }),
      ProductTL.find({ businessId: req.params.businessId, isActive: true }),
      ProductPoint.find({ businessId: req.params.businessId, isActive: true })
    ]);

    res.json({
      business: {
        id: business._id,
        name: business.name,
        logoUrl: business.logoUrl
      },
      categories,
      collections,
      productsTL,
      productsPoint
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create kiosk session
router.post('/session', async (req, res) => {
  try {
    const { businessId, qrCode } = req.body;

    if (!businessId || !qrCode) {
      return res.status(400).json({ error: 'Business ID and QR code required' });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if session already exists
    let session = await KioskSession.findOne({ qrCode });
    
    if (session) {
      // Update expiration
      session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      session.isActive = true;
      await session.save();
    } else {
      // Create new session
      session = await KioskSession.create({
        businessId,
        qrCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
    }

    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get session by QR code
router.get('/session/:qrCode', async (req, res) => {
  try {
    const session = await KioskSession.findOne({ qrCode: req.params.qrCode })
      .populate('businessId', 'name logoUrl');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return res.status(410).json({ error: 'Session expired' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close session
router.delete('/session/:qrCode', async (req, res) => {
  try {
    const session = await KioskSession.findOneAndUpdate(
      { qrCode: req.params.qrCode },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session closed', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
