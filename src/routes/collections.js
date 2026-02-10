const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const CollectionSet = require('../models/CollectionSet');

// Get all collections (optionally filter by businessId)
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    const query = { isActive: true };
    
    if (businessId) {
      query.businessId = businessId;
    }

    const collections = await Collection.find(query)
      .populate('businessId', 'name logoUrl')
      .sort({ name: 1 });

    res.json({ collections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get collection by ID
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('businessId', 'name logoUrl');

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all collection sets
router.get('/sets/all', async (req, res) => {
  try {
    const collectionSets = await CollectionSet.find({ isActive: true })
      .sort({ name: 1 });

    res.json({ collectionSets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get collection set by ID
router.get('/sets/:id', async (req, res) => {
  try {
    const collectionSet = await CollectionSet.findById(req.params.id);

    if (!collectionSet) {
      return res.status(404).json({ error: 'Collection set not found' });
    }

    res.json(collectionSet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
