import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/stats - Provides summary statistics for the admin dashboard
router.get('/stats', adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { count: usersCount, error: usersErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeBundlesCount, error: bundlesErr } = await supabaseAdmin
      .from('bundles')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { data: recentTransactions, error: txnsErr } = await supabaseAdmin
      .from('transactions')
      .select('amount_pesewas, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(100);

    const { count: totalTransactionsCount, error: totalTxnsErr } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (usersErr || bundlesErr || txnsErr || totalTxnsErr) {
      throw new Error('Failed to fetch stats');
    }

    // Fetch profiles for manual merge to avoid relationship errors
    const userIds = [...new Set(recentTransactions?.map(t => t.user_id) ?? [])];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds);

    const mergedRecentTransactions = recentTransactions?.map(t => ({
      amount_pesewas: t.amount_pesewas,
      status: t.status,
      created_at: t.created_at,
      profiles: profiles?.find(p => p.id === t.user_id) || null
    })) ?? [];

    const totalRevenue = recentTransactions
      ?.filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount_pesewas, 0) ?? 0;

    const recentTransactionsCount = recentTransactions?.length ?? 0;
    const successTransactions = recentTransactions?.filter(t => t.status === 'success').length ?? 0;
    const failedTransactions = recentTransactions?.filter(t => t.status === 'failed').length ?? 0;
    const successRate = recentTransactionsCount > 0 ? (successTransactions / recentTransactionsCount) * 100 : 0;

    res.status(200).json({
      totalUsers: usersCount ?? 0,
      activeBundles: activeBundlesCount ?? 0,
      totalTransactions: totalTransactionsCount ?? 0,
      totalRevenue: totalRevenue,
      successRate: successRate,
      failedTransactions: failedTransactions,
      recentTransactions: mergedRecentTransactions
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
