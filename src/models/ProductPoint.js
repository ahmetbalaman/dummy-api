const mongoose = require('mongoose');

const productPointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  collectionName: String,
  pricePoint: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  imageUrl: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

productPointSchema.index({ businessId: 1 });
productPointSchema.index({ collectionId: 1 });

module.exports = mongoose.model('ProductPoint', productPointSchema);
