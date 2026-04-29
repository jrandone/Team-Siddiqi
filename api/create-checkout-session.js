/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for either:
 *   (a) cart purchase  — body: { mode: 'payment', items: [...] }
 *   (b) donation        — body: { mode: 'payment'|'subscription', donation: {...} }
 *
 * Returns: { url, id } — the Stripe-hosted checkout URL to redirect to.
 *
 * Environment variables (set in Vercel → Project Settings → Environment Variables):
 *   STRIPE_SECRET_KEY   (required) — starts with sk_test_ or sk_live_
 *   SITE_URL            (optional) — e.g. https://teamsiddiqi.com. Falls back to
 *                       the Origin / VERCEL_URL headers or a sensible default.
 */

const Stripe = require('stripe');

const ALLOWED_COUNTRIES = ['US', 'CA']; // expand later if you ship wider

// Stripe Price IDs per fit tier. Update these if you create new prices in Stripe
// (Dashboard -> Products -> click product -> click price). Keys must match the
// `tier` strings sent from the frontend (PRODUCTS.hoodie.tiers in index.html).
const TIER_PRICE_IDS = {
  'Adult S–XL':    'price_1TQrzIGgXyid7BicmPbXg9sX', // $45
  'Adult 2XL–4XL': 'price_1TQrzsGgXyid7BicQ8MdQhUk', // $48
  'Youth S–L':     'price_1TQs0MGgXyid7BicGU6L5lSd', // $45
  'Toddler 2T–5T': 'price_1TQs0rGgXyid7Bic2VZS4qSb', // $45
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Server not configured: STRIPE_SECRET_KEY missing.' });
  }
  const stripe = Stripe(secret);

  // Vercel parses JSON bodies automatically when Content-Type is application/json,
  // but be defensive in case a client sends a string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  body = body || {};

  const origin =
    process.env.SITE_URL ||
    req.headers.origin ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://teamsiddiqi.com';

  try {
    // ---------- DONATION ----------
    if (body.donation) {
      const amount = Number(body.donation.amount);
      const isMonthly = !!body.donation.interval;
      if (!Number.isFinite(amount) || amount < 100) {
        return res.status(400).json({ error: 'Donation amount must be at least $1.' });
      }

      const session = await stripe.checkout.sessions.create({
        mode: isMonthly ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              recurring: isMonthly ? { interval: 'month' } : undefined,
              product_data: {
                name: isMonthly ? 'Monthly gift to the cause' : 'Gift to the cause',
                description: 'Thank you. 100% of proceeds fund our chosen cause.',
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&type=donation`,
        cancel_url: `${origin}/checkout-cancel`,
        metadata: {
          type: 'donation',
          frequency: isMonthly ? 'monthly' : 'one-time',
          note: (body.donation.note || '').slice(0, 500),
        },
      });

      return res.status(200).json({ url: session.url, id: session.id });
    }

    // ---------- CART ----------
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const line_items = [];
    for (const i of items) {
      const priceId = TIER_PRICE_IDS[i.tier];
      if (!priceId) {
        return res.status(400).json({ error: `Unknown tier in cart: ${i.tier || '(missing)'}` });
      }
      line_items.push({
        price: priceId,
        quantity: Number(i.quantity) || 1,
      });
    }

    // First entry becomes the Stripe Checkout default. Standard ships
    // for most customers; Pickup is an explicit opt-in for local folks.
    const shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 1099, currency: 'usd' },
          display_name: 'Standard shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 7 },
            maximum: { unit: 'business_day', value: 30 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'usd' },
          display_name: 'Pickup from Zach & Noah (no shipping)',
        },
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options,
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: false }, // flip to true once Stripe Tax is configured
      allow_promotion_codes: true,
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&type=order`,
      cancel_url: `${origin}/checkout-cancel`,
      metadata: {
        type: 'order',
        item_count: String(items.reduce((s, i) => s + Number(i.quantity), 0)),
        cart_details: items
          .map(i => `${i.quantity}× ${i.tier} · ${i.color} · ${i.size}`)
          .join('; ')
          .slice(0, 500),
      },
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message || 'Checkout failed.' });
  }
};
