const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  iconUrl: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

categorySchema.index({ businessId: 1 });

module.exports = mongoose.model('Category', categorySchema);
