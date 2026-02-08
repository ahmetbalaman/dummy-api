require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../models/Business');
const User = require('../models/User');
const ProductTL = require('../models/ProductTL');
const ProductPoint = require('../models/ProductPoint');
const OrderTL = require('../models/OrderTL');
const OrderPoint = require('../models/OrderPoint');

const addTestOrders = async () => {
  try {
    console.log('🛒 Adding test orders...');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing data
    const businesses = await Business.find();
    const users = await User.find();
    const productsTL = await ProductTL.find();
    const productsPoint = await ProductPoint.find({ businessId: { $ne: null } });

    if (businesses.length === 0 || users.length === 0) {
      console.log('❌ No businesses or users found. Please run seed script first.');
      process.exit(1);
    }

    const business = businesses[0];
    const user = users[0];

    // Create TL Orders
    const tlOrders = [];
    const statuses = ['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'];
    const paymentMethods = ['credit_card', 'cash', 'qr'];

    for (let i = 0; i < 10; i++) {
      const randomProducts = productsTL
        .filter(p => p.businessId.toString() === business._id.toString())
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      if (randomProducts.length === 0) continue;

      const items = randomProducts.map(p => ({
        productId: p._id,
        productName: p.name,
        quantity: Math.floor(Math.random() * 3) + 1,
        unitPrice: p.priceTL,
        note: Math.random() > 0.7 ? 'Özel not' : undefined
      }));

      const totalTL = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const pointsEarned = Math.floor(totalTL * 0.1);

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 7));

      tlOrders.push({
        businessId: business._id,
        userId: user._id,
        items,
        totalTL,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        pointsEarned,
        createdAt,
        updatedAt: createdAt
      });
    }

    if (tlOrders.length > 0) {
      await OrderTL.insertMany(tlOrders);
      console.log(`✅ Created ${tlOrders.length} TL orders`);
    }

    // Create Point Orders
    const pointOrders = [];

    for (let i = 0; i < 8; i++) {
      const randomProducts = productsPoint
        .filter(p => p.businessId && p.businessId.toString() === business._id.toString())
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 2) + 1);

      if (randomProducts.length === 0) continue;

      const items = randomProducts.map(p => ({
        productId: p._id,
        productName: p.name,
        quantity: Math.floor(Math.random() * 2) + 1,
        unitPoint: p.pricePoint,
        note: Math.random() > 0.7 ? 'Özel not' : undefined
      }));

      const totalPoint = items.reduce((sum, item) => sum + (item.quantity * item.unitPoint), 0);

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 7));

      pointOrders.push({
        businessId: business._id,
        userId: user._id,
        items,
        totalPoint,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt,
        updatedAt: createdAt
      });
    }

    if (pointOrders.length > 0) {
      await OrderPoint.insertMany(pointOrders);
      console.log(`✅ Created ${pointOrders.length} Point orders`);
    }

    console.log('\n✅ Test orders added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addTestOrders();
