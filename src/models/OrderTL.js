const mongoose = require('mongoose');

const orderTLSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductTL' },
    productName: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    note: String
  }],
  totalTL: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['credit_card', 'cash', 'qr'], required: true },
  status: { type: String, enum: ['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'], default: 'pending' },
  pointsEarned: { type: Number, default: 0 }
}, {
  timestamps: true
});

orderTLSchema.index({ businessId: 1, createdAt: -1 });
orderTLSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderTL', orderTLSchema);
