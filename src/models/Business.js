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
  workingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
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

businessSchema.index({ email: 1 });

module.exports = mongoose.model('Business', businessSchema);
