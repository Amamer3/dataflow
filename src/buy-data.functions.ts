interface FetchJsonOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function fetchJson<T>(url: string, init?: FetchJsonOptions): Promise<T> {
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

export interface InitiateDataPurchaseInput {
  accessToken: string;
  bundleId: string;
  phone: string;
  payWithWallet: boolean;
}

export interface InitiateDataPurchaseResult {
  transactionId: string;
  reference: string | null;
  paid: boolean;
}

export async function initiateDataPurchase({ data }: { data: InitiateDataPurchaseInput }): Promise<InitiateDataPurchaseResult> {
  return fetchJson<InitiateDataPurchaseResult>("/api/buy-data/initiate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface VerifyAndFulfillInput {
  accessToken: string;
  reference: string;
}

export interface VerifyAndFulfillResult {
  transactionId: string;
  status: string;
}

export async function verifyAndFulfill({ data }: { data: VerifyAndFulfillInput }): Promise<VerifyAndFulfillResult> {
  return fetchJson<VerifyAndFulfillResult>("/api/buy-data/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface InitiateWalletTopupInput {
  accessToken: string;
  amountGhs: number;
}

export interface InitiateWalletTopupResult {
  transactionId: string;
  reference: string;
  amountPesewas: number;
}

export async function initiateWalletTopup({ data }: { data: InitiateWalletTopupInput }): Promise<InitiateWalletTopupResult> {
  return fetchJson<InitiateWalletTopupResult>("/api/wallet/topup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
