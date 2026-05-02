import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { applyWalletDelta } from '../../server/wallet.server.js';

const router = express.Router();

// GET /api/admin/users - Retrieves a list of all users
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { search } = req.query;
  
  let query = supabaseAdmin
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      role,
      created_at,
      wallets (
        balance_pesewas
      )
    `);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

// POST /api/admin/users/wallet - Credits or debits a user's wallet
router.post('/wallet', adminMiddleware, async (req: AuthRequest, res) => {
  const { userId, amountPesewas, reason } = req.body;

  if (!userId || amountPesewas === undefined || !reason) {
    return res.status(400).json({ error: 'Missing required fields: userId, amountPesewas, reason' });
  }

  try {
    const result = await applyWalletDelta({
      userId,
      deltaPesewas: amountPesewas,
      reason: 'adjustment', // The user requested "adjustment" in the list of reasons or just general adjustment
      // We can use the reason from body if we map it correctly, but applyWalletDelta expects specific LedgerReason
    });
    res.status(200).json({ message: 'Wallet updated successfully', balanceAfter: result.balanceAfter });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/admin/users/status - Updates a user's role (e.g., suspending an account)
router.post('/status', adminMiddleware, async (req: AuthRequest, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing required fields: userId, role' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'User status updated successfully' });
});

export default router;
