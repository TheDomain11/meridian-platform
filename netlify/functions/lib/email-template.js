// Shared HTML and plain-text wrapper for client-facing emails, so every message carries
// the same type and signature. Palette matches Edition Two (ink, bronze, stone on paper).
// EB Garamond is the brand serif, but email clients only render fonts installed on the
// reader's device, so the stack falls back to Garamond (Office) then Georgia.

const INK = '#1F1B17'
const BRONZE = '#86632F'
const STONE = '#6E675D'
const RULE = '#DFDBD3'

const SERIF = "'EB Garamond',Garamond,Georgia,'Times New Roman',serif"
const SANS = "Arial,Helvetica,sans-serif"

const SIGNATURE = {
  name: 'George Skordi',
  role: 'Founder, Meridian International',
  email: 'george@meridianinternational.io',
  phone: '+852 6297 1699',
  site: 'meridianinternational.io',
  legal: 'Meridian Capital Holdings Limited, Hong Kong (BR 76904892)',
  note: 'Meridian is not a law firm.',
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function signatureText() {
  const s = SIGNATURE
  return [
    s.name,
    s.role,
    `${s.email} | ${s.phone}`,
    s.site,
    '',
    s.legal,
    s.note,
  ].join('\n')
}

function signatureHtml() {
  const s = SIGNATURE
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:2px solid ${BRONZE};">
      <tr><td style="padding-top:14px;">
        <div style="font-family:${SERIF};font-size:19px;line-height:1.3;color:${INK};">${esc(s.name)}</div>
        <div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${STONE};">${esc(s.role)}</div>
        <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${INK};margin-top:8px;">
          <a href="mailto:${esc(s.email)}" style="color:${INK};text-decoration:none;">${esc(s.email)}</a>
          <span style="color:${BRONZE};">&nbsp;|&nbsp;</span>${esc(s.phone)}
          <span style="color:${BRONZE};">&nbsp;|&nbsp;</span>
          <a href="https://${esc(s.site)}" style="color:${INK};text-decoration:none;">${esc(s.site)}</a>
        </div>
        <div style="font-family:${SANS};font-size:11.5px;line-height:1.6;color:${STONE};margin-top:10px;">${esc(s.legal)}<br/>${esc(s.note)}</div>
      </td></tr>
    </table>`
}

// paragraphs: array of strings (plain text) or { html } for pre-built inline markup.
// Pass `bodyHtml` for fully custom content (for example a payment button).
function renderEmail({ greeting, paragraphs = [], bodyHtml = '', closing = 'Kind regards,' }) {
  const p = (t) =>
    `<p style="margin:0 0 16px 0;">${typeof t === 'string' ? esc(t) : t.html}</p>`
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF9F6;">
  <div style="font-family:${SERIF};font-size:17px;line-height:1.65;color:${INK};max-width:560px;margin:0 auto;padding:32px 24px;">
    ${greeting ? p(greeting) : ''}
    ${paragraphs.map(p).join('\n    ')}
    ${bodyHtml}
    <p style="margin:24px 0 0 0;">${esc(closing)}</p>
    ${signatureHtml()}
  </div>
</body></html>`

  const plain = (t) => (typeof t === 'string' ? t : String(t.html).replace(/<[^>]+>/g, ''))
  const text = [
    greeting ? plain(greeting) : null,
    ...paragraphs.map(plain),
    closing,
    signatureText(),
  ].filter((x) => x !== null).join('\n\n')

  return { html, text }
}

module.exports = { renderEmail, signatureHtml, signatureText, SIGNATURE }
