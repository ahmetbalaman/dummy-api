const mongoose = require('mongoose');

const orderPointSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductPoint' },
    productName: String,
    quantity: { type: Number, required: true },
    unitPoint: { type: Number, required: true },
    unitPrice: { type: Number, default: 0 }, // TL ürünleri için
    note: String
  }],
  totalPoint: { type: Number, required: true },
  totalTL: { type: Number, default: 0 }, // TL ürünleri toplamı
  paymentMethod: { type: String, default: 'point' }, // Puan siparişleri için
  status: { type: String, enum: ['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'], default: 'pending' },
  orderSource: { type: String, enum: ['mobile', 'kiosk', 'admin'], default: 'mobile' }
}, {
  timestamps: true
});

orderPointSchema.index({ businessId: 1, createdAt: -1 });
orderPointSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderPoint', orderPointSchema);
