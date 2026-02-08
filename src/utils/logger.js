const Log = require('../models/Log');

/**
 * Log oluşturma fonksiyonu
 * @param {string} level - Log seviyesi: info, warning, error, success
 * @param {string} message - Log mesajı
 * @param {object} options - Ek bilgiler
 */
async function createLog(level, message, options = {}) {
  try {
    const logData = {
      level,
      message,
      category: options.category || 'system',
      userId: options.userId,
      businessId: options.businessId,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    };

    await Log.create(logData);
    
    // Console'a da yazdır
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] [${level.toUpperCase()}] [${logData.category}] ${message}`);
  } catch (error) {
    console.error('Failed to create log:', error);
  }
}

// Kısa yollar
const logger = {
  info: (message, options) => createLog('info', message, options),
  warning: (message, options) => createLog('warning', message, options),
  error: (message, options) => createLog('error', message, options),
  success: (message, options) => createLog('success', message, options),
  
  // Kategori bazlı loglar
  auth: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'auth' }),
  
  business: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'business' }),
  
  collection: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'collection' }),
  
  shipment: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'shipment' }),
  
  order: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'order' }),
  
  system: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'system' }),
  
  api: (message, level = 'info', options = {}) => 
    createLog(level, message, { ...options, category: 'api' })
};

/**
 * Eski logları temizleme (manuel)
 * @param {number} days - Kaç günden eski loglar silinecek (0 = tümünü sil)
 */
async function cleanOldLogs(days = 30) {
  try {
    let result;
    
    if (days === 0) {
      // Tüm logları sil
      result = await Log.deleteMany({});
      console.log(`🗑️  Tüm loglar silindi: ${result.deletedCount} kayıt`);
    } else {
      // Belirtilen günden eski logları sil
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      result = await Log.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      
      console.log(`🗑️  ${result.deletedCount} eski log silindi (${days} günden eski)`);
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error('Failed to clean old logs:', error);
    return 0;
  }
}

/**
 * Log istatistikleri
 */
async function getLogStats() {
  try {
    const [total, byLevel, byCategory] = await Promise.all([
      Log.countDocuments(),
      Log.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),
      Log.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total,
      byLevel: byLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Failed to get log stats:', error);
    return { total: 0, byLevel: {}, byCategory: {} };
  }
}

module.exports = {
  logger,
  createLog,
  cleanOldLogs,
  getLogStats
};
