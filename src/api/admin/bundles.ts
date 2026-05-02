import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/bundles - Fetches all data bundles for management
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select('*')
    .order('network', { ascending: true })
    .order('price_pesewas', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Map fields to match frontend expectation
  const mappedBundles = data?.map(bundle => ({
    ...bundle,
    data_amount: bundle.volume_mb >= 1024 
      ? `${(bundle.volume_mb / 1024).toFixed(1)}GB` 
      : `${bundle.volume_mb}MB`,
    price_ghs: bundle.price_pesewas / 100,
    updated_at: bundle.created_at // fallback if updated_at is missing in DB
  }));

  res.status(200).json(mappedBundles);
});

// POST /api/admin/bundles - Creates a new data bundle
router.post('/', adminMiddleware, async (req: AuthRequest, res) => {
  const bundle = req.body;

  const { data, error } = await supabaseAdmin
    .from('bundles')
    .insert(bundle)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// PATCH /api/admin/bundles/:id - Updates an existing data bundle
router.patch('/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabaseAdmin
    .from('bundles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

export default router;
