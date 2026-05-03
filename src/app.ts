import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiReference } from '@scalar/express-api-reference';
import buyDataRoutes from './api/buy-data/index.js';
import walletRoutes from './api/wallet/index.js';
import adminRoutes from './api/admin/index.js';
import apiRouter from './api/index.js';
import paystackWebhook from './api/webhooks/paystack.js';
import { openApiSpec } from './openapi.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Backend server is running', version: '1.0.0' });
});

// Webhooks
app.use('/api/webhooks', paystackWebhook);

// API docs
app.use(
  '/docs',
  apiReference({
    spec: {
      content: openApiSpec,
    },
  } as any)
);
app.get('/docs.json', (_req, res) => res.json(openApiSpec));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/buy-data', buyDataRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', apiRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});