const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Business = require('../models/Business');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const OrderTL = require('../models/OrderTL');
const OrderPoint = require('../models/OrderPoint');
const Loyalty = require('../models/Loyalty');

// All mobile routes require user authentication
router.use(protect, restrictTo('user'));

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: req.body.name, phone: req.body.phone },
      { new: true, runValidators: true }
    );
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all businesses
router.get('/businesses', async (req, res) => {
  try {
    const businesses = await Business.find({ isActive: true })
      .select('-password -createdAt -updatedAt');
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearby businesses (for "Yakınımdaki Restoranlar" feature)
router.get('/businesses/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query; // maxDistance in meters (default 5km)

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const businesses = await Business.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).select('-password -createdAt -updatedAt');

    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get business details
router.get('/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .select('-password');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get products
    const [productsTL, productsPoint] = await Promise.all([
      ProductTL.find({ businessId: req.params.id, isActive: true }),
      ProductPoint.find({ businessId: req.params.id, isActive: true })
    ]);

    res.json({
      ...business.toObject(),
      productsTL,
      productsPoint
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create TL order
router.post('/order-tl', async (req, res) => {
  try {
    const { businessId, items, paymentMethod } = req.body;

    if (!businessId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Business ID and items required' });
    }

    // Calculate total and validate products
    let totalTL = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await ProductTL.findById(item.productId);
      if (!product || product.businessId.toString() !== businessId) {
        return res.status(400).json({ error: `Invalid product: ${item.productId}` });
      }

      const itemTotal = product.priceTL * item.quantity;
      totalTL += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.priceTL,
        note: item.note
      });
    }

    // Calculate points earned (10% of total)
    const pointsEarned = Math.floor(totalTL * 0.1);

    // Create order
    const order = await OrderTL.create({
      businessId,
      userId: req.userId,
      items: orderItems,
      totalTL,
      paymentMethod,
      pointsEarned,
      status: 'received'
    });

    // Update loyalty points
    await Loyalty.findOneAndUpdate(
      { userId: req.userId, businessId },
      { $inc: { points: pointsEarned } },
      { upsert: true, new: true }
    );

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create Point order
router.post('/order-point', async (req, res) => {
  try {
    const { businessId, items } = req.body;

    if (!businessId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Business ID and items required' });
    }

    // Check loyalty points
    const loyalty = await Loyalty.findOne({ userId: req.userId, businessId });
    
    // Calculate total points needed
    let totalPoint = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await ProductPoint.findById(item.productId);
      if (!product || product.businessId.toString() !== businessId) {
        return res.status(400).json({ error: `Invalid product: ${item.productId}` });
      }

      const itemTotal = product.pricePoint * item.quantity;
      totalPoint += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPoint: product.pricePoint,
        note: item.note
      });
    }

    // Check if user has enough points
    if (!loyalty || loyalty.points < totalPoint) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        required: totalPoint,
        available: loyalty?.points || 0
      });
    }

    // Create order
    const order = await OrderPoint.create({
      businessId,
      userId: req.userId,
      items: orderItems,
      totalPoint,
      status: 'received'
    });

    // Deduct points
    await Loyalty.findOneAndUpdate(
      { userId: req.userId, businessId },
      { $inc: { points: -totalPoint } }
    );

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get order history
router.get('/orders-history', async (req, res) => {
  try {
    const [ordersTL, ordersPoint] = await Promise.all([
      OrderTL.find({ userId: req.userId })
        .populate('businessId', 'name logoUrl address')
        .sort('-createdAt'),
      OrderPoint.find({ userId: req.userId })
        .populate('businessId', 'name logoUrl address')
        .sort('-createdAt')
    ]);

    // Combine and sort by date
    const allOrders = [
      ...ordersTL.map(o => ({ ...o.toObject(), type: 'tl' })),
      ...ordersPoint.map(o => ({ ...o.toObject(), type: 'point' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get loyalty points for specific business
router.get('/loyalty/:businessId', async (req, res) => {
  try {
    let loyalty = await Loyalty.findOne({
      userId: req.userId,
      businessId: req.params.businessId
    });

    if (!loyalty) {
      loyalty = await Loyalty.create({
        userId: req.userId,
        businessId: req.params.businessId,
        points: 0
      });
    }

    res.json(loyalty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loyalty points
router.get('/loyalties', async (req, res) => {
  try {
    const loyalties = await Loyalty.find({ userId: req.userId })
      .populate('businessId', 'name logoUrl');
    res.json(loyalties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get point earning history
router.get('/point-earned', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = { userId: req.userId, pointsEarned: { $gt: 0 } };
    
    if (businessId) {
      query.businessId = businessId;
    }

    const orders = await OrderTL.find(query)
      .populate('businessId', 'name logoUrl')
      .select('businessId totalTL pointsEarned createdAt')
      .sort('-createdAt');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
