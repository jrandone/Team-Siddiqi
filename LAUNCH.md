# TSE — Launch Runbook

Goal: get **teamsiddiqi.com** live on the public internet with real Stripe payments. Plan on ~90 minutes for a first go, start to finish.

This site is static HTML + CSS + JS with three tiny Vercel serverless functions in `/api/` that talk to Stripe and log form submissions. No databases, no CMS.

---

## Step 1 — Create a Stripe account (~10 min)

1. Go to [stripe.com](https://stripe.com) and sign up. Use an email you have long-term access to (e.g. `founders@teamsiddiqi.com`).
2. After signup, you'll land in the dashboard in **test mode** (toggle top-right). Stay there for now.
3. From the left nav: **Developers → API keys**. Copy the **Publishable key** (starts with `pk_test_`) and **Secret key** (starts with `sk_test_`). Keep both in a password manager — you'll paste them in later.
4. Fill in **Business details** (Settings → Business → Public details). Address, support email, business name, statement descriptor (e.g. "TSE"). Stripe shows some of this on customer card statements and receipts.

*Your account is in "test mode" — you can run the whole flow end-to-end with Stripe's test cards and nothing will actually be charged.*

---

## Step 2 — Push the site to GitHub (~10 min)

Vercel deploys from a Git repo, so the site needs to live in one.

If you're comfortable with the command line:

```bash
cd "/path/to/TSE (Team Saddiqi Enterprises)"
git init
git add .
git commit -m "Initial launch build"
gh repo create tse-site --private --source=. --push
```

If you prefer the GitHub desktop app: File → Add local repository → point to this folder → publish to GitHub as a **private** repo.

*You can skip GitHub entirely and run `vercel` from the project folder — see the CLI sidebar in Step 3 — but GitHub-connected is easier day-to-day because every `git push` auto-deploys.*

---

## Step 3 — Deploy to Vercel (~15 min)

1. Go to [vercel.com](https://vercel.com) and sign in (you mentioned you already have an account).
2. Click **Add New → Project → Import Git Repository** and pick `tse-site`.
3. Build settings — Vercel will auto-detect most of this. Confirm:
   - **Framework preset:** Other
   - **Build command:** *(leave blank)*
   - **Output directory:** *(leave blank — defaults to repo root)*
   - **Install command:** `npm install` *(default — needed so the Stripe SDK is installed for the function)*
4. Click **Deploy**. In ~60 seconds you'll get a URL like `https://tse-site-abc123.vercel.app`. Visit it — the site loads, but the Checkout button will error until the next step.

> **CLI alternative** — if you'd rather not connect GitHub, install the CLI (`npm i -g vercel`), `cd` into the project folder, run `vercel` for preview deploys, `vercel --prod` for production. Same result.

### Add environment variables

In the Vercel dashboard: **Project → Settings → Environment Variables**. Add each for **Production, Preview, and Development**:

| Key                   | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| `STRIPE_SECRET_KEY`   | `sk_test_...` (from Step 1)                                |
| `SITE_URL`            | `https://teamsiddiqi.com` (leave blank until Step 5 if you prefer; the function falls back to the Vercel URL) |
| `FORM_WEBHOOK_URL`    | *(optional)* A Zapier / Make / Slack incoming webhook URL. Newsletter + contact submissions POST here as JSON. Leave blank and they'll just log to Vercel function logs for now. |

Then: **Deployments → ... → Redeploy** on the latest deployment so functions pick up the env vars.

### Paste the publishable key into `config.js`

Open `config.js` in the repo, replace `pk_test_REPLACE_ME` with your real publishable key, commit, push. Vercel auto-deploys.

---

## Step 4 — Test the flow (~15 min)

Still on your Vercel preview URL (no custom domain yet), walk through every path:

- [ ] Homepage loads, no console errors (right-click → Inspect → Console).
- [ ] Click **Shop the Collection** → jumps to the grid.
- [ ] Click a product → PDP opens, pick size → **Add to Bag**.
- [ ] Cart drawer shows the item, correct price, correct donation line.
- [ ] **Checkout** → short loading spinner → you land on a real Stripe Checkout page at `checkout.stripe.com`.
- [ ] Use test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP → **Pay**.
- [ ] You're redirected back to `/checkout-success` with the right reference.
- [ ] Open Stripe Dashboard → **Payments**. The test payment appears with the right line items and SKU metadata.
- [ ] Back on the site, test the **Donate** flow: open the donate modal, pick $50, one-time → Stripe Checkout → pay → success page says "Thank you for your gift."
- [ ] Test a **monthly** donation: $25 / Monthly → Stripe Checkout shows "per month" → pay → Stripe Dashboard shows a Subscription created.
- [ ] Test **Cancel**: start checkout, click back on the Stripe page → you land on `/checkout-cancel`.
- [ ] Submit the **newsletter** form — then in Vercel Dashboard: **Project → Logs → select `/api/subscribe`** should show a `[subscribe] {...}` log line with your email. Same for the contact form (`/api/contact`).
- [ ] If you set `FORM_WEBHOOK_URL`, confirm the payload arrived at the webhook destination.

If anything fails, open **Vercel Dashboard → Project → Logs** and filter by function name (`/api/create-checkout-session`, `/api/subscribe`, `/api/contact`). Errors show up there.

---

## Step 5 — Connect teamsiddiqi.com (~20 min)

In Vercel: **Project → Settings → Domains → Add → `teamsiddiqi.com`**. Add `www.teamsiddiqi.com` too — Vercel will offer to redirect one to the other (pick the apex `teamsiddiqi.com` as canonical).

Vercel shows you the records to add at your registrar (GoDaddy, Namecheap, Cloudflare, etc.). Typically:

| Type  | Host | Value                       |
| ----- | ---- | --------------------------- |
| A     | @    | `76.76.21.21`               |
| CNAME | www  | `cname.vercel-dns.com`      |

(Use the exact values Vercel shows in the UI — they occasionally change.)

DNS propagation takes 5–60 minutes. Vercel auto-provisions a Let's Encrypt SSL cert as soon as DNS resolves — your site will be `https://teamsiddiqi.com` with no further action.

Once the domain resolves, go back to **Settings → Environment Variables** and set `SITE_URL = https://teamsiddiqi.com` (for Production). Redeploy so the Stripe success/cancel URLs use the real domain.

---

## Step 6 — Flip Stripe to live mode (~10 min)

1. In the Stripe dashboard, top-right: toggle off **Test mode**.
2. Stripe will ask you to **activate your account**. Fill in business info, bank account for payouts, and your personal ID. Takes a few minutes; approval is usually instant for US businesses.
3. Once approved, copy your **live** API keys from Developers → API keys (`pk_live_...` and `sk_live_...`).
4. Update:
   - `config.js` → swap `pk_test_...` → `pk_live_...`. Commit + push. Vercel auto-deploys.
   - Vercel env var `STRIPE_SECRET_KEY` → swap `sk_test_...` → `sk_live_...`. Redeploy so the function picks it up.
5. **Test again with a real card** — buy one item for $1 (make a test SKU in Stripe if you want). Confirm:
   - Charge shows in Stripe Dashboard under Payments (live mode).
   - Money lands in your bank within 2–7 business days (first payout is sometimes delayed).
   - Refund the test charge from the Stripe dashboard.

---

## Step 7 — Pre-launch polish (~10 min)

- [ ] Edit `config.js` → set `causeName` once you've confirmed the charity partner (currently "our cause" throughout the site; changing this one string updates every mention).
- [ ] Open all the **legal pages** (`/pages/privacy.html`, `/pages/terms.html`, `/pages/shipping.html`, `/pages/returns.html`) and skim — swap any placeholder emails, confirm the shipping rates match what you've negotiated with your carrier.
- [ ] Set up mail forwarding from `orders@teamsiddiqi.com`, `privacy@teamsiddiqi.com`, `hello@teamsiddiqi.com` to an inbox you actually check. If you're on Google Workspace, set these up as groups.
- [ ] In Stripe: **Settings → Emails** → customize receipt template and subject line (include "TSE" so customers recognize it).
- [ ] In Stripe: **Settings → Tax** → enable Stripe Tax if you want auto tax collection (then flip `automatic_tax: { enabled: true }` in `api/create-checkout-session.js`).
- [ ] Decide how newsletter + contact submissions reach you. Cheapest path: create a Zapier zap "Webhooks by Zapier (catch hook) → Gmail (send email)" and set its catch URL as `FORM_WEBHOOK_URL` in Vercel. Better long-term: swap `/api/subscribe` to call your ESP (Mailchimp, ConvertKit, Loops, Beehiiv) directly — each has a one-call REST endpoint.
- [ ] Optional: enable **Vercel Analytics** (free tier is generous) or Plausible for privacy-friendly traffic stats.

---

## Step 8 — Announce and watch

You're live. Order volume will be low at first — watch:

- **Stripe Dashboard → Payments** for incoming orders.
- **Vercel Dashboard → Logs** for form submissions and any checkout errors. Filter by function name.
- If you set `FORM_WEBHOOK_URL`, watch that destination for newsletter + contact messages.

### If something goes wrong

| Symptom                                   | First thing to check                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Checkout button errors ("not configured") | `config.js` has the real `pk_live_...` key                               |
| "Server returned 500" on checkout         | Vercel env var `STRIPE_SECRET_KEY` set? Function logs show the error.    |
| Checkout redirects to wrong URL           | `SITE_URL` not set in Production env vars — update and redeploy          |
| Newsletter/contact fails silently         | Check Vercel function logs for `/api/subscribe` or `/api/contact`        |
| Emails not coming                         | Stripe receipt settings + mail forwarding for `@teamsiddiqi.com`         |
| Domain shows "Not secure"                 | DNS still propagating, or SSL cert hasn't provisioned yet — give it 1 hr |

---

## What's manual for now

This launch is deliberately minimal. These are **post-launch** improvements when order volume makes them worth the time:

- **Inventory tracking.** Stripe doesn't track stock here — the SKU shows up in each order. Keep a spreadsheet of on-hand inventory and update as orders come in. If you run out of a size, add `{ oos: true }` to that variant in `index.html`'s `PRODUCTS` and redeploy. (Or port to Shopify once you're shipping >50 orders/week.)
- **Order notifications.** Stripe sends the buyer a receipt automatically. If you want one for yourself too, set up a Zapier "Stripe → new charge → email me" — 2 minutes. Alternately, add a Stripe webhook at `/api/stripe-webhook` later.
- **Shipping labels.** Buy labels through Pirate Ship, Shippo, or Stamps.com using the address from the Stripe order.
- **Impact receipts page.** The cause section mentions quarterly receipts. Each quarter, update those three counters in `index.html` (currently `$0`, `0`, `Q1 26`) with the real numbers and redeploy.
- **Real ESP integration.** Replace `/api/subscribe` with a direct Mailchimp / Loops / ConvertKit API call so subscribers go straight into a real list with double-opt-in.

---

## Files you'll touch again

| File                                       | When                                                |
| ------------------------------------------ | --------------------------------------------------- |
| `config.js`                                | Flip publishable key test → live; update cause name |
| `index.html` — `PRODUCTS` object           | New products or sold-out variants                   |
| `index.html` — cause counters section      | Quarterly impact updates                            |
| `api/create-checkout-session.js`           | Turn on Stripe Tax; adjust shipping rules           |
| `api/subscribe.js` / `api/contact.js`      | Swap the webhook forward for a real ESP / inbox     |
| `pages/*.html`                             | Legal or policy changes                             |
| `products.csv`                             | Internal reference — keep it in sync                |
