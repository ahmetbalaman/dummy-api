const mongoose = require('mongoose');
const Log = require('../models/Log');
require('dotenv').config();

// Aylık log temizleme scripti
async function cleanupOldLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı kuruldu');

    // 30 günden eski logları sil
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Log.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`✅ ${result.deletedCount} adet eski log silindi`);
    console.log(`📅 ${thirtyDaysAgo.toLocaleDateString('tr-TR')} tarihinden önceki loglar temizlendi`);

    await mongoose.connection.close();
    console.log('MongoDB bağlantısı kapatıldı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Log temizleme hatası:', error);
    process.exit(1);
  }
}

cleanupOldLogs();
