import express from 'express';
import { z } from 'zod';
import { getUserFromAccessToken } from '../../integrations/supabase/auth-middleware.js';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { applyWalletDelta } from '../../server/wallet.server.js';
import { fulfillTransaction } from '../../server/fulfillment.server.js';

const router = express.Router();

const schema = z.object({
  accessToken: z.string().min(1), 
  bundleId: z.string().uuid(),
  phone: z.string().regex(/^0\d{9}$/, 'Phone must be 10 digits starting with 0'),
  payWithWallet: z.boolean().default(false), 
});

router.post('/initiate', async (req, res) => {
  const body = req.body;
  const data = schema.safeParse(body);
  if (!data.success) {
    res.status(400).json({ error: data.error.errors.map((err) => err.message).join(', ') });
    return;
  }

  const { accessToken, bundleId, phone, payWithWallet } = data.data;
  try {
    const { userId, role } = await getUserFromAccessToken(accessToken);

    const { data: bundle, error: bundleError } = await supabaseAdmin
      .from('bundles')
      .select('id, network, name, price_pesewas, volume_mb, active')
      .eq('id', bundleId)
      .single();

    if (bundleError || !bundle || !bundle.active) {
      res.status(400).json({ error: 'Bundle not available' });
      return;
    }

    const reference = `DATA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: txn, error: txnError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'data_purchase',
        status: 'pending',
        amount_pesewas: bundle.price_pesewas,
        network: bundle.network,
        bundle_id: bundle.id,
        recipient_phone: phone,
        paystack_reference: payWithWallet ? null : reference,
        metadata: { payment_method: payWithWallet ? 'wallet' : 'paystack' },
      })
      .select('id, paystack_reference, amount_pesewas')
      .single();

    if (txnError || !txn) {
      res.status(500).json({ error: txnError?.message ?? 'Failed to create transaction' });
      return;
    }

    if (payWithWallet) {
      try {
        await applyWalletDelta({
          userId,
          deltaPesewas: -Number(txn.amount_pesewas),
          reason: 'data_purchase',
          transactionId: txn.id,
        });
      } catch (error) {
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'failed', failure_reason: (error as Error).message })
          .eq('id', txn.id);
        throw error;
      }

      await fulfillTransaction(txn.id);
      res.status(200).json({ transactionId: txn.id, reference: null, paid: true });
      return;
    }

    res.status(200).json({ transactionId: txn.id, reference: txn.paystack_reference as string, paid: false });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
