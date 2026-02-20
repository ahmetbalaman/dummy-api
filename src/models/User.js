const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: String,
  avatarUrl: String,
  provider: { type: String, enum: ['google', 'apple'], required: true },
  providerId: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user'] },
  loyaltyPoints: { type: Number, default: 0 }, // Toplam puan
  isActive: { type: Boolean, default: true } // Hesap aktif mi?
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ providerId: 1, provider: 1 });

module.exports = mongoose.model('User', userSchema);
