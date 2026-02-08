const mongoose = require('mongoose');

const loyaltySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  points: { type: Number, default: 0 }
}, {
  timestamps: true
});

loyaltySchema.index({ userId: 1, businessId: 1 }, { unique: true });

module.exports = mongoose.model('Loyalty', loyaltySchema);
