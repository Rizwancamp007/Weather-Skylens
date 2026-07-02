const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const historyRoutes = require('./routes/history');

const app = express();

// --------------- Security Middleware ---------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https://openweathermap.org", "https://*.tile.openstreetmap.org", "https://tile.openweathermap.org", "https://unpkg.com"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json());

// Rate limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// --------------- Static Files (Frontend) ---------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// --------------- API Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);

// --------------- SPA Fallback ---------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --------------- Global Error Handler ---------------
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 SkyLens server running on http://localhost:${PORT}`);
  });
};

startServer();
