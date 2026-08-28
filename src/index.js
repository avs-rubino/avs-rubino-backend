require('dotenv/config');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const contentRoutes = require('./routes/content');
const uploadRoutes = require('./routes/upload');
const publicRoutes = require('./routes/public');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Protezione Security Headers HTTP
app.use(helmet({ crossOriginResourcePolicy: false }));

// Abilita trust proxy per leggere correttamente l'IP del client su Cloud Run / GCP Load Balancer
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://avsrubino.it',
  'https://avs-rubino.it',
  'https://ambulatorioveterinariospecialisticorubino.it',
  'https://vet-clinics-493413.web.app',
  'https://vet-clinics-493413.firebaseapp.com',
  'https://vet-clinics-admin-panel.web.app',
  'https://vet-clinics-admin-panel.firebaseapp.com',
  'https://vet-clinics-voice-pwa.web.app',
  'https://vet-clinics-voice-pwa.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Accesso bloccato dalle regole CORS. Origin non autorizzata.'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Rate Limiter per gli endpoint pubblici (max 100 richieste ogni 15 minuti)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste da questo IP, riprova più tardi.' }
});

// Rate Limiter per gli endpoint di amministrazione (max 30 richieste ogni 15 minuti)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite di operazioni admin raggiunto per questo IP, riprova più tardi.' }
});

// Health Check Endpoint (utilizzato da Cloud Run e Uptime Monitors)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/admin/content', adminLimiter, authMiddleware, contentRoutes);
app.use('/api/admin/upload', adminLimiter, authMiddleware, uploadRoutes);
app.use('/api/public/content', publicLimiter, publicRoutes);

// Middleware di gestione errori centralizzata (deve essere l'ultimo app.use)
app.use(errorHandler);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});