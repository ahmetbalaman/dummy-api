const mongoose = require('mongoose');

const collectionSetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  imageUrl: String,
  products: [{
    productId: String,
    productName: String,
    description: String,
    pricePoint: Number,
    imageUrl: String
  }],
  totalItems: { type: Number, required: true }, // Ürün çeşit sayısı
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('CollectionSet', collectionSetSchema);
