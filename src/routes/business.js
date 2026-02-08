const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Business = require('../models/Business');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const OrderTL = require('../models/OrderTL');
const OrderPoint = require('../models/OrderPoint');
const Shipment = require('../models/Shipment');

// All business routes require authentication
router.use(protect, restrictTo('business'));

// Get business profile
router.get('/me', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).select('-password');
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update business profile
router.put('/me', async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.businessId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    res.json(business);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ businessId: req.businessId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = await Category.create({
      ...req.body,
      businessId: req.businessId
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted', category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Collections
router.get('/collections', async (req, res) => {
  try {
    const collections = await Collection.find({ businessId: req.businessId });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/collections', async (req, res) => {
  try {
    const collection = await Collection.create({
      ...req.body,
      businessId: req.businessId
    });
    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/collections/:id', async (req, res) => {
  try {
    const collection = await Collection.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/collections/:id', async (req, res) => {
  try {
    const collection = await Collection.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json({ message: 'Collection deleted', collection });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// TL Products
router.get('/products-tl', async (req, res) => {
  try {
    const products = await ProductTL.find({ businessId: req.businessId })
      .populate('categoryId', 'name iconUrl');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products-tl', async (req, res) => {
  try {
    const category = await Category.findById(req.body.categoryId);
    const product = await ProductTL.create({
      ...req.body,
      businessId: req.businessId,
      categoryName: category?.name
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products-tl/:id', async (req, res) => {
  try {
    const product = await ProductTL.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products-tl/:id', async (req, res) => {
  try {
    const product = await ProductTL.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// TL Product Stock Management
router.patch('/products-tl/:id/stock', async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'remove'
    
    if (!quantity || !operation) {
      return res.status(400).json({ error: 'Quantity and operation required' });
    }

    const product = await ProductTL.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'remove') {
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      product.stock -= quantity;
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "remove"' });
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Point Products
router.get('/products-point', async (req, res) => {
  try {
    const products = await ProductPoint.find({ businessId: req.businessId })
      .populate('collectionId', 'name imageUrl');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products-point', async (req, res) => {
  try {
    const collection = await Collection.findById(req.body.collectionId);
    const product = await ProductPoint.create({
      ...req.body,
      businessId: req.businessId,
      collectionName: collection?.name
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products-point/:id', async (req, res) => {
  try {
    const product = await ProductPoint.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products-point/:id', async (req, res) => {
  try {
    const product = await ProductPoint.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Point Product Stock Management
router.patch('/products-point/:id/stock', async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'remove'
    
    if (!quantity || !operation) {
      return res.status(400).json({ error: 'Quantity and operation required' });
    }

    const product = await ProductPoint.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'remove') {
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      product.stock -= quantity;
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "remove"' });
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// TL Orders
router.get('/orders-tl', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = { businessId: req.businessId };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await OrderTL.find(query)
      .populate('userId', 'name email avatarUrl')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/orders-tl/:id', async (req, res) => {
  try {
    const order = await OrderTL.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { status: req.body.status },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Point Orders
router.get('/orders-point', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { businessId: req.businessId };
    if (status) query.status = status;

    const orders = await OrderPoint.find(query)
      .populate('userId', 'name email avatarUrl')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shipments
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find({ businessId: req.businessId })
      .populate('collectionSetId', 'name description')
      .sort('-createdAt');
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/shipments/:id/confirm', async (req, res) => {
  try {
    const shipment = await Shipment.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { status: 'delivered', deliveredAt: new Date() },
      { new: true }
    );
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    const [
      totalOrders,
      totalRevenue,
      topProducts
    ] = await Promise.all([
      OrderTL.countDocuments({ businessId: req.businessId }),
      OrderTL.aggregate([
        { $match: { businessId: req.businessId } },
        { $group: { _id: null, total: { $sum: '$totalTL' } } }
      ]),
      OrderTL.aggregate([
        { $match: { businessId: req.businessId } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productName',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }},
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      topProducts,
      period
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// QR Generation
router.post('/qr', async (req, res) => {
  try {
    const qrCode = `QR-${req.businessId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    res.json({
      qrCode,
      businessId: req.businessId,
      expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
