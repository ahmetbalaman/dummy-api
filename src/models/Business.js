const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  description: String,
  address: String,
  phone: String,
  logoUrl: String,
  coverImageUrl: String,
  themeColor: { type: String, default: '#667eea' }, // Primary branding color
  secondaryColor: { type: String, default: '#764ba2' }, // Secondary color for gradients
  notificationSound: { type: String, enum: ['beep', 'bell', 'chime', 'none'], default: 'beep' }, // Order notification sound
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    address: String,
    city: String,
    district: String,
    postalCode: String
  },
  workingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  subscriptionStatus: { type: String, enum: ['active', 'inactive', 'trial'], default: 'trial' },
  subscriptionEndsAt: Date,
  isActive: { type: Boolean, default: true },
  role: { type: String, default: 'business', enum: ['business'] }
}, {
  timestamps: true
});

businessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

businessSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

businessSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index for nearby search

module.exports = mongoose.model('Business', businessSchema);
