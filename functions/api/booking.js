/**
 * POST /api/booking — booking-form intake.
 *
 * Receives form data from book-office.html, book-wedding.html, book-casual.html.
 * Sends a branded notification email to appointments@thomasjeffery.ca via Resend.
 *
 * Env vars (configured in Cloudflare Pages dashboard → Settings → Environment):
 *   RESEND_API_KEY  — Resend API key (starts with "re_")
 *   BOOKING_TO      — recipient email (defaults to appointments@thomasjeffery.ca)
 *   BOOKING_FROM    — sender (defaults to "Thomas Jeffery <bookings@thomasjeffery.ca>")
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();

    // Honeypot — bots will fill this; humans won't see it.
    if (form.get('_gotcha')) {
      return json({ ok: true });
    }

    // Pull the fields. Anything missing comes through as empty string.
    const data = {
      service: detectService(form.get('_subject') || ''),
      subject: form.get('_subject') || 'Booking Request',
      firstName: form.get('firstName') || '',
      lastName: form.get('lastName') || '',
      email: form.get('email') || '',
      phone: form.get('phone') || '',
      preferredDay: form.get('preferredDay') || '',
      preferredTime: form.get('preferredTime') || '',
      appointmentType: form.get('appointmentType') || '',
      customAppointment: form.get('customAppointment') || '',
      notes: form.get('notes') || '',
    };

    if (!data.firstName || !data.email) {
      return json({ ok: false, error: 'Missing required fields.' }, 400);
    }

    const to = env.BOOKING_TO || 'appointments@thomasjeffery.ca';
    const from = env.BOOKING_FROM || 'Thomas Jeffery <bookings@thomasjeffery.ca>';
    const subject = `New booking — ${capitalize(data.service)} — ${data.firstName} ${data.lastName}`.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject,
        html: renderHtml(data),
        text: renderText(data),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Resend error:', res.status, errBody);
      return json({ ok: false, error: 'Email send failed.' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Booking handler error:', err);
    return json({ ok: false, error: 'Unexpected error.' }, 500);
  }
}

function detectService(subject) {
  const s = subject.toLowerCase();
  if (s.includes('wedding')) return 'wedding';
  if (s.includes('office')) return 'office';
  if (s.includes('casual') || s.includes('custom')) return 'casual';
  return 'booking';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
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

function renderHtml(d) {
  const name = `${d.firstName} ${d.lastName}`.trim();
  const type = d.appointmentType || '—';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Lato',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F0EB;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;padding:40px;">
        <tr><td>
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.36em;text-transform:uppercase;color:#6B6B6B;font-weight:700;">New Booking</p>
          <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:300;color:#1C2B39;line-height:1.25;">${escapeHtml(capitalize(d.service))} appointment — ${escapeHtml(name)}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5E5E5;">
            ${row('Appointment Type', type)}
            ${row('Custom', d.customAppointment && d.customAppointment !== 'No' ? 'Yes' : '')}
            ${row('Name', name)}
            ${row('Email', d.email)}
            ${row('Phone', d.phone)}
            ${row('Preferred Day', d.preferredDay)}
            ${row('Preferred Time', d.preferredTime)}
            ${row('Notes', d.notes)}
          </table>
          <p style="margin:32px 0 0 0;padding-top:24px;border-top:1px solid #E5E5E5;font-size:12px;color:#6B6B6B;line-height:1.6;">Reply directly to this email to reach ${escapeHtml(d.firstName) || 'the customer'}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(d) {
  const name = `${d.firstName} ${d.lastName}`.trim();
  return [
    `New ${d.service} booking — ${name}`,
    '',
    `Appointment Type: ${d.appointmentType || '—'}`,
    d.customAppointment && d.customAppointment !== 'No' ? 'Custom: Yes' : '',
    `Name: ${name}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : '',
    d.preferredDay ? `Preferred Day: ${d.preferredDay}` : '',
    d.preferredTime ? `Preferred Time: ${d.preferredTime}` : '',
    d.notes ? `Notes: ${d.notes}` : '',
    '',
    `Reply directly to this email to reach ${d.firstName || 'the customer'}.`,
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
