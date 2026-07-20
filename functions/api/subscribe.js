/**
 * POST /api/subscribe — subscribe-form intake.
 *
 * Receives form data from subscribe.html. Does two things:
 *   1. Adds the subscriber to Mailchimp via API (v3.0 lists/members endpoint).
 *   2. Sends a branded notification email to the addresses in SUBSCRIBE_TO
 *      via Resend. Supports multiple recipients (comma-separated) — this is
 *      the point of this function existing: Mailchimp's own notification
 *      setting only allows one address.
 *
 * Env vars (configured in Cloudflare Pages dashboard → Settings → Environment):
 *   MAILCHIMP_API_KEY   — Mailchimp API key
 *   MAILCHIMP_LIST_ID   — audience ID (defaults to 8352715181, the live list)
 *   MAILCHIMP_DC        — server prefix (defaults to us1)
 *   RESEND_API_KEY      — Resend API key (starts with "re_"). Shared with booking/contact functions.
 *   SUBSCRIBE_TO        — comma-separated recipient list for notifications.
 *                         Defaults to timbeggs@ + marketing@.
 *   SUBSCRIBE_FROM      — sender (defaults to Thomas Jeffery <subscribe@thomasjeffery.ca>).
 *                         Must use the thomasjeffery.ca domain (verified in Resend).
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();

    // Honeypot — bots will fill this; humans won't see it.
    // (Matches the hidden field name in subscribe.html: b_<user_id>_<list_id>.)
    if (form.get('b_a677e9b99521296ba09580ea8_8352715181')) {
      return json({ ok: true });
    }

    const data = {
      email: (form.get('EMAIL') || '').toString().trim(),
      firstName: (form.get('FNAME') || '').toString().trim(),
      lastName: (form.get('LNAME') || '').toString().trim(),
    };

    if (!data.email || !isValidEmail(data.email)) {
      return json({ ok: false, error: 'Valid email required.' }, 400);
    }

    // ─ 1. Add to Mailchimp ─
    const mcApiKey = env.MAILCHIMP_API_KEY;
    const listId = env.MAILCHIMP_LIST_ID || '8352715181';
    const dc = env.MAILCHIMP_DC || 'us1';

    if (!mcApiKey) {
      console.error('Missing MAILCHIMP_API_KEY env var');
      return json({ ok: false, error: 'Server misconfigured.' }, 500);
    }

    const mcRes = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`anystring:${mcApiKey}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: data.email,
          status: 'subscribed',
          merge_fields: {
            FNAME: data.firstName,
            LNAME: data.lastName,
          },
        }),
      }
    );

    let alreadySubscribed = false;
    if (!mcRes.ok) {
      const errBody = await mcRes.json().catch(() => ({}));
      // 400 with title "Member Exists" is fine — treat as success but skip notification.
      if (mcRes.status === 400 && errBody.title === 'Member Exists') {
        alreadySubscribed = true;
      } else {
        console.error('Mailchimp error:', mcRes.status, JSON.stringify(errBody));
        return json({ ok: false, error: 'Signup failed. Please try again.' }, 502);
      }
    }

    // ─ 2. Send notification email — skip if this was a re-subscribe attempt ─
    if (!alreadySubscribed) {
      const recipients = (env.SUBSCRIBE_TO ||
                          'timbeggs@thomasjeffery.ca,marketing@thomasjeffery.ca')
        .split(',').map(s => s.trim()).filter(Boolean);
      const from = env.SUBSCRIBE_FROM ||
                   'Thomas Jeffery <subscribe@thomasjeffery.ca>';
      const displayName = `${data.firstName} ${data.lastName}`.trim() || '(no name)';

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: recipients,
          reply_to: data.email,
          subject: `New subscriber — ${displayName}`,
          html: renderHtml(data, displayName),
          text: renderText(data, displayName),
        }),
      });

      if (!resendRes.ok) {
        // Log but don't fail the whole request — the subscriber IS in Mailchimp.
        // A missed notification is annoying but not user-facing.
        const errBody = await resendRes.text();
        console.error('Resend notification error:', resendRes.status, errBody);
      }
    }

    return json({ ok: true, alreadySubscribed });
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return json({ ok: false, error: 'Unexpected error.' }, 500);
  }
}


function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:8px 16px 8px 0;color:#6B6B6B;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;vertical-align:top;width:160px;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#1C2B39;font-size:15px;line-height:1.55;">${escapeHtml(value)}</td></tr>`;
}

function renderHtml(d, displayName) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Lato',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F0EB;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;padding:40px;">
        <tr><td>
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.36em;text-transform:uppercase;color:#6B6B6B;font-weight:700;">New Subscriber</p>
          <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:300;color:#1C2B39;line-height:1.25;">${escapeHtml(displayName)} joined the list</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5E5E5;">
            ${row('Name', displayName)}
            ${row('Email', d.email)}
          </table>
          <p style="margin:32px 0 0 0;padding-top:24px;border-top:1px solid #E5E5E5;font-size:12px;color:#6B6B6B;line-height:1.6;">They are in Mailchimp already. Welcome email fires automatically.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(d, displayName) {
  return [
    `New subscriber — ${displayName}`,
    '',
    `Name: ${displayName}`,
    `Email: ${d.email}`,
    '',
    `They are in Mailchimp already. Welcome email fires automatically.`,
  ].join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
