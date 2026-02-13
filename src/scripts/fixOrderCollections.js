/**
 * Fix existing OrderPoint records to add missing collectionId
 * Run this once to fix historical data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const OrderPoint = require('../models/OrderPoint');
const ProductPoint = require('../models/ProductPoint');

async function fixOrderCollections() {
  try {
    console.log('🔧 Sipariş koleksiyon bilgileri düzeltiliyor...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kafele');
    console.log('✅ MongoDB bağlantısı kuruldu\n');

    // Find all OrderPoint records
    const orders = await OrderPoint.find({});
    console.log(`📦 Toplam ${orders.length} sipariş bulundu\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      let orderUpdated = false;

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];

        // Skip if already has collectionId
        if (item.collectionId) {
          continue;
        }

        // Fetch product to get collectionId
        const product = await ProductPoint.findById(item.productId);

        if (product && product.collectionId) {
          console.log(`   Ürün: ${item.productName}`);
          console.log(`     Koleksiyon ekleniyor: ${product.collectionId}`);

          // Update item with collectionId
          order.items[i].collectionId = product.collectionId;
          orderUpdated = true;
        } else {
          console.log(`   ⚠️ Ürün bulunamadı veya koleksiyonu yok: ${item.productName}`);
        }
      }

      if (orderUpdated) {
        await order.save();
        updatedCount++;
        console.log(`✅ Sipariş güncellendi: ${order._id}\n`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Özet:');
    console.log(`   Güncellenen sipariş: ${updatedCount}`);
    console.log(`   Atlanan sipariş: ${skippedCount}`);
    console.log(`   Toplam: ${orders.length}`);

    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixOrderCollections();
