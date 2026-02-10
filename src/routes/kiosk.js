const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Business = require('../models/Business');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const KioskSession = require('../models/KioskSession');

// Get all businesses (for kiosk setup)
router.get('/businesses', async (req, res) => {
  try {
    const businesses = await Business.find({ isActive: true })
      .select('name logoUrl description coverImageUrl')
      .sort({ name: 1 });
    
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get business by ID (for kiosk)
router.get('/businesses/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    const business = await Business.findById(req.params.id)
      .select('name logoUrl description coverImageUrl themeColor');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
        logoUrl: business.logoUrl,
        themeColor: business.themeColor || '#667eea',
        secondaryColor: business.secondaryColor || '#764ba2'
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
      .populate('businessId', 'name logoUrl')
      .populate('userId', 'name email phone loyaltyPoints');

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

// Link user to session (mobile app scans QR)
router.post('/link-session', async (req, res) => {
  try {
    const { qrCode } = req.body;
    const { protect, restrictTo } = require('../middleware/auth');

    // This endpoint requires authentication
    await new Promise((resolve, reject) => {
      protect(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      restrictTo('user')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!qrCode) {
      return res.status(400).json({ error: 'QR code required' });
    }

    const session = await KioskSession.findOne({ qrCode });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return res.status(410).json({ error: 'Session expired' });
    }

    // Link user to session
    session.userId = req.userId;
    await session.save();

    // Populate and return
    await session.populate('userId', 'name email phone loyaltyPoints');

    // 🔔 Emit socket event to kiosk (notify that user linked)
    const io = req.app.get('io');
    if (io) {
      io.to(`qr-${qrCode}`).emit('session-linked', {
        sessionId: session._id,
        userId: session.userId._id,
        userName: session.userId.name,
        userPoints: session.userId.loyaltyPoints,
        timestamp: new Date()
      });
      console.log(`🔔 Session linked event sent to qr-${qrCode}`);
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


// Create TL Order (Kiosk)
router.post('/orders/tl', async (req, res) => {
  try {
    console.log('📥 Received TL Order Request');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { businessId, sessionId, items, totalTL, totalPoints } = req.body;

    console.log('Extracted values:', { businessId, sessionId, itemsCount: items?.length, totalTL, totalPoints });

    if (!businessId || !items || items.length === 0) {
      console.error('❌ Validation failed:', { businessId: !!businessId, items: !!items, itemsLength: items?.length });
      return res.status(400).json({ error: 'Business ID and items required' });
    }

    // Validate business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get session if provided
    let userId = null;
    if (sessionId) {
      const session = await KioskSession.findById(sessionId);
      if (session && session.userId) {
        userId = session.userId;
      }
    }

    // Calculate points earned (1 TL = 1 point)
    const pointsEarned = Math.floor(totalTL || 0);

    // Create order with both TL and Point items
    const OrderTL = require('../models/OrderTL');
    const order = await OrderTL.create({
      businessId,
      userId,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName || 'Ürün',
        quantity: item.quantity,
        unitPrice: item.price || 0,
        unitPoint: item.points || 0,
        note: item.note || ''
      })),
      totalTL: totalTL || 0,
      totalPoint: totalPoints || 0,
      paymentMethod: 'kiosk',
      status: 'pending',
      pointsEarned,
      orderSource: 'kiosk'
    });

    // Update loyalty points if user exists (for TL purchases)
    if (userId && pointsEarned > 0) {
      const Loyalty = require('../models/Loyalty');
      const User = require('../models/User');
      
      let loyalty = await Loyalty.findOne({ userId, businessId });
      
      if (loyalty) {
        loyalty.points += pointsEarned;
        await loyalty.save();
      } else {
        await Loyalty.create({
          userId,
          businessId,
          points: pointsEarned
        });
      }

      // Update user's loyalty points
      await User.findByIdAndUpdate(userId, {
        $inc: { loyaltyPoints: pointsEarned }
      });
    }

    // IMPORTANT: Decrease stock and handle point deduction
    const ProductTL = require('../models/ProductTL');
    const ProductPoint = require('../models/ProductPoint');
    const User = require('../models/User');
    const Loyalty = require('../models/Loyalty');
    
    for (const item of items) {
      if (!item.productId) continue;
      
      // Check if this is a point product or TL product
      if (item.points && item.points > 0) {
        // This is a point product - deduct from ProductPoint stock
        await ProductPoint.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
        
        // Deduct points from user if userId exists
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            const pointsToDeduct = item.points * item.quantity;
            
            // Check if user has enough points
            if (user.loyaltyPoints >= pointsToDeduct) {
              user.loyaltyPoints -= pointsToDeduct;
              await user.save();
              
              // Update loyalty record
              let loyalty = await Loyalty.findOne({ userId, businessId });
              if (loyalty) {
                loyalty.points -= pointsToDeduct;
                await loyalty.save();
              }
            } else {
              console.warn(`User ${userId} doesn't have enough points for item ${item.productId}`);
            }
          }
        }
      } else {
        // This is a TL product - deduct from ProductTL stock
        await ProductTL.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // Create log entry
    const Log = require('../models/Log');
    await Log.create({
      level: 'info',
      message: `Yeni TL siparişi oluşturuldu: ${(totalTL || 0).toFixed(2)}₺`,
      category: 'order',
      businessId,
      userId,
      metadata: {
        orderId: order._id,
        totalTL: totalTL || 0,
        totalPoints: totalPoints || 0,
        pointsEarned,
        itemCount: items.length,
        orderSource: 'kiosk',
        customerName: userId ? 'Üye' : 'Misafir'
      }
    });

    // 🔔 Emit socket event to business panel
    const io = req.app.get('io');
    if (io) {
      io.to(`business-${businessId}`).emit('new-order', {
        orderId: order._id,
        totalTL: totalTL || 0,
        totalPoints: totalPoints || 0,
        itemCount: items.length,
        orderType: totalTL > 0 && totalPoints > 0 ? 'mixed' : (totalPoints > 0 ? 'point' : 'tl'),
        timestamp: new Date()
      });
      console.log(`🔔 Socket event sent to business-${businessId}`);
    }

    res.json({
      success: true,
      order,
      pointsEarned
    });
  } catch (error) {
    console.error('Create TL order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Point Order (Kiosk)
router.post('/orders/point', async (req, res) => {
  try {
    const { businessId, sessionId, items, totalPoints } = req.body;

    if (!businessId || !sessionId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Business ID, session ID and items required' });
    }

    // Validate business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get session and user
    const session = await KioskSession.findById(sessionId);
    if (!session || !session.userId) {
      return res.status(401).json({ error: 'Valid session with user required for point orders' });
    }

    const userId = session.userId;

    // Check if user has enough points
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.loyaltyPoints < totalPoints) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        required: totalPoints,
        available: user.loyaltyPoints
      });
    }

    // Create order
    const OrderPoint = require('../models/OrderPoint');
    const order = await OrderPoint.create({
      businessId,
      userId,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName || 'Ürün',
        quantity: item.quantity,
        unitPoint: item.points, // Field name: unitPoint
        note: item.note || ''
      })),
      totalPoint: totalPoints, // Field name: totalPoint
      status: 'pending',
      orderSource: 'kiosk'
    });

    // Deduct points from user
    user.loyaltyPoints -= totalPoints;
    await user.save();

    // Update loyalty record
    const Loyalty = require('../models/Loyalty');
    let loyalty = await Loyalty.findOne({ userId, businessId });
    if (loyalty) {
      loyalty.points -= totalPoints;
      await loyalty.save();
    }

    // IMPORTANT: Decrease stock for Point products
    const ProductPoint = require('../models/ProductPoint');
    for (const item of items) {
      if (item.productId) {
        await ProductPoint.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // Create log entry
    const Log = require('../models/Log');
    await Log.create({
      level: 'info',
      message: `Yeni puan siparişi oluşturuldu: ${totalPoints} puan`,
      category: 'order',
      businessId,
      userId,
      metadata: {
        orderId: order._id,
        totalPoints,
        itemCount: items.length,
        orderSource: 'kiosk',
        customerName: user.name,
        remainingPoints: user.loyaltyPoints
      }
    });

    // 🔔 Emit socket event to business panel
    const io = req.app.get('io');
    if (io) {
      io.to(`business-${businessId}`).emit('new-order', {
        orderId: order._id,
        totalPoints,
        itemCount: items.length,
        orderType: 'point',
        timestamp: new Date()
      });
      console.log(`🔔 Socket event sent to business-${businessId}`);
    }

    res.json({
      success: true,
      order,
      remainingPoints: user.loyaltyPoints
    });
  } catch (error) {
    console.error('Create point order error:', error);
    res.status(500).json({ error: error.message });
  }
});


// DEBUG: Get user by email (for testing)
router.get('/debug/user/:email', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Link user to session (simulates mobile app scanning QR)
router.post('/debug/link-session', async (req, res) => {
  try {
    const { sessionId, userEmail } = req.body;

    const User = require('../models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await KioskSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Link user to session
    session.userId = user._id;
    await session.save();

    // Populate and return
    await session.populate('userId', 'name email phone loyaltyPoints');

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Add points to user (for testing)
router.post('/debug/add-points', async (req, res) => {
  try {
    const { userEmail, points } = req.body;

    if (!userEmail || !points) {
      return res.status(400).json({ error: 'User email and points required' });
    }

    const User = require('../models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add points
    user.loyaltyPoints += points;
    await user.save();

    res.json({
      success: true,
      newPoints: user.loyaltyPoints,
      added: points
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
