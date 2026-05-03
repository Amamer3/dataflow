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
  const providers = [
    { name: 'Hubtel', weight: 0.7 },
    { name: 'Datamart', weight: 0.3 }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting delivery via ${provider.name}...`);
      // Simulate ~250ms network latency
      await new Promise((r) => setTimeout(r, 250));
      
      // Simulate success based on provider weight
      const ok = Math.random() < provider.weight;
      
      if (ok) {
        const reference = `${provider.name.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        return {
          ok: true,
          reference,
          message: `Bundle delivered via ${provider.name}`,
        };
      }
      
      console.warn(`${provider.name} delivery failed, trying fallback...`);
    } catch (e) {
      console.error(`${provider.name} error:`, e);
    }
  }

  return {
    ok: false,
    reference: '',
    message: "All providers temporarily unavailable",
  };
}
