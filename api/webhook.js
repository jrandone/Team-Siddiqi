/**
 * POST /api/webhook
 *
 * Stripe webhook endpoint. Listens for `checkout.session.completed` and:
 *   1. Sends a branded thank-you email to the customer
 *   2. Sends an order-fulfillment email to info.teamsiddiqi@gmail.com
 *
 * Stripe Dashboard setup:
 *   Developers -> Webhooks -> Add endpoint
 *   URL:    https://teamsiddiqi.com/api/webhook
 *   Events: checkout.session.completed
 *   Copy the signing secret (starts with whsec_) into Vercel env vars
 *
 * Environment variables (Vercel -> Project Settings -> Environment Variables):
 *   STRIPE_SECRET_KEY        already set
 *   STRIPE_WEBHOOK_SECRET    new -- copy from Stripe webhook page
 *   RESEND_API_KEY           new -- from resend.com -> API Keys
 */

const Stripe = require('stripe');

const FROM = 'Team Siddiqi Enterprises <noreply@teamsiddiqi.com>';
const REPLY_TO = 'info.teamsiddiqi@gmail.com';
const MERCHANT_TO = 'info.teamsiddiqi@gmail.com';
const SUPPORT_EMAIL = 'info.teamsiddiqi@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    console.error('[webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server not configured.' });
  }
  const stripe = Stripe(secret);

  // Read raw body for signature verification
  let rawBody = '';
  for await (const chunk of req) {
    rawBody += chunk;
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }

  // Only act on completed checkouts
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  try {
    await handleOrderCompleted(event.data.object, stripe);
  } catch (err) {
    // Log but don't fail the webhook — Stripe would retry, and we want to
    // avoid double-emails. Investigate via Vercel logs.
    console.error('[webhook] order handler error:', err);
  }

  return res.status(200).json({ received: true });
};

module.exports.config = {
  api: { bodyParser: false },
};

// ---------- handlers ----------

async function handleOrderCompleted(session, stripe) {
  // Donations use a separate metadata.type — skip them
  if (session.metadata && session.metadata.type === 'donation') return;

  // Re-fetch with line items + customer + shipping expanded
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price.product', 'customer_details', 'shipping_details'],
  });

  const customerEmail = full.customer_details && full.customer_details.email;
  const customerName = (full.customer_details && full.customer_details.name) || 'Customer';
  const customerPhone = (full.customer_details && full.customer_details.phone) || 'Not provided';
  const total = ((full.amount_total || 0) / 100).toFixed(2);
  const orderId = full.id.slice(-12);
  const orderDate = new Date((full.created || Date.now() / 1000) * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const isPickup = (full.metadata && full.metadata.shipping_method) === 'pickup';
  const shippingDetails = full.shipping_details;
  let shippingTextPlain = '';
  if (isPickup) {
    shippingTextPlain = 'Pickup from Noah & Zach (no shipping)';
  } else if (shippingDetails && shippingDetails.address) {
    const a = shippingDetails.address;
    shippingTextPlain = [
      shippingDetails.name,
      a.line1,
      a.line2,
      [a.city, a.state, a.postal_code].filter(Boolean).join(', '),
      a.country,
    ].filter(Boolean).join('\n');
  }

  // Items
  const items = ((full.line_items && full.line_items.data) || []).map((li) => {
    const productName = (li.price && li.price.product && li.price.product.name) || li.description || 'Item';
    const linePrice = ((li.amount_total || li.amount_subtotal || 0) / 100).toFixed(2);
    return { name: productName, qty: li.quantity || 1, price: linePrice };
  });

  const cartDetails = (full.metadata && full.metadata.cart_details) || '';
  const stripeDashUrl = full.payment_intent
    ? `https://dashboard.stripe.com/payments/${full.payment_intent}`
    : `https://dashboard.stripe.com/payments`;

  // ----- Customer email -----
  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      replyTo: REPLY_TO,
      subject: 'Thank you for your order — Team Siddiqi Enterprises',
      html: renderCustomerEmail({
        customerName, orderId, orderDate, items, total, shippingTextPlain, isPickup,
      }),
    });
  }

  // ----- Merchant fulfillment email -----
  await sendEmail({
    to: MERCHANT_TO,
    replyTo: customerEmail || REPLY_TO,
    subject: `New TSE Order — ${customerName} — $${total}`,
    html: renderMerchantEmail({
      customerName, customerEmail, customerPhone,
      orderId, orderDate, items, total,
      shippingTextPlain, isPickup, cartDetails, stripeDashUrl,
    }),
  });
}

// ---------- email rendering ----------

