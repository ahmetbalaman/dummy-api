const mongoose = require('mongoose');

const collectionSetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  products: [{
    productName: String,
    quantity: Number,
    pricePoint: Number
  }],
  totalItems: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('CollectionSet', collectionSetSchema);
