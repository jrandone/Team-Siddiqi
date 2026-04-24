# TSE — teamsiddiqi.com

Charitable apparel e-commerce site. Static HTML + CSS + JS + three tiny Vercel serverless functions (Stripe checkout, newsletter, contact).

```
.
├── index.html                          # Homepage: hero, shop, story, cause, donate, newsletter, cart, PDP, donate modal
├── config.js                           # Publishable key + brand config (edit before launch)
├── checkout-success.html               # Post-payment landing page
├── checkout-cancel.html                # Cancelled checkout landing page
├── pages/
│   ├── privacy.html                    # Privacy policy
│   ├── terms.html                      # Terms of service
│   ├── shipping.html                   # Shipping policy
│   ├── returns.html                    # Returns & refunds policy
│   ├── contact.html                    # Contact page (posts to /api/contact)
│   └── shared.css                      # Styles shared by all /pages and checkout results
├── assets/                             # Product imagery
├── api/
│   ├── create-checkout-session.js      # Creates a Stripe Checkout Session (cart + donation)
│   ├── subscribe.js                    # Newsletter signup — logs + optional webhook forward
│   └── contact.js                      # Contact form — logs + optional webhook forward
├── package.json                        # Declares `stripe` SDK dependency for functions
├── vercel.json                         # Clean URLs + security headers
├── products.csv                        # SKU reference — internal
├── LAUNCH.md                           # End-to-end go-live runbook
└── README.md                           # This file
```

## Quick start

1. Set up Stripe, paste publishable key into `config.js`, paste secret key into Vercel env as `STRIPE_SECRET_KEY`.
2. Deploy to Vercel from GitHub (Vercel auto-detects the `/api/` functions and installs the Stripe SDK from `package.json`).
3. Point `teamsiddiqi.com` DNS at Vercel (the dashboard shows exact A / CNAME records).
4. Flip Stripe to live mode, swap test keys for live keys.

Full walkthrough: **see `LAUNCH.md`**.

## Environment variables (Vercel)

| Key                 | Required | Notes                                                                                          |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY` | yes      | `sk_test_...` or `sk_live_...`                                                                 |
| `SITE_URL`          | optional | e.g. `https://teamsiddiqi.com`. Falls back to Vercel URL / origin header.                      |
| `FORM_WEBHOOK_URL`  | optional | Zapier / Make / Slack incoming webhook. Newsletter + contact payloads are POSTed here as JSON. |

## Local preview (optional)

The site is plain HTML, so any static file server works. To exercise the serverless functions (checkout, subscribe, contact) locally, use the Vercel CLI:

```bash
# one-time
npm install -g vercel

# in the project folder
vercel dev
# → http://localhost:3000 with /api/* functions running
```

You'll be prompted to link the local folder to the Vercel project; follow the prompts. Env vars set in the dashboard are pulled automatically.

## Updating products

Edit the `PRODUCTS` object inside `index.html`. Each product has name, price, give, color, colors array, sizes array, images, desc. Commit, push — Vercel redeploys in about 30 seconds.

## Updating the cause

Edit `config.js` → `brand.causeName`. That string is used everywhere the site talks about "our cause". One change, one place.
