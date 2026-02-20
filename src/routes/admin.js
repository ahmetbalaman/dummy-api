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
const Log = require('../models/Log');
const User = require('../models/User');
const { cleanOldLogs, getLogStats, logger } = require('../utils/logger');

// All admin routes require authentication
router.use(protect, restrictTo('admin'));

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Search query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      User.countDocuments(query)
    ]);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details with all orders and loyalty points across all businesses
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const Loyalty = require('../models/Loyalty');
    
    // Kullanıcı bilgilerini al
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Tüm işletmelerdeki loyalty puanlarını al
    const loyalties = await Loyalty.find({ userId })
      .populate('businessId', 'name address')
      .lean();

    // Tüm işletmelerdeki siparişlerini al
    const [ordersTL, ordersPoint] = await Promise.all([
      OrderTL.find({ userId })
        .populate('businessId', 'name address')
        .sort('-createdAt')
        .lean(),
      OrderPoint.find({ userId })
        .populate('businessId', 'name address')
        .sort('-createdAt')
        .lean()
    ]);

    // Siparişleri birleştir
    const tlOrders = ordersTL.map(order => ({ ...order, orderType: 'tl' }));
    const pointOrders = ordersPoint.map(order => ({ ...order, orderType: 'point' }));
    const allOrders = [...tlOrders, ...pointOrders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // İşletme bazında istatistikler
    const businessStats = {};
    
    ordersTL.forEach(order => {
      const businessId = order.businessId?._id?.toString();
      if (!businessId) return;
      
      if (!businessStats[businessId]) {
        businessStats[businessId] = {
          businessId: businessId,
          businessName: order.businessId.name,
          businessAddress: order.businessId.address,
          totalOrders: 0,
          totalSpentTL: 0,
          totalSpentPoints: 0,
          currentLoyaltyPoints: 0
        };
      }
      businessStats[businessId].totalOrders++;
      businessStats[businessId].totalSpentTL += order.totalTL || 0;
    });

    ordersPoint.forEach(order => {
      const businessId = order.businessId?._id?.toString();
      if (!businessId) return;
      
      if (!businessStats[businessId]) {
        businessStats[businessId] = {
          businessId: businessId,
          businessName: order.businessId.name,
          businessAddress: order.businessId.address,
          totalOrders: 0,
          totalSpentTL: 0,
          totalSpentPoints: 0,
          currentLoyaltyPoints: 0
        };
      }
      businessStats[businessId].totalOrders++;
      businessStats[businessId].totalSpentPoints += order.totalPoint || 0;
    });

    // Loyalty puanlarını ekle
    loyalties.forEach(loyalty => {
      const businessId = loyalty.businessId?._id?.toString();
      if (!businessId) return;
      
      if (!businessStats[businessId]) {
        businessStats[businessId] = {
          businessId: businessId,
          businessName: loyalty.businessId.name,
          businessAddress: loyalty.businessId.address,
          totalOrders: 0,
          totalSpentTL: 0,
          totalSpentPoints: 0,
          currentLoyaltyPoints: loyalty.points || 0
        };
      } else {
        businessStats[businessId].currentLoyaltyPoints = loyalty.points || 0;
      }
    });

    // Genel istatistikler
    const stats = {
      totalOrders: allOrders.length,
      totalSpentTL: ordersTL.reduce((sum, o) => sum + (o.totalTL || 0), 0),
      totalSpentPoints: ordersPoint.reduce((sum, o) => sum + (o.totalPoint || 0), 0),
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
      firstOrderDate: allOrders.length > 0 ? allOrders[allOrders.length - 1].createdAt : null,
      lastOrderDate: allOrders.length > 0 ? allOrders[0].createdAt : null,
      businessStats: Object.values(businessStats)
    };

    // Kullanıcıya yapılan admin işlemlerinin loglarını al
    const userLogs = await Log.find({
      $or: [
        { 'metadata.userId': userId },
        { 'metadata.userId': user._id }
      ],
      category: 'user'
    })
      .sort('-createdAt')
      .limit(50)
      .lean();
    
    console.log(`📋 ${user.name} için ${userLogs.length} log kaydı bulundu`);

    res.json({
      user,
      orders: allOrders,
      stats,
      logs: userLogs
    });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user (deactivate/activate, adjust points per business)
router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, loyaltyAdjustment, businessId, reason } = req.body;
    const Loyalty = require('../models/Loyalty');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldStatus = user.isActive;
    const changes = [];

    // Kullanıcı durumunu güncelle
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
      changes.push(`Durum: ${oldStatus ? 'Aktif' : 'Deaktif'} → ${user.isActive ? 'Aktif' : 'Deaktif'}`);
    }

    // İşletme bazında puan ayarlaması
    if (typeof loyaltyAdjustment === 'number' && businessId) {
      const loyalty = await Loyalty.findOne({ userId, businessId });
      
      if (!loyalty) {
        // Yeni loyalty kaydı oluştur
        await Loyalty.create({
          userId,
          businessId,
          points: Math.max(0, loyaltyAdjustment)
        });
        changes.push(`Puan: 0 → ${Math.max(0, loyaltyAdjustment)} (${businessId})`);
      } else {
        const oldPoints = loyalty.points;
        loyalty.points = Math.max(0, loyalty.points + loyaltyAdjustment);
        await loyalty.save();
        changes.push(`Puan: ${oldPoints} → ${loyalty.points} (${loyaltyAdjustment > 0 ? '+' : ''}${loyaltyAdjustment})`);
      }
      
      const business = await require('../models/Business').findById(businessId);
      if (business) {
        changes.push(`İşletme: ${business.name}`);
      }
    }

    await user.save();

    // Log kaydı
    if (changes.length > 0) {
      const logEntry = await Log.create({
        level: user.isActive ? 'info' : 'warning',
        category: 'user',
        message: `Kullanıcı güncellendi: ${user.name}`,
        metadata: {
          userId: user._id,
          userName: user.name,
          changes: changes,
          reason: reason || 'Belirtilmedi',
          adminAction: true
        }
      });
      console.log('✅ Log kaydı oluşturuldu:', logEntry._id);
    }

    const userData = user.toObject();
    delete userData.password;

    res.json(userData);
  } catch (error) {
    console.error('User update error:', error);
    res.status(400).json({ error: error.message });
  }
});

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
    
    // Log oluştur
    await logger.business(`Yeni işletme oluşturuldu: ${business.name}`, 'success', {
      businessId: business._id,
      metadata: { name: business.name, email: business.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(201).json(businessData);
  } catch (error) {
    await logger.business(`İşletme oluşturma hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    
    await logger.business(`İşletme güncellendi: ${business.name}`, 'info', {
      businessId: business._id,
      ipAddress: req.ip
    });
    
    res.json(business);
  } catch (error) {
    await logger.business(`İşletme güncelleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    
    await logger.business(`İşletme silindi: ${business.name}`, 'warning', {
      businessId: business._id,
      ipAddress: req.ip
    });
    
    res.json({ message: 'Business deleted successfully', business: { id: business._id, name: business.name } });
  } catch (error) {
    await logger.business(`İşletme silme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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

// Get single collection set
router.get('/collection-sets/:id', async (req, res) => {
  try {
    const set = await CollectionSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ error: 'Collection set not found' });
    }
    res.json(set);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create collection set
router.post('/collection-sets', async (req, res) => {
  try {
    const set = await CollectionSet.create(req.body);
    
    await logger.collection(`Yeni koleksiyon oluşturuldu: ${set.name}`, 'success', {
      metadata: { collectionId: set._id, name: set.name, totalItems: set.totalItems },
      ipAddress: req.ip
    });
    
    res.status(201).json(set);
  } catch (error) {
    await logger.collection(`Koleksiyon oluşturma hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    
    await logger.collection(`Koleksiyon güncellendi: ${set.name}`, 'info', {
      metadata: { collectionId: set._id, name: set.name },
      ipAddress: req.ip
    });
    
    res.json(set);
  } catch (error) {
    await logger.collection(`Koleksiyon güncelleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(400).json({ error: error.message });
  }
});

router.delete('/collection-sets/:id', async (req, res) => {
  try {
    const set = await CollectionSet.findByIdAndDelete(req.params.id);
    if (!set) {
      return res.status(404).json({ error: 'Collection set not found' });
    }
    
    await logger.collection(`Koleksiyon silindi: ${set.name}`, 'warning', {
      metadata: { collectionId: set._id, name: set.name },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Collection set deleted', set });
  } catch (error) {
    await logger.collection(`Koleksiyon silme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    const { businessId, globalOnly } = req.query;
    let query = {};
    
    if (globalOnly === 'true') {
      // Sadece admin tarafından oluşturulan global ürünler
      query.isGlobal = true;
    } else if (businessId) {
      // Belirli bir işletmenin ürünleri
      query.businessId = businessId;
    }
    
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
    // Admin tarafından oluşturulan genel ürünler
    const productData = {
      ...req.body,
      isGlobal: true // Admin ürünleri global olarak işaretle
    };
    
    // Eğer collectionId varsa collection name'i al
    if (req.body.collectionId) {
      const collection = await Collection.findById(req.body.collectionId);
      productData.collectionName = collection?.name;
    }
    
    const product = await ProductPoint.create(productData);
    
    await logger.system(`Yeni ürün oluşturuldu: ${product.name}`, 'success', {
      metadata: { productId: product._id, name: product.name, pricePoint: product.pricePoint },
      ipAddress: req.ip
    });
    
    res.status(201).json(product);
  } catch (error) {
    await logger.system(`Ürün oluşturma hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    
    await logger.system(`Ürün güncellendi: ${product.name}`, 'info', {
      metadata: { productId: product._id, name: product.name },
      ipAddress: req.ip
    });
    
    res.json(product);
  } catch (error) {
    await logger.system(`Ürün güncelleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products-point/:id', async (req, res) => {
  try {
    const product = await ProductPoint.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await logger.system(`Ürün silindi: ${product.name}`, 'warning', {
      metadata: { productId: product._id, name: product.name },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    await logger.system(`Ürün silme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(400).json({ error: error.message });
  }
});

// Get all shipments (admin'den işletmeye gönderilen)
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find({ type: 'admin' })
      .populate('businessId', 'name address phone')
      .populate('collectionSetId', 'name description')
      .sort('-createdAt');
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all restock orders (işletmelerden gelen siparişler)
router.get('/orders/restock', async (req, res) => {
  try {
    const { status, businessId } = req.query;
    const query = { type: 'restock' };
    
    if (status) query.status = status;
    if (businessId) query.businessId = businessId;
    
    const orders = await Shipment.find(query)
      .populate('businessId', 'name address phone email')
      .sort('-createdAt')
      .lean();
    
    // businessId populate edilmişse, businessName vs. alanlarını doldur
    const ordersWithBusinessInfo = orders.map(order => {
      if (order.businessId && typeof order.businessId === 'object') {
        return {
          ...order,
          businessName: order.businessName || order.businessId.name,
          businessAddress: order.businessAddress || order.businessId.address,
          businessPhone: order.businessPhone || order.businessId.phone,
          businessId: order.businessId._id || order.businessId
        };
      }
      return order;
    });
    
    res.json(ordersWithBusinessInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update restock order status
router.patch('/orders/restock/:id', async (req, res) => {
  try {
    const { status, trackingNumber, shippingCompany, notes } = req.body;
    
    const order = await Shipment.findOne({ 
      _id: req.params.id, 
      type: 'restock' 
    }).populate('businessId', 'name');
    
    if (!order) {
      return res.status(404).json({ error: 'Restock order not found' });
    }

    // Durumu güncelle
    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (shippingCompany) order.shippingCompany = shippingCompany;
    if (notes !== undefined) order.notes = notes;
    
    // Durum değişikliklerine göre tarih güncelle
    if (status === 'in_transit' && !order.shippedAt) {
      order.shippedAt = new Date();
      // Kargolandı durumuna geçtiğinde type'ı 'admin' yap (gönderilen sevkiyatlara geçsin)
      order.type = 'admin';
    }
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    
    const statusText = {
      pending: 'Beklemede',
      approved: 'Onaylandı',
      in_transit: 'Kargolandı',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi'
    }[order.status] || order.status;
    
    await logger.shipment(
      `Stok siparişi güncellendi: ${order.businessId?.name} - ${statusText}`, 
      status === 'delivered' ? 'success' : status === 'cancelled' ? 'warning' : 'info',
      {
        businessId: order.businessId?._id,
        metadata: { 
          orderId: order._id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          totalItems: order.products?.reduce((sum, p) => sum + p.quantity, 0) || 0,
          movedToShipments: status === 'in_transit'
        },
        ipAddress: req.ip
      }
    );
    
    res.json(order);
  } catch (error) {
    await logger.shipment(`Stok siparişi güncelleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(400).json({ error: error.message });
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

    await logger.shipment(
      `Yeni sevkiyat oluşturuldu: ${collectionSet.name} → ${business.name}`, 
      'success', 
      {
        businessId: business._id,
        metadata: { 
          shipmentId: shipment._id, 
          collectionName: collectionSet.name,
          businessName: business.name,
          totalItems: shipment.totalItems 
        },
        ipAddress: req.ip
      }
    );

    res.status(201).json(shipment);
  } catch (error) {
    await logger.shipment(`Sevkiyat oluşturma hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
    
    const statusText = {
      pending: 'Hazırlanıyor',
      in_transit: 'Yolda',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi'
    }[shipment.status] || shipment.status;
    
    await logger.shipment(
      `Sevkiyat durumu güncellendi: ${shipment.collectionSetName} - ${statusText}`, 
      shipment.status === 'delivered' ? 'success' : 'info',
      {
        businessId: shipment.businessId,
        metadata: { 
          shipmentId: shipment._id,
          status: shipment.status,
          trackingNumber: shipment.trackingNumber
        },
        ipAddress: req.ip
      }
    );
    
    res.json(shipment);
  } catch (error) {
    await logger.shipment(`Sevkiyat güncelleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
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
      totalRevenue,
      totalUsers
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ subscriptionStatus: 'active' }),
      OrderTL.countDocuments(),
      OrderTL.aggregate([
        { $group: { _id: null, total: { $sum: '$totalTL' } } }
      ]),
      User.countDocuments()
    ]);

    res.json({
      totalBusinesses,
      activeBusinesses,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalUsers,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs - Gelişmiş log sistemi
router.get('/logs', async (req, res) => {
  try {
    const { level, category, search, limit = 100, page = 1 } = req.query;
    
    // Query oluştur
    const query = {};
    if (level) query.level = level;
    if (category) query.category = category;
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      Log.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Log.countDocuments(query)
    ]);
    
    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log istatistikleri
router.get('/logs/stats', async (req, res) => {
  try {
    const stats = await getLogStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eski logları temizle
router.delete('/logs/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);
    const deletedCount = await cleanOldLogs(daysNum);
    
    await logger.system(
      daysNum === 0 
        ? `Tüm loglar temizlendi: ${deletedCount} kayıt`
        : `${daysNum} günden eski loglar temizlendi: ${deletedCount} kayıt`,
      'warning',
      {
        metadata: { deletedCount, days: daysNum },
        ipAddress: req.ip
      }
    );
    
    res.json({ 
      message: daysNum === 0 
        ? `Tüm loglar silindi: ${deletedCount} kayıt`
        : `${deletedCount} log silindi (${daysNum} günden eski)`,
      deletedCount,
      days: daysNum
    });
  } catch (error) {
    await logger.system(`Log temizleme hatası: ${error.message}`, 'error', {
      ipAddress: req.ip
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
