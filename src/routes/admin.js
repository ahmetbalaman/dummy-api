const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Business = require('../models/Business');
const CollectionSet = require('../models/CollectionSet');
const Collection = require('../models/Collection');
const Category = require('../models/Category');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const Shipment = require('../models/Shipment');
const OrderTL = require('../models/OrderTL');
const OrderPoint = require('../models/OrderPoint');

// All admin routes require authentication
router.use(protect, restrictTo('admin'));

// Get all businesses
router.get('/businesses', async (req, res) => {
  try {
    const businesses = await Business.find().select('-password');
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create business
router.post('/businesses', async (req, res) => {
  try {
    const business = await Business.create(req.body);
    const businessData = business.toObject();
    delete businessData.password;
    res.status(201).json(businessData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get business by ID
router.get('/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).select('-password');
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update business
router.put('/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete business (soft delete)
router.delete('/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    ).select('-password');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ message: 'Business deleted successfully', business: { id: business._id, name: business.name } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all collection sets
router.get('/collection-sets', async (req, res) => {
  try {
    const sets = await CollectionSet.find();
    res.json(sets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create collection set
router.post('/collection-sets', async (req, res) => {
  try {
    const set = await CollectionSet.create(req.body);
    res.status(201).json(set);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/collection-sets/:id', async (req, res) => {
  try {
    const set = await CollectionSet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!set) {
      return res.status(404).json({ error: 'Collection set not found' });
    }
    res.json(set);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/collection-sets/:id', async (req, res) => {
  try {
    const set = await CollectionSet.findByIdAndDelete(req.params.id);
    if (!set) {
      return res.status(404).json({ error: 'Collection set not found' });
    }
    res.json({ message: 'Collection set deleted', set });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Collections (Admin can manage all collections)
router.get('/collections', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = businessId ? { businessId } : {};
    const collections = await Collection.find(query)
      .populate('businessId', 'name')
      .sort('-createdAt');
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/collections', async (req, res) => {
  try {
    const collection = await Collection.create(req.body);
    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/collections/:id', async (req, res) => {
  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
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
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json({ message: 'Collection deleted', collection });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Categories (Admin can manage all categories)
router.get('/categories', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = businessId ? { businessId } : {};
    const categories = await Category.find(query)
      .populate('businessId', 'name')
      .sort('-createdAt');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
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
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted', category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// TL Products (Admin can manage all products)
router.get('/products-tl', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = businessId ? { businessId } : {};
    const products = await ProductTL.find(query)
      .populate('businessId', 'name')
      .populate('categoryId', 'name')
      .sort('-createdAt');
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
      categoryName: category?.name
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products-tl/:id', async (req, res) => {
  try {
    const product = await ProductTL.findByIdAndUpdate(
      req.params.id,
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
    const product = await ProductTL.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Point Products (Admin can manage all products)
router.get('/products-point', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = businessId ? { businessId } : {};
    const products = await ProductPoint.find(query)
      .populate('businessId', 'name')
      .populate('collectionId', 'name')
      .sort('-createdAt');
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
      collectionName: collection?.name
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products-point/:id', async (req, res) => {
  try {
    const product = await ProductPoint.findByIdAndUpdate(
      req.params.id,
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
    const product = await ProductPoint.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all shipments
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate('businessId', 'name address phone')
      .populate('collectionSetId', 'name description')
      .sort('-createdAt');
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create shipment
router.post('/shipments', async (req, res) => {
  try {
    const { collectionSetId, businessId } = req.body;
    
    const collectionSet = await CollectionSet.findById(collectionSetId);
    const business = await Business.findById(businessId);
    
    if (!collectionSet || !business) {
      return res.status(404).json({ error: 'Collection set or business not found' });
    }

    const shipment = await Shipment.create({
      ...req.body,
      collectionSetName: collectionSet.name,
      businessName: business.name,
      businessAddress: business.address,
      businessPhone: business.phone
    });

    res.status(201).json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update shipment status
router.patch('/shipments/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// System stats
router.get('/system', async (req, res) => {
  try {
    const [
      totalBusinesses,
      activeBusinesses,
      totalOrders,
      totalRevenue
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ subscriptionStatus: 'active' }),
      OrderTL.countDocuments(),
      OrderTL.aggregate([
        { $group: { _id: null, total: { $sum: '$totalTL' } } }
      ])
    ]);

    res.json({
      totalBusinesses,
      activeBusinesses,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs (placeholder - implement based on your logging strategy)
router.get('/logs', async (req, res) => {
  try {
    // This would typically query a logging collection or service
    res.json({
      logs: [],
      message: 'Logging system not yet implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