function renderCustomerEmail({ customerName, orderId, orderDate, items, total, shippingTextPlain, isPickup }) {
  const itemsHtml = items.map((i) =>
    `<li><strong>${esc(i.name)}</strong> (Qty: ${i.qty}) — $${esc(i.price)}</li>`
  ).join('');

  const shippingLabel = isPickup ? 'Pickup' : 'Shipping Details';
  const shippingHtml = isPickup
    ? '<p>You chose pickup at Noah &amp; Zach&rsquo;s house. We&rsquo;ll reach out to coordinate a time.</p>'
    : `<pre style="font-family: inherit; white-space: pre-line; margin: 0;">${esc(shippingTextPlain)}</pre>`;

  return `
<div style="font-family: -apple-system, system-ui, sans-serif; color: #1a1614; max-width: 560px; line-height: 1.55;">
  <p>Hi ${esc(customerName)},</p>
  <p>Thank you for your order! We really appreciate you supporting us and our cause, remember:
  <em>Water should not be a privilege. Everyone should have access.</em></p>
  <p>Your purchase is being processed and below is a summary of your order:</p>
  <p><strong>Order Number:</strong> ${esc(orderId)}<br>
  <strong>Order Date:</strong> ${esc(orderDate)}</p>
  <p><strong>Items Ordered:</strong></p>
  <ul>${itemsHtml}</ul>
  <p><strong>Order Total:</strong> $${esc(total)}</p>
  <p><strong>${esc(shippingLabel)}:</strong></p>
  ${shippingHtml}
  <p>If you have any questions about your order or need assistance, please feel free to contact our support team at
  <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>
  <p>This brand represents more than clothing. It represents a mindset. We appreciate your business!</p>
  <p>Best regards,<br><br>
  Noah Siddiqi &amp; Zach Siddiqi<br>
  Team Siddiqi Enterprises (TSE)<br>
  <a href="https://www.teamsiddiqi.com">www.teamsiddiqi.com</a></p>
</div>`.trim();
}

function renderMerchantEmail({ customerName, customerEmail, customerPhone, orderId, orderDate, items, total, shippingTextPlain, isPickup, cartDetails, stripeDashUrl }) {
  const itemsHtml = items.map((i) =>
    `<li>${esc(i.name)} — qty ${i.qty} — $${esc(i.price)}</li>`
  ).join('');

  const shippingHtml = isPickup
    ? `<p style="background: #fff8eb; padding: 12px; border-left: 3px solid #c8a24b; margin: 0;"><strong>PICKUP</strong> — customer chose pickup at the house. Coordinate with them (reply to this email).</p>`
    : `<pre style="font-family: inherit; white-space: pre-line; background: #f5f0e8; padding: 12px; border: 1px solid #e6dfd0; border-radius: 4px; margin: 0;">${esc(shippingTextPlain)}</pre>`;

  const cartLine = cartDetails
    ? `<p style="background: #fff8eb; padding: 10px; border-left: 3px solid #c8a24b; margin: 12px 0;"><strong>Variant details (size · color):</strong> ${esc(cartDetails)}</p>`
    : '';

  return `
<div style="font-family: -apple-system, system-ui, sans-serif; color: #1a1614; max-width: 620px; line-height: 1.55;">
  <h2 style="margin: 0 0 12px; font-family: Georgia, serif;">New TSE Order</h2>
  <p>
    <strong>Order #:</strong> ${esc(orderId)}<br>
    <strong>Date:</strong> ${esc(orderDate)}<br>
    <strong>Total:</strong> $${esc(total)}<br>
    <strong>Stripe:</strong> <a href="${esc(stripeDashUrl)}">${esc(stripeDashUrl)}</a>
  </p>

  <h3 style="margin-top: 24px;">Customer</h3>
  <p>
    Name: ${esc(customerName)}<br>
    Email: <a href="mailto:${esc(customerEmail || '')}">${esc(customerEmail || 'Not provided')}</a><br>
    Phone: ${esc(customerPhone)}
  </p>

  <h3>What they ordered</h3>
  <ul>${itemsHtml}</ul>
  ${cartLine}

  <h3>${isPickup ? 'Pickup' : 'How to fulfill'}</h3>
  ${shippingHtml}

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e6dfd0;">
  <p style="font-size: 12px; color: #888;">Reply to this email to contact ${esc(customerName)} directly (Reply-To set to their address).</p>
</div>`.trim();
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Resend ----------

async function sendEmail({ to, replyTo, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[webhook] RESEND_API_KEY missing — email skipped:', subject);
    return;
  }
  const payload = {
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    console.error('[resend] send failed:', r.status, text);
    throw new Error(`Resend ${r.status}: ${text}`);
  }
}
