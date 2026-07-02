# SkyLens — Premium Weather Application

SkyLens is a modern, high-performance, full-stack weather application built with the MERN stack (MongoDB, Express, React/Vanilla, Node.js). It offers real-time weather tracking, 5-day forecasts, air quality index mapping, and interactive Leaflet maps, all encased in a stunning light-glassmorphism aesthetic.

## 🚀 Features

- **Real-Time Data**: Current weather, 24-hour temperature charts (Canvas), and 5-day forecasts via OpenWeatherMap.
- **Air Quality**: Real-time AQI tracking including PM2.5, PM10, O3, CO, NO2, and SO2 levels.
- **Interactive Maps**: Integrated Leaflet.js map with layers for Temperature, Clouds, and Precipitation.
- **Dynamic UI**: Backgrounds dynamically change based on weather conditions (rain, snow, thunderstorms with lightning flashes).
- **Secure Backend**: Node.js API proxy to hide OpenWeather API keys from the client, protected by Helmet and Express Rate Limit.
- **Authentication**: JWT-based authentication for saving favorite cities and user preferences (theme/units).
- **PWA Ready**: Offline caching support via Service Workers and installable as a native app.
- **Responsive**: Fully responsive grid design leveraging CSS Variables and Grid/Flexbox layouts.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Glassmorphism, CSS Variables, Animations)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: bcryptjs (hashing), jsonwebtoken (JWT auth), helmet, express-rate-limit, cors
- **APIs**: OpenWeatherMap API, Leaflet.js (Maps)

## 📦 Installation & Setup

1. **Clone the repository**
2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```
3. **Environment Configuration**
   In the `server` directory, configure your `.env` file with your credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   OPENWEATHER_API_KEY=your_openweathermap_api_key_here
   MONGO_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_secure_jwt_secret_here
   ```
4. **Run the Server**
   ```bash
   node server.js
   ```
5. **Access the App**
   Open your browser and navigate to `http://localhost:5000`. The server automatically serves the static frontend files located in the `public` directory.

## 🎨 Design Philosophy
SkyLens aims for a "premium" feel by steering away from generic designs. It uses a **Light Glassmorphism** theme, incorporating soft pastels, blurred translucent cards, and smooth CSS-driven background animations that react to the current weather condition, providing a highly immersive user experience without relying heavily on external component libraries.

# License
This website is built with ☕ & 🤍 by Rizwan Khan.

