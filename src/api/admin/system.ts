import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/stats - Provides summary statistics for the admin dashboard
router.get('/stats', adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: usersCount, error: usersErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: activeBundlesCount, error: bundlesErr } = await supabaseAdmin
      .from('bundles')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { data: recentTransactions, error: txnsErr } = await supabaseAdmin
      .from('transactions')
      .select('amount_pesewas, status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (usersErr || bundlesErr || txnsErr) {
      throw new Error('Failed to fetch stats');
    }

    const totalRevenue = recentTransactions
      ?.filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount_pesewas, 0) ?? 0;

    res.status(200).json({
      usersCount: usersCount ?? 0,
      activeBundlesCount: activeBundlesCount ?? 0,
      recentRevenuePesewas: totalRevenue,
      transactionSummary: {
        total: recentTransactions?.length ?? 0,
        success: recentTransactions?.filter(t => t.status === 'success').length ?? 0,
        failed: recentTransactions?.filter(t => t.status === 'failed').length ?? 0,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/logs - Fetches system activity and monitoring logs
router.get('/logs', adminMiddleware, async (req: AuthRequest, res) => {
  // Mocking logs for now as there's no dedicated logs table
  const mockLogs = [
    { timestamp: new Date().toISOString(), level: 'info', message: 'Admin accessed stats dashboard' },
    { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'warn', message: 'Provider Hubtel returned 500 error' },
    { timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'info', message: 'New user registered: 0244123456' },
  ];
  res.status(200).json(mockLogs);
});

export default router;
