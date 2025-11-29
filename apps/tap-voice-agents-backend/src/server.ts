import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tap-voice-agents-backend',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TAP Voice Agents Backend',
    version: '0.1.0',
    endpoints: {
      health: 'GET /health',
      cart: {
        add: 'POST /api/cart/add',
        view: 'GET /api/cart/view',
        clear: 'POST /api/cart/clear',
      },
      checkout: {
        initiate: 'POST /api/checkout/initiate',
        session: 'GET /api/checkout/session/:checkoutId',
      },
      consent: {
        capture: 'POST /api/consent/capture',
        verify: 'GET /api/consent/verify/:checkoutId',
      },
      payment: {
        execute: 'POST /api/payment/execute',
      },
      merchant: {
        checkout: 'POST /merchant/checkout',
      },
      mockVisa: {
        authorize: 'POST /mock-visa/authorize',
      },
      webhooks: {
        cart: 'POST /webhooks/elevenlabs/cart',
        payment: 'POST /webhooks/elevenlabs/payment',
      },
      events: {
        stream: 'GET /api/events/stream',  // SSE endpoint for real-time updates
      },
    },
  });
});

// Import route handlers
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import paymentRoutes from './routes/payment.js';
import merchantRoutes from './routes/merchant.js';
import elevenlabsRoutes from './routes/elevenlabs.js';

// Mount routes
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/consent', checkoutRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/events', merchantRoutes);
app.use('/merchant', merchantRoutes);
app.use('/webhooks/elevenlabs', elevenlabsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`\n🚀 TAP Voice Agents Backend`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Frontend: ${config.frontendUrl}`);
  console.log(`   OBA Verifier: ${config.obaVerifierUrl}`);
  console.log(`\n✅ Server is running\n`);
});

