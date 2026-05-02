import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { applyWalletDelta } from '../../server/wallet.server.js';

const router = express.Router();

// GET /api/admin/users - Retrieves a list of all users
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { search } = req.query;
  
  try {
    // Try fetching with wallets first
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        role,
        created_at,
        wallets (
          balance_pesewas,
          currency,
          updated_at
        )
      `);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    let { data: profiles, error: profilesErr } = await query.order('created_at', { ascending: false });

    if (profilesErr) {
      console.error('Error fetching profiles with wallets:', profilesErr);
      // Fallback: fetch without wallets
      const fallbackQuery = supabaseAdmin.from('profiles').select('id, full_name, phone, role, created_at');
      if (search) fallbackQuery.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error: fbErr } = await fallbackQuery.order('created_at', { ascending: false });
      if (fbErr) throw fbErr;
      profiles = data;
    }

    // Fetch auth users to get emails
    const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
      // We can still return profiles even if auth users fail
    }

    // Merge profiles with auth user data
    const mergedUsers = profiles?.map(profile => {
      const authUser = authUsers?.find(u => u.id === profile.id);
      return {
        ...profile,
        // Ensure wallets is an object, not an array (Supabase returns an array for 1-to-1 if not specified)
        wallets: Array.isArray(profile.wallets) ? profile.wallets[0] || null : profile.wallets,
        auth_users: {
          email: authUser?.email || 'N/A',
          created_at: authUser?.created_at || profile.created_at
        }
      };
    });

    res.status(200).json(mergedUsers);
  } catch (error: any) {
    console.error('Admin Users API Error:', error);
    res.status(500).json({ error: error.message });
  }
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
