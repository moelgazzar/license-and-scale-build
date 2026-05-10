const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export interface TelegramSendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Send a Telegram message to the configured chat. If credentials are missing
 * we return ok=false but skipped=true so callers can handle gracefully without
 * blowing up the demo.
 */
export async function sendTelegram(text: string): Promise<TelegramSendResult> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[telegram] missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID, skipping send');
    return { ok: false, skipped: true, error: 'missing_credentials' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] send failed', res.status, body);
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: any) {
    console.error('[telegram] send threw', err);
    return { ok: false, error: err?.message ?? 'unknown error' };
  }
}
