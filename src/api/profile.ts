import express from 'express';
import { authMiddleware, AuthRequest } from '../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/profile - Retrieves the authenticated user's profile information
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

// PATCH /api/profile - Updates the user's name or phone number
router.patch('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { full_name, phone } = req.body;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name, phone, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

export default router;
