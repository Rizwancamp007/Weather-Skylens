const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please fill in all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      favorites: user.favorites,
      unit: user.unit,
      theme: user.theme,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      favorites: user.favorites,
      unit: user.unit,
      theme: user.theme,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    favorites: req.user.favorites,
    unit: req.user.unit,
    theme: req.user.theme,
  });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, unit, theme } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (unit && ['metric', 'imperial'].includes(unit)) user.unit = unit;
    if (theme && ['light', 'dark'].includes(theme)) user.theme = theme;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      favorites: user.favorites,
      unit: user.unit,
      theme: user.theme,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/favorites
router.put('/favorites', protect, async (req, res) => {
  try {
    const { city, action } = req.body; // action: 'add' or 'remove'

    if (!city || !action) {
      return res.status(400).json({ error: 'City and action required' });
    }

    const user = req.user;
    const cityLower = city.toLowerCase().trim();

    if (action === 'add') {
      if (user.favorites.length >= 10) {
        return res.status(400).json({ error: 'Maximum 10 favorites allowed' });
      }
      if (!user.favorites.map((f) => f.toLowerCase()).includes(cityLower)) {
        user.favorites.push(city.trim());
      }
    } else if (action === 'remove') {
      user.favorites = user.favorites.filter(
        (f) => f.toLowerCase() !== cityLower
      );
    }

    await user.save();
    res.json({ favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
