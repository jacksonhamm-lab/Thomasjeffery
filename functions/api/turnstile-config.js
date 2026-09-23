/**
 * GET /api/turnstile-config — hands the public Turnstile site key to form-guard.js.
 * Returns { siteKey: null } until both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY
 * are set, so the widget and server-side check switch on together.
 */

import { turnstileEnabled } from '../_lib/spam.js';

export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    siteKey: turnstileEnabled(env) ? env.TURNSTILE_SITE_KEY : null,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
