const mongoose = require('mongoose');

const kioskSessionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  qrCode: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

kioskSessionSchema.index({ qrCode: 1 });
kioskSessionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('KioskSession', kioskSessionSchema);
