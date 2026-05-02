import express from 'express';
import topupRouter from './topup.js';
import { authMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/wallet - Fetches the current user's wallet balance
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('balance_pesewas, currency')
    .eq('user_id', userId)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

// GET /api/wallet/ledger - Retrieves the history of wallet transactions (ledger)
router.get('/ledger', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const { data, error } = await supabaseAdmin
    .from('wallet_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

router.use('/', topupRouter);

export default router;