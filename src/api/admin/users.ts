import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { applyWalletDelta } from '../../server/wallet.server.js';

const router = express.Router();

// GET /api/admin/users - Retrieves a list of all users
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { search } = req.query;
  
  try {
    // 1. Fetch profiles first
    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, role, created_at');

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesErr } = await query.order('created_at', { ascending: false });

    if (profilesErr) throw profilesErr;

    if (!profiles || profiles.length === 0) {
      return res.status(200).json([]);
    }

    // 2. Fetch wallets for these users
    const userIds = profiles.map(p => p.id);
    const { data: wallets, error: walletsErr } = await supabaseAdmin
      .from('wallets')
      .select('user_id, balance_pesewas, currency, updated_at')
      .in('user_id', userIds);

    if (walletsErr) {
      console.error('Error fetching wallets for users:', walletsErr);
    }

    // 3. Fetch auth users to get emails
    const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
    }

    // 4. Merge all data
    const mergedUsers = profiles.map(profile => {
      const authUser = authUsers?.find(u => u.id === profile.id);
      const wallet = wallets?.find(w => w.user_id === profile.id);
      
      return {
        ...profile,
        wallets: wallet || null,
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

    // Log action
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: req.user!.userId,
      action: 'ADJUST_WALLET',
      resource_type: 'USER',
      resource_id: userId,
      details: { amountPesewas, reason, balanceAfter: result.balanceAfter }
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

  // Log action
  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: req.user!.userId,
    action: 'UPDATE_USER_ROLE',
    resource_type: 'USER',
    resource_id: userId,
    details: { newRole: role }
  });

  res.status(200).json({ message: 'User status updated successfully' });
});

export default router;
