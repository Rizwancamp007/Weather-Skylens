const express = require('express');
const { protect } = require('../middleware/auth');
const SearchHistory = require('../models/SearchHistory');

const router = express.Router();

// GET /api/history — Get user's search history (last 20)
router.get('/', protect, async (req, res) => {
  try {
    const history = await SearchHistory.find({ userId: req.user._id })
      .sort({ searchedAt: -1 })
      .limit(20)
      .lean();

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// DELETE /api/history/:id — Delete a single history entry
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await SearchHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({ message: 'History entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
});

// DELETE /api/history — Clear all history for user
router.delete('/', protect, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id });
    res.json({ message: 'All history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;
