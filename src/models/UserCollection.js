const mongoose = require('mongoose');

const userCollectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  currentCount: { type: Number, default: 0 },
  targetCount: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date
}, {
  timestamps: true
});

userCollectionSchema.index({ userId: 1, collectionId: 1 }, { unique: true });
userCollectionSchema.index({ userId: 1 });

module.exports = mongoose.model('UserCollection', userCollectionSchema);
