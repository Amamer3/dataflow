import { supabaseAdmin } from "../integrations/supabase/client.server.js";
import { deliverBundle } from "./provider.server.js";
import { applyWalletDelta } from "./wallet.server.js";
import { sendSMS, sendEmail } from "./notifications.server.js";

export async function fulfillTransaction(transactionId: string) {
  const { data: txn } = await supabaseAdmin 
    .from('transactions')
    .select('id, user_id, network, recipient_phone, amount_pesewas, bundle_id, retry_count, metadata')
    .eq('id', transactionId)
    .single();

  if (!txn || !txn.network || !txn.recipient_phone || !txn.bundle_id) return;

  const { data: bundle } = await supabaseAdmin
    .from('bundles')
    .select('name, volume_mb')
    .eq('id', txn.bundle_id)
    .single();

  await supabaseAdmin
    .from('transactions')
    .update({ status: 'processing' })
    .eq('id', transactionId);

  const maxRetries = 3;
  let currentTry = 0;
  let result;

  while (currentTry < maxRetries) {
    result = await deliverBundle({
      network: txn.network as 'MTN' | 'TELECEL' | 'AIRTELTIGO',
      phone: txn.recipient_phone,
      volumeMb: bundle?.volume_mb ?? 0,
    });

    if (result.ok) break;
    
    currentTry++;
    if (currentTry < maxRetries) {
      // Exponential backoff or simple delay
      await new Promise(resolve => setTimeout(resolve, 1000 * currentTry));
      await supabaseAdmin
        .from('transactions')
        .update({ retry_count: currentTry })
        .eq('id', transactionId);
    }
  }

  if (result?.ok) {
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'success', provider_reference: result.reference })
      .eq('id', transactionId);

    // Send notifications
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone, full_name')
      .eq('id', txn.user_id)
      .single();

    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(txn.user_id);

    const successMessage = `Success! Your ${bundle?.name} for ${txn.recipient_phone} has been delivered. Ref: ${result.reference}`;
    
    if (profile?.phone) {
      await sendSMS({ to: profile.phone, message: successMessage });
    }

    if (authUser?.email) {
      await sendEmail({ 
        to: authUser.email, 
        message: successMessage, 
        subject: 'Data Purchase Successful' 
      });
    }

  } else {
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', failure_reason: result?.message || 'Unknown error' })
      .eq('id', transactionId);

    if (txn.metadata && (txn.metadata as any)?.payment_method === 'wallet') {
      await applyWalletDelta({
        userId: txn.user_id,
        deltaPesewas: Number(txn.amount_pesewas),
        reason: 'refund',
        transactionId,
      });
      await supabaseAdmin.from('transactions').update({ status: 'refunded' }).eq('id', transactionId);
    }
  }
}
