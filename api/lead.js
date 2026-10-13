/* ============================================================
   FHSN — lead endpoint (Vercel Serverless Function)
   POST /api/lead  { type: 'shelf' | 'enquiry', … }  → emails it via Resend.

   Routing (addresses live in ../config.js):
     shelf   → CONFIG.shelfEmail (millie@fhsn.co.za)
     enquiry → CONFIG.deptEmails[<department>], the head of that department
               (empty until the addresses are confirmed → fallback address)

   Environment variables (Vercel → Settings → Environment Variables):
     RESEND_API_KEY       required.
     LEAD_FALLBACK_EMAIL  optional. Used while a department address is empty, and
                          as the safety net below. Defaults to durandt9919@gmail.com.
     VOTE_FROM            optional. Verified sender, e.g. "FHSN Website <web@fhsn.co.za>".
                          Without it Resend's test sender is used, which can ONLY
                          deliver to the Resend account's own address — in that case
                          the lead is delivered to the fallback address instead, with
                          a note saying who it was meant for, so nothing is lost.

   The recipient is never taken from the request. Every field is length-limited
   and HTML-escaped; reply_to is only set for a valid email.
   ============================================================ */
const CONFIG = require('../config.js');
const FALLBACK = process.env.LEAD_FALLBACK_EMAIL || 'durandt9919@gmail.com';
const FROM = process.env.VOTE_FROM || 'FHSN Website <onboarding@resend.dev>';
const ADDR = /^[^\s@<>()"',;:]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,24}$/i;
const DEPTS = { corporate: 'Companies', litigation: 'Litigation', property: 'Conveyancing', estates: 'Administration of Estates', notarial: 'Notarial' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max);
const line = (s, max) => str(s, max).replace(/[\r\n]+/g, ' ');

async function send(to, subject, html, text, replyTo) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: replyTo, subject: subject, html: html, text: text })
    });
    if (r.ok) return { ok: true };
    let msg = ''; try { msg = (await r.json()).message || ''; } catch (e) {}
    console.error('Resend rejected the email', r.status, msg);
    return { ok: false, status: r.status, message: msg };
  } catch (e) {
    console.error('Resend unreachable', e);
    return { ok: false, status: 0, message: '' };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'The form is not connected yet. Please call +27 12 424 0200.' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return res.status(400).json({ error: 'Bad request.' }); } }
  if (b.hp) return res.status(200).json({ ok: true });                 /* honeypot: only bots fill it */

  const type = b.type === 'shelf' ? 'shelf' : 'enquiry';
  const name = line(b.name, 100), email = line(b.email, 160), phone = line(b.phone, 40);
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!ADDR.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (type === 'shelf' && phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Please enter a phone number we can reach you on.' });

  let intended, rows, subject, label;
  const message = str(b.message, 3000);
  if (type === 'shelf') {
    intended = CONFIG.shelfEmail; label = 'Shelf company order';
    rows = [['Name', name], ['Email', email], ['Phone', phone || '—'], ['Preferred company name', line(b.company, 120) || '—']];
    subject = 'Shelf company order — ' + name;
  } else {
    const key = Object.prototype.hasOwnProperty.call(DEPTS, b.dept) ? b.dept : '';
    if (!key) return res.status(400).json({ error: 'Please choose a department.' });
    const configured = (CONFIG.deptEmails && CONFIG.deptEmails[key]) || '';
    intended = ADDR.test(configured) ? configured : '';
    label = 'Website enquiry — ' + DEPTS[key];
    rows = [['Department', DEPTS[key]], ['Name', name], ['Email', email], ['Phone', phone || '—']];
    subject = 'Website enquiry (' + DEPTS[key] + ') — ' + name;
  }
  const when = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'long', timeStyle: 'short' });

  const build = notice => ({
    html: '<div style="background:#f4f1ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;background:#fff;border-top:6px solid #6D0019">' +
      (notice ? '<div style="padding:12px 28px;background:#fff4d6;color:#7a5a00;font-size:13px">' + esc(notice) + '</div>' : '') +
      '<div style="padding:26px 28px 6px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9A227;font-weight:700">' + esc(label) + '</div>' +
      '<h1 style="margin:8px 0 4px;font-family:Georgia,serif;font-style:italic;font-size:28px;color:#2E3532">' + esc(name) + '</h1><div style="color:#777;font-size:14px">' + esc(when) + '</div></div>' +
      '<div style="padding:12px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
      rows.map(r => '<tr><td style="padding:8px 10px 8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px;width:40%">' + esc(r[0]) + '</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#222;font-weight:700">' + esc(r[1]) + '</td></tr>').join('') + '</table></div>' +
      (message ? '<div style="padding:8px 28px 6px"><div style="font-size:13px;font-weight:700;color:#2E3532;margin-bottom:6px">Message</div><div style="white-space:pre-wrap;font-size:14px;color:#333;background:#f8f6f2;padding:14px">' + esc(message) + '</div></div>' : '') +
      '<div style="padding:16px 28px 28px;font-size:13px;color:#777">Reply to this email to answer ' + esc(name.split(' ')[0]) + ' directly.</div></div></div>',
    text: (notice ? notice + '\n\n' : '') + [label, when, ''].concat(rows.map(r => r[0] + ': ' + r[1])).concat(message ? ['', 'Message:', message] : []).join('\n')
  });

  /* 1. the intended recipient */
  if (intended) {
    const m = build('');
    const r = await send(intended, subject, m.html, m.text, email);
    if (r.ok) return res.status(200).json({ ok: true });
    /* Resend's test sender refuses everyone but the account owner: deliver to the fallback with a note, never drop the lead */
    if (!(r.status === 403 && /testing emails|own email|verify a domain/i.test(r.message))) {
      return res.status(502).json({ error: 'We could not send your request just now. Please call +27 12 424 0200.' });
    }
  }
  /* 2. fallback (no department address configured yet, or sender domain not verified yet) */
  const note = intended
    ? 'Routing note: this was meant for ' + intended + ', but the sending domain is not verified yet, so it was delivered here instead.'
    : 'Routing note: no address is configured yet for this department (config.js → deptEmails), so it was delivered here.';
  const m = build(note);
  const r = await send(FALLBACK, '[' + (intended || 'unrouted') + '] ' + subject, m.html, m.text, email);
  if (r.ok) return res.status(200).json({ ok: true });
  return res.status(502).json({ error: 'We could not send your request just now. Please call +27 12 424 0200.' });
};
