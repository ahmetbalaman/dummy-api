require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Business = require('../models/Business');
const User = require('../models/User');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const CollectionSet = require('../models/CollectionSet');
const Shipment = require('../models/Shipment');
const OrderTL = require('../models/OrderTL');
const Loyalty = require('../models/Loyalty');
const Log = require('../models/Log');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Admin.deleteMany({}),
      Business.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Collection.deleteMany({}),
      ProductTL.deleteMany({}),
      ProductPoint.deleteMany({}),
      CollectionSet.deleteMany({}),
      Shipment.deleteMany({}),
      OrderTL.deleteMany({}),
      Loyalty.deleteMany({}),
      Log.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const admin = await Admin.create({
      name: 'Admin User',
      email: 'admin@system.com',
      password: 'admin123'
    });
    console.log('👤 Admin created:', admin.email);

    // Create Businesses
    const business1 = await Business.create({
      name: 'Kahve Dükkanı',
      email: 'info@kahvedukkani.com',
      password: 'business123',
      description: 'El yapımı kahve ve seramik koleksiyonları',
      address: 'Beyoğlu, İstiklal Cad. No:123, İstanbul',
      phone: '+905551234567',
      logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=KD',
      coverImageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800',
      rating: 4.7,
      totalReviews: 248,
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date('2026-03-01')
    });

    const business2 = await Business.create({
      name: 'Seramik Atölyesi',
      email: 'info@seramikatölyesi.com',
      password: 'business123',
      description: 'El yapımı seramik ürünler',
      address: 'Kadıköy, Moda Cad. No:45, İstanbul',
      phone: '+905559876543',
      logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SA',
      coverImageUrl: 'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800',
      rating: 4.9,
      totalReviews: 87,
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date('2026-04-01')
    });
    console.log('🏪 Businesses created');

    // Create Users
    const user1 = await User.create({
      name: 'Ayşe Yılmaz',
      email: 'ayse@gmail.com',
      provider: 'google',
      providerId: 'google-123',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse'
    });

    const user2 = await User.create({
      name: 'Mehmet Kaya',
      email: 'mehmet@privaterelay.appleid.com',
      provider: 'apple',
      providerId: 'apple-456'
    });
    console.log('👥 Users created');

    // Create Categories for Business 1
    const cat1 = await Category.create({
      name: 'Sıcak İçecekler',
      iconUrl: 'https://api.dicebear.com/7.x/icons/svg?seed=hot',
      businessId: business1._id
    });

    const cat2 = await Category.create({
      name: 'Tatlılar',
      iconUrl: 'https://api.dicebear.com/7.x/icons/svg?seed=dessert',
      businessId: business1._id
    });
    console.log('📁 Categories created');

    // Create Collections
    const collection1 = await Collection.create({
      name: 'Seramik Koleksiyonu',
      description: 'El yapımı seramik ürünler',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400',
      businessId: business1._id
    });
    console.log('🎨 Collections created');

    // Create TL Products
    await ProductTL.create([
      {
        name: 'Latte',
        description: 'Espresso ve sütlü köpük ile hazırlanan klasik latte',
        categoryId: cat1._id,
        categoryName: cat1.name,
        priceTL: 80,
        stock: 20,
        imageUrl: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400',
        businessId: business1._id
      },
      {
        name: 'Americano',
        description: 'Yoğun espresso ve sıcak su ile hazırlanan klasik americano',
        categoryId: cat1._id,
        categoryName: cat1.name,
        priceTL: 70,
        stock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400',
        businessId: business1._id
      },
      {
        name: 'Cheesecake',
        description: 'Ev yapımı klasik cheesecake',
        categoryId: cat2._id,
        categoryName: cat2.name,
        priceTL: 95,
        stock: 8,
        imageUrl: 'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=400',
        businessId: business1._id
      }
    ]);
    console.log('☕ TL Products created');

    // Create Point Products
    await ProductPoint.create([
      {
        name: 'El Yapımı Seramik Kupa',
        description: 'Özel tasarım seramik kupa',
        collectionId: collection1._id,
        collectionName: collection1.name,
        pricePoint: 500,
        stock: 10,
        imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400',
        businessId: business1._id
      },
      {
        name: 'Seramik Tabak',
        description: 'El yapımı dekoratif tabak',
        collectionId: collection1._id,
        collectionName: collection1.name,
        pricePoint: 800,
        stock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400',
        businessId: business1._id
      }
    ]);
    console.log('🎁 Point Products created');

    // Create Collection Sets
    const collectionSet1 = await CollectionSet.create({
      name: 'Seramik Koleksiyonu - Set A',
      description: 'Temel seramik ürün seti',
      category: 'Seramik',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400',
      products: [
        { 
          productName: 'El Yapımı Seramik Kupa', 
          quantity: 10, 
          pricePoint: 500,
          imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400'
        },
        { 
          productName: 'Seramik Tabak', 
          quantity: 5, 
          pricePoint: 800,
          imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400'
        },
        { 
          productName: 'Seramik Kase', 
          quantity: 5, 
          pricePoint: 600,
          imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400'
        }
      ],
      totalItems: 20
    });
    console.log('📦 Collection Sets created');

    // Create Shipment
    await Shipment.create({
      collectionSetId: collectionSet1._id,
      collectionSetName: collectionSet1.name,
      businessId: business1._id,
      businessName: business1.name,
      businessAddress: business1.address,
      businessPhone: business1.phone,
      status: 'delivered',
      trackingNumber: 'TRK123456789',
      shippingCompany: 'Aras Kargo',
      totalItems: 20,
      products: collectionSet1.products,
      shippedAt: new Date('2026-02-01T09:00:00Z'),
      deliveredAt: new Date('2026-02-03T14:30:00Z')
    });
    console.log('🚚 Shipments created');

    // Create Loyalty
    await Loyalty.create({
      userId: user1._id,
      businessId: business1._id,
      points: 120
    });
    console.log('⭐ Loyalty points created');

    // Create Sample Order
    const products = await ProductTL.find({ businessId: business1._id }).limit(2);
    await OrderTL.create({
      businessId: business1._id,
      userId: user1._id,
      items: [
        {
          productId: products[0]._id,
          productName: products[0].name,
          quantity: 2,
          unitPrice: products[0].priceTL,
          note: 'Şekersiz lütfen'
        }
      ],
      totalTL: products[0].priceTL * 2,
      paymentMethod: 'credit_card',
      status: 'completed',
      pointsEarned: Math.floor(products[0].priceTL * 2 * 0.1)
    });
    console.log('🛒 Sample orders created');

    // Create Sample Logs
    const now = new Date();
    const sampleLogs = [];
    
    // Son 60 günden loglar (bazıları 30 günden eski olacak)
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 60); // 0-60 gün arası
      const logDate = new Date(now);
      logDate.setDate(logDate.getDate() - daysAgo);
      logDate.setHours(Math.floor(Math.random() * 24));
      logDate.setMinutes(Math.floor(Math.random() * 60));
      
      const levels = ['info', 'warning', 'error', 'success'];
      const categories = ['auth', 'business', 'collection', 'shipment', 'order', 'system', 'api'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      const messages = {
        auth: [
          'Kullanıcı giriş yaptı',
          'Başarısız giriş denemesi',
          'Token yenilendi',
          'Kullanıcı çıkış yaptı'
        ],
        business: [
          'Yeni işletme oluşturuldu',
          'İşletme bilgileri güncellendi',
          'İşletme durumu değiştirildi',
          'İşletme silindi'
        ],
        collection: [
          'Yeni koleksiyon oluşturuldu',
          'Koleksiyon güncellendi',
          'Koleksiyon silindi',
          'Koleksiyona ürün eklendi'
        ],
        shipment: [
          'Yeni sevkiyat oluşturuldu',
          'Sevkiyat durumu güncellendi',
          'Sevkiyat teslim edildi',
          'Sevkiyat iptal edildi'
        ],
        order: [
          'Yeni sipariş alındı',
          'Sipariş tamamlandı',
          'Sipariş iptal edildi',
          'Ödeme başarılı'
        ],
        system: [
          'Sistem başlatıldı',
          'Veritabanı bağlantısı kuruldu',
          'Otomatik yedekleme tamamlandı',
          'Sistem güncellemesi yapıldı'
        ],
        api: [
          'API isteği başarılı',
          'Rate limit aşıldı',
          'API hatası oluştu',
          'Yeni API endpoint eklendi'
        ]
      };
      
      const categoryMessages = messages[category];
      const message = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
      
      sampleLogs.push({
        level,
        message,
        category,
        businessId: Math.random() > 0.5 ? business1._id : null,
        userId: Math.random() > 0.5 ? user1._id : null,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: logDate,
        updatedAt: logDate
      });
    }
    
    await Log.insertMany(sampleLogs);
    console.log('📋 Sample logs created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@system.com / admin123');
    console.log('Business: info@kahvedukkani.com / business123');
    console.log('\n⚠️  Note: OAuth users (Google/Apple) need to authenticate through their providers');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
