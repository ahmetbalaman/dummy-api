const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'success'], 
    default: 'info',
    index: true 
  },
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['auth', 'business', 'collection', 'shipment', 'order', 'system', 'api'], 
    default: 'system',
    index: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient querying
logSchema.index({ createdAt: -1 });
logSchema.index({ level: 1, createdAt: -1 });
logSchema.index({ category: 1, createdAt: -1 });

// TTL index - 30 gün sonra otomatik sil
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Log', logSchema);
