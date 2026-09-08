/* Vercel serverless function — visitor/login activity alerts.
   Email transport: SendGrid v3 HTTP API (free tier, 100 emails/day).
   Env vars (production):
     SENDGRID_API_KEY  — SendGrid v3 API key (app.sendgrid.com → Settings → API Keys)
     SENDER_EMAIL      — verified Single Sender email on SendGrid
     EMAIL_TO          — your email that receives the notifications
 */
const REQUIRED = ['SENDGRID_API_KEY', 'SENDER_EMAIL', 'EMAIL_TO'];

const isValidType = (t) => t === 'visit' || t === 'login';

/* ---- Small dependency-free User-Agent parser ---- */
function getDevice(ua) {
  const s = String(ua || '');
  const isBot = /bot|crawler|spider|curl|wget|headless/i.test(s);

  let type = 'Desktop';
  if (/iPhone|Android/i.test(s) && !/iPad|Tablet/i.test(s)) type = 'Mobile';
  else if (/iPad|Tablet|PlayBook/i.test(s)) type = 'Tablet';

  let os = 'Unknown';
  if (/Windows/i.test(s)) os = 'Windows';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/CrOS/i.test(s)) os = 'Chrome OS';
  else if (/Linux/i.test(s)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = 'Opera';
  else if (/Chrome\//i.test(s)) browser = 'Chrome';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/Safari\//i.test(s)) browser = 'Safari';

  if (isBot) {
    browser = browser !== 'Unknown' ? `${browser} (Bot/Crawler)` : 'Bot/Crawler';
    type = 'Bot';
  }
  return { type, os, browser };
}

/* ---- Geo lookup: Vercel headers first, ipwho.is fallback ---- */
async function geoLookup(ip, reqHeaders) {
  const fallback = {
    country: reqHeaders['x-vercel-ip-country'] || 'Unknown',
    city: reqHeaders['x-vercel-ip-city'] || 'Unknown',
    region: reqHeaders['x-vercel-ip-country-region'] || 'Unknown',
  };
  const cleanIp = String(ip || '').trim();
  const isPrivate = !cleanIp || /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(cleanIp);
  if (isPrivate) return { ...fallback, source: 'local-dev' };

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('geo http ' + res.status);
    const j = await res.json();
    if (!j.success) throw new Error('geo response failed');
    return {
      country: j.country || 'Unknown',
      city: j.city || 'Unknown',
      region: j.region || 'Unknown',
      timezone: j.timezone?.id || '',
      source: 'ipwho.is',
    };
  } catch (e) {
    return { ...fallback, source: 'vercel-headers', geoFail: String((e && e.message) || e) };
  }
}

