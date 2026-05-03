import express from 'express';
import { z } from 'zod';
import { getUserFromAccessToken } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { paystackVerify } from '../../server/paystack.server.js';
import { applyWalletDelta } from '../../server/wallet.server.js';
import { fulfillTransaction } from '../../server/fulfillment.server.js';

const router = express.Router();
 
const schema = z.object({
  accessToken: z.string().min(1),
  reference: z.string().min(1).max(128), 
});

router.post('/verify', async (req, res) => {
  const body = req.body;
  const data = schema.safeParse(body);
  if (!data.success) {
    res.status(400).json({ error: data.error.errors.map((err) => err.message).join(', ') });
    return;
  }

  const { accessToken, reference } = data.data;
  try {
    const { userId, role } = await getUserFromAccessToken(accessToken);

    const { data: txn, error: txnError } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, status, amount_pesewas, type')
      .eq('paystack_reference', reference)
      .single();

    if (txnError || !txn) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (txn.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (txn.status === 'success' || txn.status === 'processing') {
      res.status(200).json({ transactionId: txn.id, status: txn.status });
      return;
    }

    const verified = await paystackVerify(reference);
    if (verified.status !== 'success') {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed', failure_reason: `Paystack: ${verified.status}` })
        .eq('id', txn.id);
      res.status(200).json({ transactionId: txn.id, status: 'failed' });
      return;
    }

    if (Number(verified.amount) < Number(txn.amount_pesewas)) {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed', failure_reason: 'Underpaid' })
        .eq('id', txn.id);
      res.status(200).json({ transactionId: txn.id, status: 'failed' });
      return;
    }

    if (txn.type === 'wallet_topup') {
      await supabaseAdmin.from('transactions').update({ status: 'success' }).eq('id', txn.id);
      await applyWalletDelta({
        userId,
        deltaPesewas: Number(txn.amount_pesewas),
        reason: 'wallet_topup',
        transactionId: txn.id,
      });
      res.status(200).json({ transactionId: txn.id, status: 'success' });
      return;
    }

    await fulfillTransaction(txn.id);
    const { data: final } = await supabaseAdmin
      .from('transactions')
      .select('status')
      .eq('id', txn.id)
      .single();

    res.status(200).json({ transactionId: txn.id, status: final?.status ?? 'pending' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
