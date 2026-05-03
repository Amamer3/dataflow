import express from 'express';
import { supabase } from '../integrations/supabase/client.js';
import { supabaseAdmin } from '../integrations/supabase/client.server.js';
import { authMiddleware, AuthRequest } from '../integrations/supabase/auth-middleware.js';

const router = express.Router();

// POST /api/auth/register - Creates a new user account
router.post('/register', async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
        },
      },
    });

    if (error) throw error;

    res.status(201).json({
      message: 'User registered successfully',
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login - Authenticates a user with email and password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.status(200).json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/logout - Invalidates the current session
router.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.status(200).json({ message: 'Logout successful' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/refresh - Refreshes an expired access token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw error;

    res.status(200).json({
      session: data.session,
      user: data.user,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/log-event - Records a login or logout event in the audit logs
router.post('/log-event', authMiddleware, async (req: AuthRequest, res) => {
  const { event } = req.body; // 'LOGIN' or 'LOGOUT'
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  if (!event || !['LOGIN', 'LOGOUT'].includes(event)) {
    return res.status(400).json({ error: 'Invalid event type. Must be LOGIN or LOGOUT.' });
  }

  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: userId,
      action: event,
      resource_type: 'AUTH',
      resource_id: userId,
      details: { 
        role: userRole,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(200).json({ message: 'Event logged successfully' });
  } catch (error: any) {
    console.error('Error logging auth event:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
