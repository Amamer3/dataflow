import express from 'express';
import cors from 'cors';
import buyDataRoutes from './api/buy-data/index.js';
import walletRoutes from './api/wallet/index.js';
import paystackKeyRouter from './api/paystack-public-key.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend server is running', version: '1.0.0' });
});

// Routes
app.use('/api/buy-data', buyDataRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', paystackKeyRouter);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});