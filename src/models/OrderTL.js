const mongoose = require('mongoose');

const orderTLSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Kiosk için optional
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductTL' },
    productName: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    unitPoint: { type: Number, default: 0 }, // Puan ürünleri için
    note: String
  }],
  totalTL: { type: Number, required: true },
  totalPoint: { type: Number, default: 0 }, // Puan ürünleri toplamı
  paymentMethod: { type: String, enum: ['credit_card', 'cash', 'qr', 'kiosk'], required: true }, // 'kiosk' eklendi
  status: { type: String, enum: ['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'], default: 'pending' },
  pointsEarned: { type: Number, default: 0 },
  orderSource: { type: String, enum: ['mobile', 'kiosk', 'admin'], default: 'mobile' } // Sipariş kaynağı
}, {
  timestamps: true
});

orderTLSchema.index({ businessId: 1, createdAt: -1 });
orderTLSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderTL', orderTLSchema);
