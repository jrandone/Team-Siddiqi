# TSE Website — Handoff Guide

For Noah & Zach. This is everything you need to run, change, and keep the site alive.

---

## 1. What you're inheriting

A real, live shopping website at **teamsiddiqi.com** that takes real money. It has:

- A landing page (the home page everyone sees)
- A product page where customers pick a sweatshirt, color, size
- A real Stripe checkout that charges credit cards
- Policy pages (privacy, contact, etc.)

The whole site is "static" — meaning there's no server constantly running. The pages are just HTML files. The only "live" code is a few small functions that talk to Stripe.

---

## 2. The four accounts that run the site

Think of these like four buddies, each with one job:

| Account | What it does | Where to log in |
|---|---|---|
| **GitHub** | Stores all the code. Every change you make gets saved here. | https://github.com — repo name: `jrandone/Team-Siddiqi` |
| **Vercel** | Takes the code from GitHub and turns it into the live website. Auto-deploys on every change. | https://vercel.com — project: `team-siddiqi` |
| **Stripe** | Handles all payments and orders. | https://dashboard.stripe.com |
| **Hostinger** | Owns the domain name `teamsiddiqi.com`. Already pointed at Vercel — you almost never need to log in here. | https://hpanel.hostinger.com |

**Step 1 of taking over:** make sure both of you have access to all four accounts. The current owner (your dad / John) needs to either (a) add you as collaborators/team members, or (b) transfer ownership. Adding you as collaborators is usually safer because the original credit card / billing stays put.

---

## 3. How everything connects

```
You edit a file on GitHub
        ↓
Vercel sees the change, builds a new version of the site (~30 seconds)
        ↓
Hostinger points teamsiddiqi.com at Vercel, so visitors see the new version
        ↓
When a customer clicks "Checkout," Vercel runs a small function that
talks to Stripe. Stripe collects the money and sends it to your bank.
```

You don't have to memorize this — but understanding it helps when something breaks.

---

## 4. How to change something on the website

**Easiest way (no installs, works on any computer):**

1. Go to https://github.com/jrandone/Team-Siddiqi
2. Click the file you want to edit (e.g., `index.html`)
3. Click the pencil icon (top-right of the file) — "Edit this file"
4. Make your change
5. Scroll to the bottom — "Commit changes…"
6. Write a short note about what you changed (e.g., "Update Bismillah note")
7. Click "Commit changes"
8. Wait ~30 seconds. Refresh teamsiddiqi.com. Your change is live.

**That's it.** No fancy tools needed.

**Things you can edit safely:**

- **Text/copy** — anything between `<p>...</p>` or `<h1>...</h1>` etc.
- **Images** — replace files in the `assets/` folder
- **Colors** — usually in the `<style>` block at the top of `index.html`

**Heads-up:** if you make a typo in HTML (like deleting a `<` or `>`), the site can break. The fix: go to GitHub → Commits tab → find the working version before your change → revert it. (Ask if you want a tutorial on this.)

---

## 5. The files you'll actually edit

| File | What's in it |
|---|---|
| `index.html` | The home page, store, story, cart, checkout — all in one big file. 99% of edits are here. |
| `pages/contact.html` | Contact form page |
| `pages/privacy.html` | Privacy policy |
| `pages/terms.html` | Terms of service |
| `pages/returns.html` | "All Sales Final" policy (still on the server but not linked from the site) |
| `pages/shipping.html` | Shipping policy (also not linked from the site anymore) |
| `assets/` | All the photos. To swap a photo, upload a new one with the same filename. |
| `config.js` | The Stripe publishable key — only change this when going from test mode to live mode (or vice versa) |
| `api/` | The functions that talk to Stripe. **Don't edit unless you really know what you're doing.** |

---

## 6. Stripe — managing orders, products, and money

This is where most of your day-to-day work happens.

### Test mode vs Live mode

Top-right of the Stripe Dashboard there's a toggle. **Live mode = real money.** **Test mode = fake money.** When you're playing around or testing, switch to Test mode. When you want to see real orders, switch to Live mode.

### See your orders

**Live mode → Payments**. Every order shows up here. Click one to see:
- What the customer bought (size, color)
- Their shipping address (or pickup if they chose pickup)
- Their email
- The total

### Refund a customer

Live mode → Payments → click the payment → "Refund" button. Choose full or partial refund. Customer's card gets the money back in 5–10 days.

### Add a new product

Live mode → Products → "Add product".
- Name it clearly (e.g., "The Bismillah T-Shirt — Adult M")
- Set the price (one-time)
- Save

After saving, you'll see two IDs:
- `prod_xxxxx` — the product ID
- `price_xxxxx` — the price ID

The **price ID** is what the website uses. To make a new product show up on the site, the code in `index.html` and `api/create-checkout-session.js` needs to be updated to reference the new price ID. Ask Claude / ChatGPT / a developer for help with this — it's a 5-minute change.

### Change a price

Live mode → Products → click the product → click the price → "Edit price". Stripe will create a new price (you can't change an existing price's amount in Stripe). Update the code with the new price ID.

### Stripe Dashboard mobile app

Download "Stripe Dashboard" on your phone. You'll get a push notification every time someone places an order. Hugely useful for fulfillment.

---

## 7. The Stripe API keys (important — don't mess this up)

There are two keys per mode (test and live):

