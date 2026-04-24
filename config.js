/* ===========================================================
   TSE — Site configuration

   Edit these values after you set up your Stripe account.
   This file is loaded by index.html BEFORE the main script,
   so anything you put here is available as window.TSE_CONFIG.

   SAFE TO COMMIT: the publishable key is meant for client-side.
   NEVER put your Stripe SECRET key in here.
   =========================================================== */
window.TSE_CONFIG = {
  // Paste your publishable key from Stripe Dashboard → Developers → API keys.
  // Starts with "pk_test_" while testing, "pk_live_" once you're ready for real orders.
  stripePublishableKey: "pk_test_51TPkjDGVZ0U84xm7jC8S2JVcuZ5U8i1A7QrDpDHdZyl4AiqwEr7KOqqxdzDPYb2foBbGXz7zAjdEmmonKPUtP3IK0039DcTe1h",

  brand: {
    // Shown across the site wherever we say "donation to X".
    // Once you finalize the charity name, update this one string.
    causeName: "our cause",

    // Production URL — used to build absolute links in emails & Stripe redirects.
    canonicalUrl: "https://teamsiddiqi.com"
  }
};
