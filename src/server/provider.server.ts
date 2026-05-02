// Mock data provider service. Swap for a real provider (Hubtel, Datamart, etc.) later
// by implementing the same interface and switching the import in buy-data.functions.ts.

export interface ProviderRequest {
  network: "MTN" | "TELECEL" | "AIRTELTIGO";
  phone: string;
  volumeMb: number;
}

export interface ProviderResult {
  ok: boolean;
  reference: string;
  message: string;
}

export async function deliverBundle(req: ProviderRequest): Promise<ProviderResult> {
  // Simulate ~250ms network latency and ~85% success rate
  await new Promise((r) => setTimeout(r, 250));
  const ok = Math.random() < 0.85;
  const reference = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    ok,
    reference,
    message: ok ? "Bundle delivered" : "Provider temporarily unavailable",
  };
}
