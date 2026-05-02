import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/transactions - Lists all system transactions with pagination and filtering
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { status, type, userId, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('transactions')
    .select(`
      *,
      profiles (
        full_name,
        phone 
      )
    `, { count: 'exact' });

  if (status) query = query.eq('status', status as any);
  if (type) query = query.eq('type', type as any);
  if (userId) query = query.eq('user_id', userId as string);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ data, count });
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
