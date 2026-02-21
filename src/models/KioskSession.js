const mongoose = require('mongoose');

const kioskSessionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // QR okutulduğunda set edilir
  qrCode: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

kioskSessionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('KioskSession', kioskSessionSchema);