/* ---- HTML email ---- */
function buildEmail(d) {
  const badge = d.type === 'login'
    ? '<span style="background:#166534;color:#dcfce7;padding:6px 16px;border-radius:99px;font-weight:700;letter-spacing:.4px;display:inline-block">LOGIN EVENT</span>'
    : '<span style="background:#92400e;color:#fef3c7;padding:6px 16px;border-radius:99px;font-weight:700;letter-spacing:.4px;display:inline-block">VISIT EVENT</span>';

  const kind = d.type === 'login' ? 'log in ho gaya' : 'website visit ki';
  const subject = d.type === 'login'
    ? `☕ Chai & Charcha — Login: ${d.name || d.email || 'user'} (${d.device.browser}, ${d.device.os})`
    : `☕ Chai & Charcha — Naya visit (${d.device.browser}, ${d.device.os})`;

  const rows = [
    ['Event type', d.type === 'login' ? '🔐 LOGIN — user logged in' : '👀 VISIT — someone visited the website'],
    ['Name', d.name || '—'],
    ['Email', d.email || '—'],
    ['Device type', d.device.type],
    ['Device / OS', d.device.os],
    ['Browser', d.device.browser],
    ['IP address', d.ip || 'Unknown'],
    ['Country', d.country],
    ['City / location', d.city ? `${d.city}${d.region ? `, ${d.region}` : ''}` : '—'],
    ['Screen', d.screen || '—'],
    ['Language', d.lang || '—'],
    ['Time zone', d.tz || d.geoTimezone || '—'],
    ['Page / path', d.path || '/'],
    ['Referrer', d.referrer || 'direct'],
    ['Server visit time', d.serverTime],
    ['Client visit time', d.clientTime || '—'],
    ['Geo source', d.geoSource || '—'],
  ];

  const tr = rows.map(([k, v]) =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid #f0e6d6;color:#5c4a32;font-size:13px;white-space:nowrap;font-weight:600">${k}</td>` +
    `<td style="padding:9px 14px;border-bottom:1px solid #f0e6d6;color:#241203;font-size:13px">${String(v ?? '—').slice(0, 400)}</td></tr>`
  ).join('');

  return {
    subject,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5eddd;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:28px 12px">
          <table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5d9c4">
            <tr><td style="background:linear-gradient(135deg,#171008,#382a19);padding:26px 28px">
              <div style="font-size:34px">☕</div>
              <div style="color:#ffbe4d;font-size:21px;font-weight:700;font-family:Georgia,serif;margin-top:4px">Chai &amp; Charcha — Activity Alert</div>
              <div style="color:#eddcbf;font-size:13px;margin-top:6px">${kind}. Neeche poora detail hai.</div>
            </td></tr>
            <tr><td style="padding:22px 28px 0">
              ${badge}
              <hr style="border:none;border-top:1px dashed #e5d9c4;margin:16px 0">
            </td></tr>
            <tr><td style="padding:0 28px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ecdac2;border-radius:12px">${tr}</table>
            </td></tr>
            <tr><td style="padding:18px 28px 26px;color:#9a8868;font-size:12px;text-align:center">
              Chai &amp; Charcha · automated visitor notifications
            </td></tr>
          </table>
        </td></tr>
      </table></body></html>`,
  };
}

/* ---- SendGrid send ---- */
async function sendEmail(mail) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: process.env.EMAIL_TO }] }],
      from: { email: process.env.SENDER_EMAIL, name: 'Chai & Charcha Alerts' },
      subject: mail.subject,
      content: [{ type: 'text/html', value: mail.html }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  return res;
}

/* ---- Vercel handler ---- */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ ok: false, error: 'Not configured: ' + missing.join(', ') + ' (vercel env add)' });
  }

  let body = {};
  try { body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); }
  catch { body = {}; }

  const type = body.type;
  if (!isValidType(type)) return res.status(400).json({ ok: false, error: 'type must be visit | login' });

  const ua = req.headers['user-agent'] || '';
  const device = getDevice(ua);
  const ip = String(body.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

  const geo = await geoLookup(ip, req.headers);

  if (device.type === 'Bot') {
    return res.json({ ok: true, skipped: 'bot-detected' });
  }

  const now = new Date();
  const mail = buildEmail({
    type,
    name: String(body.name || '').slice(0, 80) || '',
    email: String(body.email || '').slice(0, 120) || '',
    ua: String(ua).slice(0, 300),
    ip,
    device,
    screen: String(body.screen || ''),
    lang: String(body.lang || ''),
    tz: String(body.tz || ''),
    path: String(body.path || '/').slice(0, 160),
    referrer: String(body.referrer || 'direct').slice(0, 200),
    serverTime: now.toLocaleString('en-PK', { timeZone: body.tz || 'Asia/Karachi' }),
    clientTime: String(body.clientTime || ''),
    geoTimezone: geo.timezone || '',
    country: geo.country,
    city: geo.city,
    region: geo.region,
    geoSource: geo.source + (geo.geoFail ? ` (${geo.geoFail})` : ''),
  });

  try {
    const sg = await sendEmail(mail);
    if (!sg.ok) {
      const txt = await sg.text().catch(() => '');
      console.error('SendGrid error', sg.status, txt.slice(0, 800));
      return res.status(502).json({ ok: false, error: 'SendGrid error ' + sg.status });
    }
    console.log(`[${type}] ${mail.subject}`);
    return res.json({ ok: true, sent: true, type });
  } catch (e) {
    console.error('send failed', e && e.message);
    return res.status(502).json({ ok: false, error: 'send failed: ' + (e && e.message) });
  }
};