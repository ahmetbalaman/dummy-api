const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  imageUrl: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' }, // Optional - null ise genel koleksiyon
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

collectionSchema.index({ businessId: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
