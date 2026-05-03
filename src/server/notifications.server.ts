// Notification service for SMS (Mnotify) and Email (Resend)
// These are placeholders for real integrations.

export interface NotificationPayload {
  to: string;
  message: string;
  subject?: string;
}

export async function sendSMS(payload: NotificationPayload): Promise<{ ok: boolean; message: string }> {
  console.log(`[SMS] Sending to ${payload.to}: ${payload.message}`);
  
  const apiKey = process.env.MNOTIFY_API_KEY;
  if (!apiKey) {
    console.warn('[SMS] MNOTIFY_API_KEY not configured. Skipping real SMS.');
    return { ok: true, message: 'SMS skipped (no API key)' };
  }

  // Real integration would go here:
  // await fetch('https://api.mnotify.com/...', { ... })
  
  return { ok: true, message: 'SMS sent successfully' };
}

export async function sendEmail(payload: NotificationPayload): Promise<{ ok: boolean; message: string }> {
  console.log(`[Email] Sending to ${payload.to}: ${payload.message} (Subject: ${payload.subject})`);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured. Skipping real Email.');
    return { ok: true, message: 'Email skipped (no API key)' };
  }

  // Real integration would go here:
  // await fetch('https://api.resend.com/...', { ... })

  return { ok: true, message: 'Email sent successfully' };
}
