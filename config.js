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
  stripePublishableKey: "pk_live_51TPkisGgXyid7BicupTeggAF72Fg10sCi7qe2DCmGJYXabVUOtxP6kHtpNZzgdVe50z4BJHub3JRcRwQzytTpuyl00ebaijb0q",

  brand: {
    // Shown across the site wherever we say "donation to X".
    // Once you finalize the charity name, update this one string.
    causeName: "our cause",

    // Production URL — used to build absolute links in emails & Stripe redirects.
    canonicalUrl: "https://teamsiddiqi.com"
  }
};
