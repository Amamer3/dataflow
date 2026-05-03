import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../integrations/supabase/client.server.js';
import { fulfillTransaction } from '../../server/fulfillment.server.js';

const router = express.Router();

// POST /api/webhooks/paystack - Paystack webhook handler
router.post('/paystack', async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return res.status(500).send('Webhook secret missing');
  }

  // Verify signature
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  
  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    
    // 1. Find the transaction
    const { data: txn, error } = await supabaseAdmin
      .from('transactions')
      .select('id, status, type')
      .eq('paystack_reference', reference)
      .single();

    if (error || !txn) {
      console.warn(`Webhook: Transaction not found for reference ${reference}`);
      return res.status(200).send('Transaction not found');
    }

    if (txn.status !== 'pending') {
      return res.status(200).send('Transaction already processed');
    }

    // 2. Fulfill based on type
    if (txn.type === 'data_purchase') {
      await fulfillTransaction(txn.id);
    } else if (txn.type === 'wallet_topup') {
      // Wallet topup logic would go here if not handled elsewhere
      // (Though usually handled by verify endpoint, webhook is a backup)
    }
  }

  res.status(200).send('OK');
});

export default router;
