const mongoose = require('mongoose');

const productTLSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categoryName: String,
  priceTL: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  imageUrl: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

productTLSchema.index({ businessId: 1 });
productTLSchema.index({ categoryId: 1 });

module.exports = mongoose.model('ProductTL', productTLSchema);
