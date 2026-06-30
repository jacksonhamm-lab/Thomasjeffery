/**
 * POST /api/contact — contact-form intake.
 *
 * Routes:
 *   inquiryType=customer → info@thomasjeffery.ca + sales@thomasjeffery.ca
 *   inquiryType=business → len@thomasjeffery.ca
 *
 * Env vars (configured in Cloudflare Pages dashboard → Settings → Environment):
 *   RESEND_API_KEY      — Resend API key (shared with booking.js)
 *   CONTACT_FROM        — sender (defaults to "Thomas Jeffery <contact@thomasjeffery.ca>")
 *   CONTACT_CUSTOMER_TO — customer recipients, comma-separated (defaults to info@ + sales@)
 *   CONTACT_BUSINESS_TO — business recipients, comma-separated (defaults to len@)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();

    if (form.get('_gotcha')) {
      return json({ ok: true });
    }

    const data = {
      inquiryType: (form.get('inquiryType') || 'customer').toString().toLowerCase(),
      firstName: (form.get('firstName') || '').toString(),
      lastName: (form.get('lastName') || '').toString(),
      email: (form.get('email') || '').toString(),
      phone: (form.get('phone') || '').toString(),
      message: (form.get('message') || '').toString(),
    };

    if (!data.firstName || !data.email || !data.message) {
      return json({ ok: false, error: 'Missing required fields.' }, 400);
    }

    const isBusiness = data.inquiryType === 'business';
    const defaultTo = isBusiness
      ? 'len@thomasjeffery.ca'
      : 'info@thomasjeffery.ca, sales@thomasjeffery.ca';
    const toRaw = isBusiness
      ? (env.CONTACT_BUSINESS_TO || defaultTo)
      : (env.CONTACT_CUSTOMER_TO || defaultTo);
    const to = toRaw.split(',').map((s) => s.trim()).filter(Boolean);

    const from = env.CONTACT_FROM || 'Thomas Jeffery <contact@thomasjeffery.ca>';
    const typeLabel = isBusiness ? 'Business' : 'Customer';
    const name = `${data.firstName} ${data.lastName}`.trim();
    const subject = `${typeLabel} inquiry — ${name}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: data.email,
        subject,
        html: renderHtml(data, typeLabel),
        text: renderText(data, typeLabel),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Resend error:', res.status, errBody);
      return json({ ok: false, error: 'Email send failed.' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return json({ ok: false, error: 'Unexpected error.' }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:8px 16px 8px 0;color:#6B6B6B;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;vertical-align:top;width:140px;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#1C2B39;font-size:15px;line-height:1.55;">${escapeHtml(value)}</td></tr>`;
}

function renderHtml(d, typeLabel) {
  const name = `${d.firstName} ${d.lastName}`.trim();
  const messageHtml = escapeHtml(d.message).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Lato',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F0EB;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;padding:40px;">
        <tr><td>
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.36em;text-transform:uppercase;color:#6B6B6B;font-weight:700;">${escapeHtml(typeLabel)} Inquiry</p>
          <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:300;color:#1C2B39;line-height:1.25;">${escapeHtml(name)}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5E5E5;">
            ${row('Name', name)}
            ${row('Email', d.email)}
            ${row('Phone', d.phone)}
          </table>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #E5E5E5;">
            <p style="margin:0 0 10px 0;color:#6B6B6B;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Message</p>
            <p style="margin:0;color:#1C2B39;font-size:15px;line-height:1.65;white-space:pre-wrap;">${messageHtml}</p>
          </div>
          <p style="margin:32px 0 0 0;padding-top:24px;border-top:1px solid #E5E5E5;font-size:12px;color:#6B6B6B;line-height:1.6;">Reply directly to this email to reach ${escapeHtml(d.firstName) || 'the sender'}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(d, typeLabel) {
  const name = `${d.firstName} ${d.lastName}`.trim();
  return [
    `${typeLabel} inquiry — ${name}`,
    '',
    `Name: ${name}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : '',
    '',
    'Message:',
    d.message,
    '',
    `Reply directly to this email to reach ${d.firstName || 'the sender'}.`,
  ].filter(Boolean).join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
