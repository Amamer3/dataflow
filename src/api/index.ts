import express from 'express';
import paystackKeyRouter from './paystack-public-key.js';
import profileRoutes from './profile.js';
import authRoutes from './auth.js';
import { authMiddleware, AuthRequest } from '../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../integrations/supabase/client.server.js';

const router = express.Router();

// Profile routes
router.use('/profile', profileRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Data Purchase general routes
// GET /api/bundles - Lists all active data bundles available for purchase
router.get('/bundles', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select('*')
    .eq('active', true)
    .order('network', { ascending: true })
    .order('price_pesewas', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

// GET /api/transactions - Shows the authenticated user's personal transaction history
router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

// Paystack public key
router.use('/', paystackKeyRouter);

export default router;