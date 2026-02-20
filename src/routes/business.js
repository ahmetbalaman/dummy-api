const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Business = require('../models/Business');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const CollectionSet = require('../models/CollectionSet');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const OrderTL = require('../models/OrderTL');
const OrderPoint = require('../models/OrderPoint');
const Shipment = require('../models/Shipment');
const Log = require('../models/Log');
const Loyalty = require('../models/Loyalty');
const User = require('../models/User');

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

    // Log kaydı
    await Log.create({
      level: 'warning',
      category: 'business',
      message: `Kategori silindi: ${category.name}`,
      businessId: req.businessId,
      metadata: {
        categoryId: category._id,
        categoryName: category.name
      }
    });

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

// Get all available collections (for ordering new ones)
router.get('/collections/available', async (req, res) => {
  try {
    // Tüm koleksiyonları getir
    const allCollections = await Collection.find({});
    
    // İşletmenin mevcut koleksiyonlarını getir
    const businessCollections = await Collection.find({ businessId: req.businessId });
    const businessCollectionIds = businessCollections.map(c => c._id.toString());
    
    // İşletmede olmayan koleksiyonları filtrele
    const availableCollections = allCollections.filter(c => 
      !businessCollectionIds.includes(c._id.toString())
    );
    
    res.json(availableCollections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all collection sets (for ordering)
router.get('/collection-sets', async (req, res) => {
  try {
    const collectionSets = await CollectionSet.find({ isActive: true })
      .sort({ name: 1 });
    res.json(collectionSets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single collection set
router.get('/collection-sets/:id', async (req, res) => {
  try {
    const collectionSet = await CollectionSet.findById(req.params.id);
    if (!collectionSet) {
      return res.status(404).json({ error: 'Collection set not found' });
    }
    res.json(collectionSet);
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

    // Log kaydı
    await Log.create({
      level: 'warning',
      category: 'collection',
      message: `Koleksiyon silindi: ${collection.name}`,
      businessId: req.businessId,
      metadata: {
        collectionId: collection._id,
        collectionName: collection.name
      }
    });

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
    const oldProduct = await ProductTL.findOne({ _id: req.params.id, businessId: req.businessId });
    
    const product = await ProductTL.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log kaydı - değişiklikleri kaydet
    const changes = [];
    if (oldProduct.name !== product.name) changes.push(`İsim: ${oldProduct.name} → ${product.name}`);
    if (oldProduct.priceTL !== product.priceTL) changes.push(`Fiyat: ₺${oldProduct.priceTL} → ₺${product.priceTL}`);
    if (oldProduct.earnedPoints !== product.earnedPoints) changes.push(`Kazanılan Puan: ${oldProduct.earnedPoints || 0} → ${product.earnedPoints || 0}`);
    if (oldProduct.isActive !== product.isActive) changes.push(`Durum: ${oldProduct.isActive ? 'Aktif' : 'Pasif'} → ${product.isActive ? 'Aktif' : 'Pasif'}`);
    
    if (changes.length > 0) {
      await Log.create({
        level: 'info',
        category: 'business',
        message: `Ürün güncellendi: ${product.name}`,
        businessId: req.businessId,
        metadata: {
          productId: product._id,
          productName: product.name,
          changes: changes
        }
      });
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

    // Log kaydı
    await Log.create({
      level: 'warning',
      category: 'business',
      message: `Ürün silindi: ${product.name}`,
      businessId: req.businessId,
      metadata: {
        productId: product._id,
        productName: product.name,
        priceTL: product.priceTL,
        categoryName: product.categoryName
      }
    });

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

// Get all products (from all collections) - for new collection ordering
router.get('/products-point/all', async (req, res) => {
  try {
    const products = await ProductPoint.find()
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
    const oldProduct = await ProductPoint.findOne({ _id: req.params.id, businessId: req.businessId });
    
    const product = await ProductPoint.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log kaydı - değişiklikleri kaydet
    const changes = [];
    if (oldProduct.name !== product.name) changes.push(`İsim: ${oldProduct.name} → ${product.name}`);
    if (oldProduct.pricePoint !== product.pricePoint) changes.push(`Puan: ${oldProduct.pricePoint} → ${product.pricePoint}`);
    if (oldProduct.isActive !== product.isActive) changes.push(`Durum: ${oldProduct.isActive ? 'Aktif' : 'Pasif'} → ${product.isActive ? 'Aktif' : 'Pasif'}`);
    
    if (changes.length > 0) {
      await Log.create({
        level: 'info',
        category: 'collection',
        message: `Puan ürünü güncellendi: ${product.name}`,
        businessId: req.businessId,
        metadata: {
          productId: product._id,
          productName: product.name,
          changes: changes
        }
      });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product stock
router.patch('/products-point/:id/stock', async (req, res) => {
  try {
    const { stockChange } = req.body;
    
    if (typeof stockChange !== 'number') {
      return res.status(400).json({ error: 'stockChange must be a number' });
    }

    const product = await ProductPoint.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.stock = (product.stock || 0) + stockChange;
    
    // Stok negatif olamaz
    if (product.stock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }

    await product.save();

    // Log kaydı
    await Log.create({
      level: 'info',
      category: 'collection',
      message: `${product.name} için stok güncellendi: ${stockChange > 0 ? '+' : ''}${stockChange}`,
      businessId: req.businessId,
      metadata: {
        productId: product._id,
        productName: product.name,
        oldStock: product.stock - stockChange,
        newStock: product.stock,
        change: stockChange
      }
    });

    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ProductPoint silme işlemi devre dışı - koleksiyon ürünleri korunmalı
// İşletmeler koleksiyon ürünlerini silemez, sadece stok güncelleyebilir
/*
router.delete('/products-point/:id', async (req, res) => {
  try {
    const product = await ProductPoint.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log kaydı
    await Log.create({
      level: 'warning',
      category: 'collection',
      message: `ProductPoint deleted: ${product.name}`,
      businessId: req.businessId,
      metadata: {
        productId: product._id,
        productName: product.name
      }
    });

    res.json({ message: 'Product deleted', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
*/

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

// Combined Orders - TL and Point orders together
router.get('/orders', async (req, res) => {
  try {
    const { status, startDate, endDate, userId } = req.query;
    const query = { businessId: req.businessId };
    
    if (status) query.status = status;
    if (userId) query.userId = userId; // Belirli bir kullanıcının siparişlerini filtrele
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch both TL and Point orders
    const [ordersTL, ordersPoint] = await Promise.all([
      OrderTL.find(query)
        .populate('userId', 'name email avatarUrl phone')
        .lean(),
      OrderPoint.find(query)
        .populate('userId', 'name email avatarUrl phone')
        .lean()
    ]);

    // Add type field to distinguish orders
    const tlOrders = ordersTL.map(order => ({ ...order, orderType: 'tl' }));
    const pointOrders = ordersPoint.map(order => ({ ...order, orderType: 'point' }));

    // Combine and sort by creation date
    const allOrders = [...tlOrders, ...pointOrders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customers (users who made orders at this business)
router.get('/customers', async (req, res) => {
  try {
    // MongoDB aggregation ile daha verimli - sadece özet bilgiler
    const [tlCustomers, pointCustomers] = await Promise.all([
      OrderTL.aggregate([
        { $match: { businessId: req.businessId, userId: { $ne: null } } }, // null userId'leri filtrele
        { $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalTL' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' }
        }}
      ]),
      OrderPoint.aggregate([
        { $match: { businessId: req.businessId, userId: { $ne: null } } }, // null userId'leri filtrele
        { $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalPoint' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' }
        }}
      ])
    ]);

    // Kullanıcı ID'lerini topla
    const userIds = new Set([
      ...tlCustomers.map(c => c._id),
      ...pointCustomers.map(c => c._id)
    ]);

    // Kullanıcı bilgilerini tek sorguda al
    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('name email avatarUrl phone')
      .lean();

    // Kullanıcı bilgilerini map'e çevir
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Müşteri verilerini birleştir
    const customerMap = new Map();

    tlCustomers.forEach(c => {
      if (!c._id) return; // userId null ise atla
      const userId = c._id.toString();
      const user = userMap.get(userId);
      if (!user) return;

      customerMap.set(userId, {
        _id: userId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        totalOrders: c.totalOrders,
        totalSpentTL: c.totalSpent,
        totalSpentPoints: 0,
        lastOrderDate: c.lastOrderDate,
        firstOrderDate: c.firstOrderDate
      });
    });

    pointCustomers.forEach(c => {
      if (!c._id) return; // userId null ise atla
      const userId = c._id.toString();
      const user = userMap.get(userId);
      if (!user) return;

      if (customerMap.has(userId)) {
        const customer = customerMap.get(userId);
        customer.totalOrders += c.totalOrders;
        customer.totalSpentPoints = c.totalSpent;
        if (new Date(c.lastOrderDate) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = c.lastOrderDate;
        }
        if (new Date(c.firstOrderDate) < new Date(customer.firstOrderDate)) {
          customer.firstOrderDate = c.firstOrderDate;
        }
      } else {
        customerMap.set(userId, {
          _id: userId,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          totalOrders: c.totalOrders,
          totalSpentTL: 0,
          totalSpentPoints: c.totalSpent,
          lastOrderDate: c.lastOrderDate,
          firstOrderDate: c.firstOrderDate
        });
      }
    });

    // Array'e çevir ve sırala
    const customers = Array.from(customerMap.values()).sort((a, b) => 
      new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
    );

    res.json(customers);
  } catch (error) {
    console.error('Customers list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer details with order history
router.get('/customers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Kullanıcı bilgilerini al
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Bu işletmedeki tüm siparişlerini al
    const [ordersTL, ordersPoint] = await Promise.all([
      OrderTL.find({ businessId: req.businessId, userId })
        .sort('-createdAt')
        .lean(),
      OrderPoint.find({ businessId: req.businessId, userId })
        .sort('-createdAt')
        .lean()
    ]);

    // Siparişleri birleştir ve sırala
    const tlOrders = ordersTL.map(order => ({ ...order, orderType: 'tl' }));
    const pointOrders = ordersPoint.map(order => ({ ...order, orderType: 'point' }));
    const allOrders = [...tlOrders, ...pointOrders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // İstatistikleri hesapla - sadece bu işletmedeki siparişler
    const stats = {
      totalOrders: allOrders.length,
      totalSpentTL: ordersTL.reduce((sum, o) => sum + (o.totalTL || 0), 0),
      totalSpentPoints: ordersPoint.reduce((sum, o) => sum + (o.totalPoint || 0), 0),
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
      firstOrderDate: allOrders.length > 0 ? allOrders[allOrders.length - 1].createdAt : null,
      lastOrderDate: allOrders.length > 0 ? allOrders[0].createdAt : null
    };

    res.json({
      user,
      orders: allOrders,
      stats
    });
  } catch (error) {
    console.error('Customer details error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Update order status (works for both TL and Point orders)
router.patch('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Try to find in TL orders first
    let order = await OrderTL.findOne(
      { _id: id, businessId: req.businessId }
    ).populate('userId', 'name email avatarUrl');

    let orderType = 'tl';

    // If not found, try Point orders
    if (!order) {
      order = await OrderPoint.findOne(
        { _id: id, businessId: req.businessId }
      ).populate('userId', 'name email avatarUrl');
      orderType = 'point';
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    
    // Durumu güncelle
    order.status = status;
    await order.save();

    // Eğer sipariş "cancelled" durumuna geçtiyse, puan iadesi yap
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      
      // Puan siparişi iptal edildiyse, harcanan puanları iade et
      if (orderType === 'point' && order.totalPoint > 0) {
        const userId = order.userId?._id || order.userId;
        
        if (!userId) {
          console.error('❌ User ID not found for point refund:', order);
        } else {
          await Loyalty.findOneAndUpdate(
            { userId: userId, businessId: req.businessId },
            { $inc: { points: order.totalPoint } }, // Puanları geri ver
            { upsert: true, new: true }
          );

          await Log.create({
            level: 'warning',
            category: 'loyalty',
            message: `Puan siparişi iptal edildi, ${order.totalPoint} puan iade edildi`,
            businessId: req.businessId,
            userId: userId,
            metadata: {
              orderId: order._id,
              pointsRefunded: order.totalPoint,
              reason: 'order_cancelled'
            }
          });
        }
      }
      
      // TL siparişi iptal edildiyse
      if (orderType === 'tl') {
        const userId = order.userId?._id || order.userId;
        
        if (!userId) {
          console.error('❌ User ID not found for TL order cancellation:', order);
        }
        
        // Eğer puan kazanılmışsa (pointsEarned > 0), puanları geri al
        // Sipariş durumu ne olursa olsun, eğer puan verilmişse geri alınmalı
        if (order.pointsEarned > 0 && userId) {
          const loyaltyBefore = await Loyalty.findOne({ userId: userId, businessId: req.businessId });
          console.log('🔍 Loyalty before deduction:', loyaltyBefore);
          
          // Sadece kullanıcının yeterli puanı varsa düş
          if (loyaltyBefore && loyaltyBefore.points >= order.pointsEarned) {
            const loyaltyAfter = await Loyalty.findOneAndUpdate(
              { userId: userId, businessId: req.businessId },
              { $inc: { points: -order.pointsEarned } }, // Puanları geri al
              { new: true }
            );
            
            console.log('✅ Loyalty after deduction:', loyaltyAfter);

            await Log.create({
              level: 'warning',
              category: 'loyalty',
              message: `TL siparişi iptal edildi, ${order.pointsEarned} puan geri alındı`,
              businessId: req.businessId,
              userId: userId,
              metadata: {
                orderId: order._id,
                pointsDeducted: order.pointsEarned,
                totalTL: order.totalTL,
                pointsBefore: loyaltyBefore?.points || 0,
                pointsAfter: loyaltyAfter?.points || 0,
                orderStatus: oldStatus,
                reason: 'order_cancelled'
              }
            });
          } else {
            console.warn('⚠️ User does not have enough points to deduct:', {
              userId,
              currentPoints: loyaltyBefore?.points || 0,
              pointsToDeduct: order.pointsEarned
            });
            
            await Log.create({
              level: 'error',
              category: 'loyalty',
              message: `TL siparişi iptal edildi ama kullanıcıda yeterli puan yok (${loyaltyBefore?.points || 0} < ${order.pointsEarned})`,
              businessId: req.businessId,
              userId: userId,
              metadata: {
                orderId: order._id,
                pointsToDeduct: order.pointsEarned,
                currentPoints: loyaltyBefore?.points || 0,
                orderStatus: oldStatus
              }
            });
          }
        }
        
        // TL iadesi için log (gerçek ödeme entegrasyonu varsa burada işlem yapılır)
        if (userId) {
          await Log.create({
            level: 'warning',
            category: 'order',
            message: `TL siparişi iptal edildi, ₺${order.totalTL} iade edilmeli`,
            businessId: req.businessId,
            userId: userId,
            metadata: {
              orderId: order._id,
              refundAmount: order.totalTL,
              paymentMethod: order.paymentMethod,
              reason: 'order_cancelled'
            }
          });
        }
      }
    }

    // Eğer sipariş "completed" durumuna geçtiyse
    if (status === 'completed' && oldStatus !== 'completed') {
      
      // TL siparişi için puan ekle
      if (orderType === 'tl' && order.pointsEarned > 0) {
        await Loyalty.findOneAndUpdate(
          { userId: order.userId._id, businessId: req.businessId },
          { $inc: { points: order.pointsEarned } },
          { upsert: true, new: true }
        );
      }
      
      // Puan siparişi için koleksiyonları güncelle
      if (orderType === 'point') {
        const UserCollection = require('../models/UserCollection');
        const ProductPoint = require('../models/ProductPoint');
        const collectionUpdates = {};

        // Siparişteki her ürün için koleksiyon bilgisini topla
        for (const item of order.items) {
          if (item.collectionId) {
            const collectionId = item.collectionId.toString();
            if (!collectionUpdates[collectionId]) {
              collectionUpdates[collectionId] = 0;
            }
            collectionUpdates[collectionId] += item.quantity;
          }
        }

        // Kullanıcının koleksiyonlarını güncelle
        for (const [collectionId, count] of Object.entries(collectionUpdates)) {
          // Kullanıcının bu koleksiyonu var mı kontrol et
          let userCollection = await UserCollection.findOne({
            userId: order.userId._id,
            collectionId: collectionId
          });

          if (userCollection) {
            // Mevcut koleksiyonu güncelle
            userCollection.currentCount += count;
            
            // Hedef sayıya ulaşıldı mı kontrol et
            if (userCollection.currentCount >= userCollection.targetCount && !userCollection.isCompleted) {
              userCollection.isCompleted = true;
              userCollection.completedAt = new Date();
            }
            
            await userCollection.save();
          } else {
            // Yeni koleksiyon kaydı oluştur
            // Koleksiyonun toplam ürün sayısını hesapla
            const totalProductsInCollection = await ProductPoint.countDocuments({
              collectionId: collectionId,
              businessId: req.businessId,
              isActive: true
            });
            
            const targetCount = totalProductsInCollection || 10; // Varsayılan 10
            
            await UserCollection.create({
              userId: order.userId._id,
              collectionId: collectionId,
              currentCount: count,
              targetCount: targetCount,
              isCompleted: count >= targetCount,
              completedAt: count >= targetCount ? new Date() : null
            });
          }
        }
      }
    }

    // Log kaydı oluştur
    const statusLabels = {
      pending: 'Bekliyor',
      preparing: 'Hazırlanıyor',
      ready: 'Hazır',
      completed: 'Teslim Edildi',
      cancelled: 'İptal Edildi'
    };

    const logLevel = status === 'cancelled' ? 'warning' : status === 'completed' ? 'success' : 'info';
    const logMessage = `Sipariş durumu güncellendi: ${statusLabels[status] || status}`;

    await Log.create({
      level: logLevel,
      category: 'order',
      message: logMessage,
      businessId: req.businessId,
      userId: order.userId?._id,
      metadata: {
        orderId: order._id,
        orderType: orderType,
        oldStatus: oldStatus,
        newStatus: status,
        statusLabel: statusLabels[status] || status,
        customerName: order.userId?.name || 'Misafir',
        totalAmount: orderType === 'tl' ? order.totalTL : order.totalPoint,
        pointsEarned: orderType === 'tl' && status === 'completed' ? order.pointsEarned : undefined,
        pointsRefunded: orderType === 'point' && status === 'cancelled' ? order.totalPoint : undefined,
        pointsDeducted: orderType === 'tl' && status === 'cancelled' && oldStatus === 'completed' ? order.pointsEarned : undefined,
        refundAmount: orderType === 'tl' && status === 'cancelled' ? order.totalTL : undefined,
        itemCount: order.items?.length || 0,
        source: 'business_panel'
      }
    });

    // Add orderType to response
    const orderWithType = { ...order.toObject(), orderType };

    res.json(orderWithType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Legacy endpoints (kept for backward compatibility)
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
    const order = await OrderTL.findOne(
      { _id: req.params.id, businessId: req.businessId }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    const newStatus = req.body.status;
    
    // Durumu güncelle
    order.status = newStatus;
    await order.save();

    // Eğer sipariş "completed" durumuna geçtiyse ve puan kazanılacaksa
    if (newStatus === 'completed' && oldStatus !== 'completed' && order.pointsEarned > 0) {
      await Loyalty.findOneAndUpdate(
        { userId: order.userId, businessId: req.businessId },
        { $inc: { points: order.pointsEarned } },
        { upsert: true, new: true }
      );

      // Log kaydı
      await Log.create({
        level: 'success',
        category: 'loyalty',
        message: `TL siparişi tamamlandı, ${order.pointsEarned} puan kazanıldı`,
        businessId: req.businessId,
        userId: order.userId,
        metadata: {
          orderId: order._id,
          pointsEarned: order.pointsEarned,
          totalTL: order.totalTL
        }
      });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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

router.patch('/orders-point/:id', async (req, res) => {
  try {
    const order = await OrderPoint.findOne(
      { _id: req.params.id, businessId: req.businessId }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    const newStatus = req.body.status;
    
    // Durumu güncelle
    order.status = newStatus;
    await order.save();

    // Eğer sipariş "completed" durumuna geçtiyse, kullanıcının koleksiyonlarını güncelle
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      const UserCollection = require('../models/UserCollection');
      const ProductPoint = require('../models/ProductPoint');
      const collectionUpdates = {};

      // Siparişteki her ürün için koleksiyon bilgisini topla
      for (const item of order.items) {
        if (item.collectionId) {
          const collectionId = item.collectionId.toString();
          if (!collectionUpdates[collectionId]) {
            collectionUpdates[collectionId] = 0;
          }
          collectionUpdates[collectionId] += item.quantity;
        }
      }

      // Kullanıcının koleksiyonlarını güncelle
      for (const [collectionId, count] of Object.entries(collectionUpdates)) {
        // Kullanıcının bu koleksiyonu var mı kontrol et
        let userCollection = await UserCollection.findOne({
          userId: order.userId,
          collectionId: collectionId
        });

        if (userCollection) {
          // Mevcut koleksiyonu güncelle
          userCollection.currentCount += count;
          
          // Hedef sayıya ulaşıldı mı kontrol et
          if (userCollection.currentCount >= userCollection.targetCount && !userCollection.isCompleted) {
            userCollection.isCompleted = true;
            userCollection.completedAt = new Date();
          }
          
          await userCollection.save();
        } else {
          // Yeni koleksiyon kaydı oluştur
          // Koleksiyonun toplam ürün sayısını hesapla
          const totalProductsInCollection = await ProductPoint.countDocuments({
            collectionId: collectionId,
            businessId: req.businessId,
            isActive: true
          });
          
          const targetCount = totalProductsInCollection || 10; // Varsayılan 10
          
          await UserCollection.create({
            userId: order.userId,
            collectionId: collectionId,
            currentCount: count,
            targetCount: targetCount,
            isCompleted: count >= targetCount,
            completedAt: count >= targetCount ? new Date() : null
          });
        }
      }

      // Log kaydı
      await Log.create({
        level: 'success',
        category: 'collection',
        message: `Sipariş tamamlandı ve koleksiyonlar güncellendi`,
        businessId: req.businessId,
        userId: order.userId,
        metadata: {
          orderId: order._id,
          collectionsUpdated: Object.keys(collectionUpdates).length,
          totalItems: Object.values(collectionUpdates).reduce((sum, count) => sum + count, 0)
        }
      });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Shipments
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find({ 
      businessId: req.businessId,
      type: 'admin' // Sadece admin'den gelen kargolar
    })
      .populate('collectionSetId', 'name description')
      .sort('-createdAt');
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/shipments/:id/confirm', async (req, res) => {
  try {
    const shipment = await Shipment.findOne(
      { _id: req.params.id, businessId: req.businessId }
    ).populate('collectionSetId');
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (shipment.status === 'delivered') {
      return res.status(400).json({ error: 'Shipment already delivered' });
    }

    // Kargo onaylandı - ürünleri stoğa ekle veya yeni koleksiyon oluştur
    let updatedProducts = [];
    let newCollection = null;
    
    if (shipment.products && shipment.products.length > 0) {
      // Eğer collectionSetId varsa, bu yeni bir koleksiyon seti
      if (shipment.collectionSetId) {
        const collectionSet = shipment.collectionSetId;
        
        // İşletmede bu koleksiyon var mı kontrol et
        const existingCollection = await Collection.findOne({
          businessId: req.businessId,
          name: collectionSet.name
        });
        
        if (!existingCollection) {
          // Yeni koleksiyon oluştur
          newCollection = await Collection.create({
            businessId: req.businessId,
            name: collectionSet.name,
            description: collectionSet.description,
            imageUrl: collectionSet.imageUrl,
            category: collectionSet.category,
            isActive: true
          });
          
          // Koleksiyondaki ürünleri oluştur - CollectionSet'ten ürün bilgilerini al
          for (const item of shipment.products) {
            // CollectionSet'teki ürün bilgilerini bul
            const collectionProduct = collectionSet.products?.find(
              p => p.productId === item.productId || p.productName === item.name
            );
            
            const product = await ProductPoint.create({
              businessId: req.businessId,
              collectionId: newCollection._id,
              collectionName: newCollection.name,
              name: item.name,
              description: collectionProduct?.description || item.description || '',
              pricePoint: item.pricePoint,
              imageUrl: collectionProduct?.imageUrl || item.imageUrl || '',
              stock: item.quantity,
              isActive: true
            });
            
            updatedProducts.push({
              name: product.name,
              stock: product.stock,
              added: item.quantity,
              isNew: true
            });
          }
        } else {
          // Mevcut koleksiyona ürün ekle
          for (const item of shipment.products) {
            let product = await ProductPoint.findOne({
              name: item.name,
              businessId: req.businessId,
              collectionId: existingCollection._id
            });
            
            if (product) {
              product.stock = (product.stock || 0) + item.quantity;
              await product.save();
              updatedProducts.push({
                name: product.name,
                oldStock: product.stock - item.quantity,
                newStock: product.stock,
                added: item.quantity
              });
            } else {
              // Ürün yoksa yeni oluştur - CollectionSet'ten ürün bilgilerini al
              const collectionProduct = collectionSet.products?.find(
                p => p.productId === item.productId || p.productName === item.name
              );
              
              product = await ProductPoint.create({
                businessId: req.businessId,
                collectionId: existingCollection._id,
                collectionName: existingCollection.name,
                name: item.name,
                description: collectionProduct?.description || item.description || '',
                pricePoint: item.pricePoint,
                imageUrl: collectionProduct?.imageUrl || item.imageUrl || '',
                stock: item.quantity,
                isActive: true
              });
              
              updatedProducts.push({
                name: product.name,
                stock: product.stock,
                added: item.quantity,
                isNew: true
              });
            }
          }
        }
      } else {
        // Koleksiyon seti yok, sadece stok güncelle
        for (const item of shipment.products) {
          const product = await ProductPoint.findOne({
            name: item.name,
            businessId: req.businessId
          });

          if (product) {
            product.stock = (product.stock || 0) + item.quantity;
            await product.save();
            updatedProducts.push({
              name: product.name,
              oldStock: product.stock - item.quantity,
              newStock: product.stock,
              added: item.quantity
            });
          }
        }
      }
    }

    // Shipment durumunu güncelle
    shipment.status = 'delivered';
    shipment.deliveredAt = new Date();
    await shipment.save();

    // Log kaydı
    await Log.create({
      level: 'success',
      category: 'shipment',
      message: newCollection 
        ? `Yeni koleksiyon eklendi: ${newCollection.name}`
        : `Kargo teslim alındı: ${shipment.collectionSetId?.name || 'Stok Siparişi'}`,
      businessId: req.businessId,
      metadata: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        totalItems: shipment.products.reduce((sum, p) => sum + p.quantity, 0),
        newCollection: newCollection ? { id: newCollection._id, name: newCollection.name } : null,
        updatedProducts: updatedProducts
      }
    });

    res.json({ 
      shipment, 
      newCollection,
      updatedProducts 
    });
  } catch (error) {
    console.error('Shipment confirmation error:', error);
    res.status(400).json({ error: error.message, details: error.stack });
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

// Restock Orders - İşletmeden admin'e ürün siparişi
router.post('/orders/restock', async (req, res) => {
  try {
    const { items, collectionSetId } = req.body; // [{ productId, productName, description, imageUrl, quantity, pricePoint }]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items required' });
    }

    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Toplam ürün sayısını hesapla
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Eğer collectionSetId varsa, koleksiyon seti bilgilerini al
    let collectionSetName = null;
    if (collectionSetId) {
      const collectionSet = await CollectionSet.findById(collectionSetId);
      if (collectionSet) {
        collectionSetName = collectionSet.name;
      }
    }

    // Sipariş oluştur (Shipment olarak kaydet)
    const shipment = await Shipment.create({
      businessId: req.businessId,
      businessName: business.name,
      businessAddress: business.address,
      businessPhone: business.phone,
      type: 'restock', // Yeni alan: 'admin' veya 'restock'
      status: 'pending',
      totalItems: totalItems,
      collectionSetId: collectionSetId || null,
      collectionSetName: collectionSetName,
      products: items.map(item => ({
        productId: item.productId,
        name: item.productName,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        quantity: item.quantity,
        pricePoint: item.pricePoint
      })),
      trackingNumber: null
    });

    // Log kaydı
    await Log.create({
      level: 'info',
      category: 'order',
      message: collectionSetName 
        ? `Koleksiyon seti siparişi: ${collectionSetName} (${totalItems} ürün)`
        : `Stok siparişi oluşturuldu: ${totalItems} ürün`,
      businessId: req.businessId,
      metadata: {
        shipmentId: shipment._id,
        collectionSetId: collectionSetId,
        collectionSetName: collectionSetName,
        items: items.map(i => ({ name: i.productName, quantity: i.quantity })),
        totalItems: totalItems
      }
    });
    
    res.json({ message: 'Restock order created', order: shipment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get restock orders
router.get('/orders/restock', async (req, res) => {
  try {
    const orders = await Shipment.find({ 
      businessId: req.businessId,
      type: 'restock'
    }).sort('-createdAt');
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs - İşletme logları
router.get('/logs', async (req, res) => {
  try {
    const { level, category, limit = 50, page = 1 } = req.query;
    
    const query = { businessId: req.businessId };
    if (level) query.level = level;
    if (category) query.category = category;

    const logs = await Log.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Log.countDocuments(query);

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

module.exports = router;
