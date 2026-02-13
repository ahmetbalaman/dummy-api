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
const Collection = require('../models/Collection');
const CollectionSet = require('../models/CollectionSet');

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

// Get products by collection
router.get('/products/point', async (req, res) => {
  try {
    const { collectionId } = req.query;

    if (!collectionId) {
      return res.status(400).json({ error: 'Collection ID required' });
    }

    const products = await ProductPoint.find({ 
      collectionId,
      isActive: true 
    }).sort('createdAt');

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get nearby businesses (within radius)
router.get('/businesses/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km, default 10km

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1000;

    // MongoDB geospatial query
    const businesses = await Business.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).select('-password -createdAt -updatedAt');

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

    // Calculate points earned (10% of total) - but don't add yet
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

    // Puanlar sipariş tamamlandığında verilecek (completed durumunda)
    // await Loyalty.findOneAndUpdate(...) - KALDIRILDI

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
      const product = await ProductPoint.findById(item.productId).populate('collectionId');
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
        collectionId: product.collectionId?._id,
        collectionName: product.collectionId?.name,
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

// Get user's collections
router.get('/collections', async (req, res) => {
  try {
    const UserCollection = require('../models/UserCollection');
    
    // Kullanıcının UserCollection kayıtlarını getir
    const userCollections = await UserCollection.find({ userId: req.userId })
      .populate('collectionId')
      .sort('-createdAt');

    // Eğer UserCollection kayıtları varsa direkt döndür
    if (userCollections.length > 0) {
      return res.json({ collections: userCollections });
    }

    // UserCollection kayıtları yoksa, kullanıcının tamamlanmış siparişlerinden koleksiyonları bul
    const completedOrders = await OrderPoint.find({
      userId: req.userId,
      status: 'completed'
    }).select('items');

    // Koleksiyonları topla
    const collectionIds = new Set();
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.collectionId) {
          collectionIds.add(item.collectionId.toString());
        }
      });
    });

    // Eğer hiç koleksiyon yoksa boş array döndür
    if (collectionIds.size === 0) {
      return res.json({ collections: [] });
    }

    // Her koleksiyon için UserCollection kaydı oluştur
    const newUserCollections = [];
    for (const collectionId of collectionIds) {
      // Koleksiyondaki toplam ürün sayısını hesapla
      const totalProducts = await ProductPoint.countDocuments({
        collectionId: collectionId,
        isActive: true
      });

      // Kullanıcının bu koleksiyondan kaç ürünü olduğunu hesapla
      let currentCount = 0;
      completedOrders.forEach(order => {
        order.items.forEach(item => {
          if (item.collectionId && item.collectionId.toString() === collectionId) {
            currentCount += item.quantity;
          }
        });
      });

      // UserCollection kaydı oluştur
      const userCollection = await UserCollection.create({
        userId: req.userId,
        collectionId: collectionId,
        currentCount: currentCount,
        targetCount: totalProducts || 10,
        isCompleted: currentCount >= totalProducts,
        completedAt: currentCount >= totalProducts ? new Date() : null
      });

      await userCollection.populate('collectionId');
      newUserCollections.push(userCollection);
    }

    res.json({ collections: newUserCollections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get collection details with all products
router.get('/collections/:collectionId/details', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const UserCollection = require('../models/UserCollection');
    
    // Koleksiyonu getir
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Kullanıcının bu koleksiyondaki ilerlemesini getir
    const userCollection = await UserCollection.findOne({
      userId: req.userId,
      collectionId: collectionId
    });

    // Koleksiyondaki tüm ürünleri getir
    const allProducts = await ProductPoint.find({
      collectionId: collectionId,
      isActive: true
    }).sort('name');

    // Kullanıcının sahip olduğu ürünleri işaretle
    // (Sipariş geçmişinden kontrol et - completed siparişler)
    const completedOrders = await OrderPoint.find({
      userId: req.userId,
      status: 'completed'
    }).select('items');

    // Kullanıcının aldığı ürünleri topla
    const userProductCounts = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.collectionId && item.collectionId.toString() === collectionId) {
          const productId = item.productId.toString();
          userProductCounts[productId] = (userProductCounts[productId] || 0) + item.quantity;
        }
      });
    });

    // Ürünleri kullanıcının sahiplik durumu ile birlikte döndür
    const productsWithOwnership = allProducts.map(product => ({
      ...product.toObject(),
      owned: userProductCounts[product._id.toString()] > 0,
      ownedCount: userProductCounts[product._id.toString()] || 0
    }));

    res.json({
      collection: collection,
      userProgress: userCollection || {
        currentCount: 0,
        targetCount: allProducts.length,
        isCompleted: false
      },
      products: productsWithOwnership,
      totalProducts: allProducts.length,
      ownedProducts: Object.keys(userProductCounts).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start tracking a collection
router.post('/collections', async (req, res) => {
  try {
    const { collectionId, targetCount } = req.body;
    const UserCollection = require('../models/UserCollection');
    const Collection = require('../models/Collection');

    if (!collectionId || !targetCount) {
      return res.status(400).json({ error: 'Collection ID and target count required' });
    }

    // Check if collection exists
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if user already tracking this collection
    let userCollection = await UserCollection.findOne({
      userId: req.userId,
      collectionId
    });

    if (userCollection) {
      return res.status(400).json({ error: 'Already tracking this collection' });
    }

    // Create new tracking
    userCollection = await UserCollection.create({
      userId: req.userId,
      collectionId,
      targetCount,
      currentCount: 0
    });

    await userCollection.populate('collectionId');

    res.status(201).json(userCollection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update collection progress (called when user makes relevant purchase)
router.put('/collections/:id/progress', async (req, res) => {
  try {
    const { increment = 1 } = req.body;
    const UserCollection = require('../models/UserCollection');

    const userCollection = await UserCollection.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!userCollection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Increment progress
    userCollection.currentCount += increment;

    // Check if completed
    if (userCollection.currentCount >= userCollection.targetCount && !userCollection.isCompleted) {
      userCollection.isCompleted = true;
      userCollection.completedAt = new Date();
    }

    await userCollection.save();
    await userCollection.populate('collectionId');

    res.json(userCollection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
