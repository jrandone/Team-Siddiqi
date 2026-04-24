/**
 * POST /api/subscribe
 * Body: { email: string }
 *
 * Accepts a newsletter signup. If FORM_WEBHOOK_URL is set as an env var,
 * the submission is forwarded there as JSON (Zapier, Make, Slack webhook, etc.);
 * otherwise it's just logged to Vercel's function logs.
 *
 * This is intentionally dumb and dependency-free. Wire up a real ESP
 * (Mailchimp, ConvertKit, Loops) by replacing the webhook forward.
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

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const payload = {
    type: 'newsletter',
    email,
    source: req.headers.referer || 'unknown',
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString(),
  };

  console.log('[subscribe]', JSON.stringify(payload));

  const webhook = process.env.FORM_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[subscribe] webhook forward failed:', err.message);
      // still return success to the user — we have it in the log
    }
  }

  return res.status(200).json({ ok: true });
};