| Key type | Where it lives | What it does |
|---|---|---|
| **Publishable** (`pk_live_…` or `pk_test_…`) | `config.js` in the GitHub repo | Used by the customer's browser. Public. Safe to be in code. |
| **Secret** (`sk_live_…` or `sk_test_…`) | Vercel → project Settings → Environment Variables → `STRIPE_SECRET_KEY` | Used by the checkout function. **NEVER put this in code or share it with anyone.** Anyone who has it can charge cards. |

If the keys ever need to change (e.g., you suspect they leaked, or you switch test ↔ live):
1. Go to Stripe → Developers → API keys
2. Copy the new keys
3. Update `pk_…` in `config.js` (commit + push)
4. Update `sk_…` in Vercel env var → Redeploy

---

## 8. Things NOT to touch (unless you really mean it)

- **Vercel env var `STRIPE_SECRET_KEY`** — leaking or misconfiguring this breaks all checkouts.
- **`config.js` `pk_test_` ↔ `pk_live_` swap** — only do this when intentionally going from sandbox to production. They must match the secret key's mode (test pairs with test, live with live).
- **`api/create-checkout-session.js`** — the file that talks to Stripe. A typo here breaks the whole shopping cart.
- **Hostinger nameservers** — currently set to Vercel's (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`). Changing them moves the domain away from Vercel and the site goes down.
- **Deleting `assets/` files that are still used** — if you remove a photo without replacing it, broken images appear on the site.

---

## 9. Common edits, with the file + line area to look for

| What you want to change | Where |
|---|---|
| The hero photo on the home page | Replace `assets/hero_lifestyle.jpg` |
| The "Eat. Sleep. Pray. Compete." headline | `index.html`, search for "Eat. Sleep. Pray." |
| The Bismillah note under the headline | `index.html`, search for "Bismillah means" |
| Your Story (the brothers' story) | `index.html`, search for "We are twin brothers" |
| The cause section copy | `index.html`, search for "Water should not be a privilege" |
| The Coming Soon section (joggers + shorts) | `index.html`, search for "COMING SOON" |
| Sweatshirt prices/colors/sizes | `index.html`, search for `tiers:` (the data block defines all variants) |
| Shipping cost ($8 standard) | `api/create-checkout-session.js`, search for `shipping_options` |
| Pickup option label | `api/create-checkout-session.js`, search for "Pickup from Zach & Noah" |
| Domain name in policies (`teamsiddiqi.com`) | Page footers across `pages/*.html` |

---

## 10. When something breaks — first response checklist

1. **Refresh the page.** Sometimes Vercel is mid-deploy and the old version is cached.
2. **Check Vercel deployments.** Go to Vercel → your project → Deployments. Latest one should say "Ready" with a green check. If it says "Failed," the most recent code change broke the build. Click into it to see the error.
3. **Check Stripe.** If checkout is broken, go to Stripe → Logs and look for recent errors. Most common: secret key mismatch (publishable in code is `pk_live_` but Vercel's is `pk_test_`, or vice versa).
4. **Roll back.** In Vercel → Deployments, find a deployment from when the site was working. Click the three dots → "Promote to Production." Your live site instantly reverts.
5. **Check GitHub commit history.** Every code change is a commit. You can see exactly what changed last by going to https://github.com/jrandone/Team-Siddiqi/commits/main.

---

## 11. Where to get help

- **Stripe support** — chat in Stripe Dashboard (top-right help icon). Fast response, 24/7.
- **Vercel support** — Discord community is super active. https://vercel.com/help
- **Generic web help** — ChatGPT or Claude. Paste an error message, get an explanation. Stack Overflow is also great.
- **GitHub help** — https://docs.github.com — search for "edit a file" or "revert a commit"

---

## 12. Brand decisions baked into the site (don't accidentally undo)

A few intentional choices that aren't obvious from looking at the code:

- **No email addresses anywhere** — every "contact" link routes to the contact form (`/pages/contact.html`). This was on purpose for privacy.
- **All sales final** — no returns/refunds policy displayed; refunds happen case-by-case via Stripe Dashboard for damaged/wrong items.
- **"Paani"** with two A's — matches paaniproject.org. Don't let autocorrect change it to "Pani."
- **Tagline:** "Compete with purpose. Give with intention." — appears in the Story section, bolded.
- **The Bismillah note** is in the brothers' voice (Noah & Zach), explaining what bismillah means. Don't make it generic.
- **Copy says "All proceeds are donated to our cause."** — keep this consistent everywhere; previous versions had "100% of proceeds" or "after expenses" but it was unified.

---

## 13. What's left to do (open work)

- Wire the 4 Stripe products (price IDs) into the checkout once you've created them and shared the IDs.
- Optional: set up `FORM_WEBHOOK_URL` env var in Vercel so contact-form submissions forward to a Slack channel, Zapier, or email. Right now they get logged but nothing notifies you.
- Optional: Stripe Tax — currently off. Turn on if your accountant says you need to collect sales tax.
- Optional: Add image-per-color to the product page (right now all colors show the same Sand sweatshirt photo).

---

## 14. One last thing

This is **your** website now. Don't be afraid to break it. Every change is reversible. The worst-case scenario is rolling back a bad deploy in Vercel — 30 seconds, no harm done. Just make changes one at a time, in small chunks, so when something breaks you know what caused it.

You both built this. You can run it.

— Last updated April 27, 2026
