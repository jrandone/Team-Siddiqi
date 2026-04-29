/**
 * POST /api/contact
 * Body: { name: string, email: string, message: string }
 *
 * If FORM_WEBHOOK_URL is set, the submission is forwarded there as JSON
 * (point it at a Zapier "Webhooks by Zapier" → Gmail, a Slack incoming
 * webhook, or Make.com). Otherwise it's logged to Vercel's function logs.
 */

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 4000);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are all required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const payload = {
    type: 'contact',
    name, email, message,
    source: req.headers.referer || 'unknown',
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString(),
  };

  console.log('[contact]', JSON.stringify(payload));

  const webhook = process.env.FORM_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[contact] webhook forward failed:', err.message);
    }
  }

  return res.status(200).json({ ok: true });
};
