import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';

const router = express.Router();

// Mock providers data for now as there is no providers table in the DB
let mockProviders = [
  { id: '1', name: 'Hubtel', slug: 'hubtel', active: true, config: { apiKey: '***' } },
  { id: '2', name: 'Datamart', slug: 'datamart', active: false, config: { apiKey: '***' } },
];

// GET /api/admin/providers - Retrieves all configured data providers
router.get('/', adminMiddleware, async (req: AuthRequest, res) => {
  res.status(200).json(mockProviders);
});

// POST /api/admin/providers - Adds a new data provider
router.post('/', adminMiddleware, async (req: AuthRequest, res) => {
  const newProvider = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
  mockProviders.push(newProvider);
  res.status(201).json(newProvider);
});

// PATCH /api/admin/providers/:id - Updates provider configuration or active status
router.patch('/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = mockProviders.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  mockProviders[index] = { ...mockProviders[index], ...updates };
  res.status(200).json(mockProviders[index]);
});

export default router;
