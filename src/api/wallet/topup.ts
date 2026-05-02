import express from 'express';
import { z } from 'zod';
import { getUserIdFromAccessToken } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';

const router = express.Router();

const schema = z.object({
  accessToken: z.string().min(1), 
  amountGhs: z.number().min(5).max(10000),
});

router.post('/topup', async (req, res) => {
  const body = req.body;
  const data = schema.safeParse(body);
  if (!data.success) {
    res.status(400).json({ error: data.error.errors.map((err) => err.message).join(', ') });
    return;
  }

  const { accessToken, amountGhs } = data.data;
  try {
    const userId = await getUserIdFromAccessToken(accessToken);
    const reference = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amountPesewas = Math.round(amountGhs * 100);

    const { data: txn, error: txnError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'wallet_topup',
        status: 'pending',
        amount_pesewas: amountPesewas,
        paystack_reference: reference,
        metadata: { payment_method: 'paystack' },
      })
      .select('id, paystack_reference, amount_pesewas')
      .single();

    if (txnError || !txn) {
      res.status(500).json({ error: txnError?.message ?? 'Failed to create transaction' });
      return;
    }

    res.status(200).json({ transactionId: txn.id, reference: txn.paystack_reference!, amountPesewas: amountPesewas });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
