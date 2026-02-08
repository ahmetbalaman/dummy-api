const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  collectionSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionSet', required: true },
  collectionSetName: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  businessName: String,
  businessAddress: String,
  businessPhone: String,
  status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'cancelled'], default: 'pending' },
  trackingNumber: String,
  shippingCompany: String,
  totalItems: { type: Number, required: true },
  products: [{
    productId: String,
    productName: String,
    quantity: Number
  }],
  notes: String,
  shippedAt: Date,
  deliveredAt: Date,
  estimatedDeliveryAt: Date
}, {
  timestamps: true
});

shipmentSchema.index({ businessId: 1, createdAt: -1 });
shipmentSchema.index({ status: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
