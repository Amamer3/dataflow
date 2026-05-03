import express from 'express';
import { adminMiddleware, AuthRequest } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

// GET /api/admin/stats - Provides summary statistics for the admin dashboard
router.get('/stats', adminMiddleware, async (_req: AuthRequest, res) => {
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

// GET /api/admin/logs - Fetches system activity and monitoring logs (Admin & User actions)
router.get('/logs', adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    // 1. Fetch Admin Audit Logs
    const { data: adminLogs, error: adminErr } = await supabaseAdmin
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // 2. Fetch User Transaction Activity
    const { data: userActions, error: userErr } = await supabaseAdmin
      .from('transactions')
      .select('id, created_at, type, status, amount_pesewas, recipient_phone, user_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (adminErr || userErr) {
      console.error('Audit Log Error:', adminErr || userErr);
      throw new Error('Failed to fetch system logs');
    }

    // 3. Fetch profiles for all involved users
    const adminIds = adminLogs?.map(l => l.admin_id).filter((id): id is string => !!id) ?? [];
    const userIds = userActions?.map(a => a.user_id).filter((id): id is string => !!id) ?? [];

    const allUserIds = [...new Set([...adminIds, ...userIds])];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', allUserIds);

    // 4. Format Admin Logs
    const formattedAdminLogs = adminLogs?.map(log => {
      const profile = profiles?.find(p => p.id === log.admin_id);
      return {
        id: log.id,
        timestamp: log.created_at,
        type: 'ADMIN_ACTION',
        action: log.action,
        user: profile?.full_name || 'Admin',
        phone: profile?.phone || 'N/A',
        details: `${log.action} on ${log.resource_type}${log.resource_id ? ` (${log.resource_id})` : ''}`,
        metadata: log.details
      };
    }) ?? [];

    // 5. Format User Actions
    const formattedUserActions = userActions?.map(action => {
      const profile = profiles?.find(p => p.id === action.user_id);
      return {
        id: action.id,
        timestamp: action.created_at,
        type: 'USER_ACTIVITY',
        action: action.type.toUpperCase(),
        user: profile?.full_name || 'User',
        phone: profile?.phone || action.recipient_phone || 'N/A',
        details: `${action.type.replace('_', ' ')} ${action.status}: ${action.amount_pesewas / 100} GHS`,
        metadata: { status: action.status, amount: action.amount_pesewas }
      };
    }) ?? [];

    // 6. Merge and Sort
    const combinedLogs = [...formattedAdminLogs, ...formattedUserActions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    res.status(200).json(combinedLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/health - Provides system health metrics
router.get('/health', adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const { data: recentTransactions, error } = await supabaseAdmin
      .from('transactions')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const total = recentTransactions?.length ?? 0;
    const failed = recentTransactions?.filter(t => t.status === 'failed').length ?? 0;
    const errorRate = total > 0 ? (failed / total) * 100 : 0;

    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      errorRate: `${errorRate.toFixed(2)}%`,
      responseTime: '245ms', // Mocked for now as we don't have middleware tracking this
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
