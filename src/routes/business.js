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
const Log = require('../models/Log');

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
    const { status, startDate, endDate } = req.query;
    const query = { businessId: req.businessId };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch both TL and Point orders
    const [ordersTL, ordersPoint] = await Promise.all([
      OrderTL.find(query)
        .populate('userId', 'name email avatarUrl')
        .lean(),
      OrderPoint.find(query)
        .populate('userId', 'name email avatarUrl')
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

// Update order status (works for both TL and Point orders)
router.patch('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Try to find in TL orders first
    let order = await OrderTL.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      { status },
      { new: true }
    ).populate('userId', 'name email avatarUrl');

    let orderType = 'tl';

    // If not found, try Point orders
    if (!order) {
      order = await OrderPoint.findOneAndUpdate(
        { _id: id, businessId: req.businessId },
        { status },
        { new: true }
      ).populate('userId', 'name email avatarUrl');
      orderType = 'point';
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Log kaydı oluştur
    const statusLabels = {
      pending: 'Bekliyor',
      preparing: 'Hazırlanıyor',
      ready: 'Hazır',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };

    const logLevel = status === 'cancelled' ? 'warning' : 'info';
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
        newStatus: status,
        statusLabel: statusLabels[status] || status,
        customerName: order.userId?.name || 'Misafir',
        totalAmount: orderType === 'tl' ? order.totalTL : order.totalPoint,
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
    const order = await OrderPoint.findOneAndUpdate(
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

    // Kargo onaylandı - ürünleri stoğa ekle
    let updatedProducts = [];
    if (shipment.products && shipment.products.length > 0) {
      for (const item of shipment.products) {
        // Ürünü isme göre bul (productId olmayabilir)
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

    // Shipment durumunu güncelle
    shipment.status = 'delivered';
    shipment.deliveredAt = new Date();
    await shipment.save();

    // Log kaydı
    await Log.create({
      level: 'success',
      category: 'shipment',
      message: `Kargo teslim alındı: ${shipment.collectionSetId?.name || 'Koleksiyon Seti'}`,
      businessId: req.businessId,
      metadata: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        totalItems: shipment.products.reduce((sum, p) => sum + p.quantity, 0),
        updatedProducts: updatedProducts
      }
    });

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

// Restock Orders - İşletmeden admin'e ürün siparişi
router.post('/orders/restock', async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, productName, quantity, pricePoint }]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items required' });
    }

    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Toplam ürün sayısını hesapla
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Sipariş oluştur (Shipment olarak kaydet)
    const shipment = await Shipment.create({
      businessId: req.businessId,
      businessName: business.name,
      businessAddress: business.address,
      businessPhone: business.phone,
      type: 'restock', // Yeni alan: 'admin' veya 'restock'
      status: 'pending',
      totalItems: totalItems,
      products: items.map(item => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        pricePoint: item.pricePoint
      })),
      trackingNumber: null
    });

    // Log kaydı
    await Log.create({
      level: 'info',
      category: 'order',
      message: `Stok siparişi oluşturuldu: ${totalItems} ürün`,
      businessId: req.businessId,
      metadata: {
        shipmentId: shipment._id,
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
