/**
 * Shared spam checks for the contact and booking forms.
 *
 * Layers (cheapest first):
 *   1. Honeypot    — hidden "website" field (plus legacy "_gotcha"). Bots fill it; humans never see it.
 *   2. Timing      — form-guard.js sends "_elapsed" (ms since page load). Missing or under 3s = bot.
 *   3. Content     — obvious SEO / marketing / junk pitches and link-stuffed messages.
 *   4. Turnstile   — Cloudflare's human check. Only enforced once BOTH env vars are set:
 *                      TURNSTILE_SITE_KEY   — public key (served to the page by /api/turnstile-config)
 *                      TURNSTILE_SECRET_KEY — secret key (used here to verify the token)
 *
 * Layers 1–3 fail silently (fake success) so bots don't learn what tripped them.
 * Turnstile failure returns an error so a real person can retry.
 */

const MIN_ELAPSED_MS = 3000;

const SPAM_PATTERNS = [
  /\bseo\b/i,
  /search engine optimi[sz]ation/i,
  /\bback-?links?\b/i,
  /link[- ]building/i,
  /guest[- ]post/i,
  /domain authority/i,
  /first page of google/i,
  /rank(ing)? (higher|#?1|on google)/i,
  /(website|web) traffic/i,
  /lead generation/i,
  /digital marketing (agency|services)/i,
  /web ?design (services|agency)/i,
  /\b(crypto|bitcoin|casino|viagra|cialis|forex)\b/i,
  /\bmattress(es)?\b/i,
];

export function honeypotTripped(form) {
  return Boolean(form.get('website') || form.get('_gotcha'));
}

export function tooFast(form) {
  const elapsed = Number(form.get('_elapsed'));
  return !Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS;
}

export function looksLikeSpam(fields) {
  const text = fields.filter(Boolean).join('\n');
  const links = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 2) return 'links';
  const hit = SPAM_PATTERNS.find((re) => re.test(text));
  return hit ? `pattern ${hit}` : null;
}

export function turnstileEnabled(env) {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(form, request, env) {
  const token = form.get('cf-turnstile-response');
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const out = await res.json();
    return Boolean(out.success);
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return false;
  }
}

/**
 * Runs every layer. Returns null if the submission looks human, otherwise
 * { silent: true } (fake success) or { silent: false } (real error to show).
 */
export async function checkSubmission(form, request, env, textFields) {
  if (honeypotTripped(form)) return reject('honeypot', true);
  if (tooFast(form)) return reject('too fast', true);
  const spam = looksLikeSpam(textFields);
  if (spam) return reject(`content: ${spam}`, true);
  if (turnstileEnabled(env) && !(await verifyTurnstile(form, request, env))) {
    return reject('turnstile', false);
  }
  return null;
}

function reject(reason, silent) {
  console.log('Spam blocked:', reason);
  return { reason, silent };
}
