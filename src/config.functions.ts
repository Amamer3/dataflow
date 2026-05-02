interface PaystackPublicKeyResponse {
  publicKey: string | null;
  error: string | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error((body && ((body as any).error || (body as any).message)) ?? (response.statusText || "Request failed"));
  }

  return body as T;
}

/** Returns the Paystack public key so the browser can open the inline popup. */
export async function getPaystackPublicKey(): Promise<PaystackPublicKeyResponse> {
  return fetchJson<PaystackPublicKeyResponse>("/api/paystack-public-key");
}
