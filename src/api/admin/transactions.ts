import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/transactions - Lists all system transactions with pagination and filtering
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { status, type, userId, limit = 50, offset = 0 } = req.query;

  try {
    // 1. Fetch transactions without profiles join
    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status as any);
    if (type) query = query.eq('type', type as any);
    if (userId) query = query.eq('user_id', userId as string);

    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ transactions: [], total: count ?? 0 });
    }

    // 2. Fetch profiles for all unique user_ids in the transactions
    const userIds = [...new Set(transactions.map(t => t.user_id))];
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds);

    if (profilesErr) {
      console.error('Error fetching profiles for transactions:', profilesErr);
      // We can still return transactions even if profiles fail
    }

    // 3. Manually merge profiles into transactions
    const mergedTransactions = transactions.map(t => ({
      ...t,
      profiles: profiles?.find(p => p.id === t.user_id) || null
    }));

    res.status(200).json({
      transactions: mergedTransactions,
      total: count
    });
  } catch (error: any) {
    console.error('Admin Transactions API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/transactions/:id - Updates a transaction's status or retry count
router.patch('/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, retry_count, failure_reason } = req.body;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update({ status, retry_count, failure_reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

export default router;
