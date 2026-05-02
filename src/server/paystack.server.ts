// Paystack server-only helpers. Never import from client code.
// Paystack works in kobo / pesewas (smallest currency unit).

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return k;
}

export async function paystackVerify(reference: string): Promise<{
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  amount: number; // in kobo/pesewas
  currency: string;
  reference: string;
  customer?: { email?: string };
  metadata?: Record<string, unknown>;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json()) as { status: boolean; message: string; data?: any };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack verify failed: ${json.message ?? res.statusText}`);
  }
  return json.data;
}
