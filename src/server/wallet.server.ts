// Wallet helpers using the admin (service role) client. Server-only.
import { supabaseAdmin } from "../integrations/supabase/client.server";

export type LedgerReason =
  | "data_purchase"
  | "wallet_topup"
  | "refund"
  | "adjustment";

/**
 * Apply a wallet delta atomically and write a ledger entry.
 * Positive delta = credit, negative = debit. Throws if debit would overdraw.
 */
export async function applyWalletDelta(args: {
  userId: string;
  deltaPesewas: number;
  reason: LedgerReason;
  transactionId?: string | null;
}): Promise<{ balanceAfter: number }> {
  const { userId, deltaPesewas, reason, transactionId = null } = args;

  // Read current balance
  const { data: wallet, error: readErr } = await supabaseAdmin
    .from("wallets")
    .select("balance_pesewas")
    .eq("user_id", userId)
    .single();
  if (readErr || !wallet) throw new Error("Wallet not found");

  const newBalance = Number(wallet.balance_pesewas) + deltaPesewas;
  if (newBalance < 0) throw new Error("Insufficient wallet balance");

  const { error: updateErr } = await supabaseAdmin
    .from("wallets")
    .update({ balance_pesewas: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (updateErr) throw new Error(updateErr.message);

  const { error: ledgerErr } = await supabaseAdmin.from("wallet_ledger").insert({
    user_id: userId,
    transaction_id: transactionId,
    delta_pesewas: deltaPesewas,
    balance_after_pesewas: newBalance,
    reason,
  });
  if (ledgerErr) throw new Error(ledgerErr.message);

  return { balanceAfter: newBalance };
}
