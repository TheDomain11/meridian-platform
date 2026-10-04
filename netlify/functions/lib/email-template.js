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
  credentials: 'LLB, LLM',
  email: 'george@meridianinternational.io',
  phone: '+852 6297 1699',
  site: 'meridianinternational.io',
}

const FOOTER = {
  tagline: 'Ready for the border.',
  enquiries: 'enquiries@meridianinternational.io',
  whatsapp: '+852 6297 1699',
  whatsappUrl: 'https://wa.me/85262971699',
  site: 'https://meridianinternational.io',
  links: [
    ['Terms of Service', 'https://meridianinternational.io/terms.html'],
    ['Privacy Policy', 'https://meridianinternational.io/privacy.html'],
    ['Jurisdiction and regulatory notices', 'https://meridianinternational.io/jurisdiction.html'],
  ],
  company: 'Meridian Capital Holdings Limited, trading as Meridian International. Hong Kong Business Registration No. 76904892.',
  // Same wording as the website footer and Terms. Keep in step with the site.
  disclosure:
    'Meridian International provides commercial and compliance analysis. It does not provide customs brokerage or tax advice. Meridian is not a law firm. George Skordi is not admitted to practise law in any jurisdiction. Meridian\u2019s assessments are regulatory and contractual analysis. Where a matter needs a lawyer\u2019s opinion, representation or formal legal documents, Meridian says so and refers the client to a qualified lawyer in the relevant jurisdiction.',
  copyright: '\u00a9 2026 Meridian Capital Holdings Limited. MERIDIAN INTERNATIONAL\u2122 is an unregistered trade mark.',
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
    s.credentials,
    s.role,
    `${s.email} | ${s.phone}`,
    s.site,
  ].join('\n')
}

function footerText() {
  const f = FOOTER
  return [
    '--',
    `MERIDIAN INTERNATIONAL. ${f.tagline}`,
    `${f.enquiries} | WhatsApp ${f.whatsapp} | ${f.site}`,
    f.links.map(([l, u]) => `${l}: ${u}`).join('\n'),
    '',
    f.company,
    f.disclosure,
    f.copyright,
  ].join('\n')
}

function signatureHtml() {
  const s = SIGNATURE
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:2px solid ${BRONZE};">
      <tr><td style="padding-top:14px;">
        <div style="font-family:${SERIF};font-size:19px;line-height:1.3;color:${INK};">${esc(s.name)}</div>
        <div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${INK};">${esc(s.credentials)}</div>
        <div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${STONE};">${esc(s.role)}</div>
        <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${INK};margin-top:8px;">
          <a href="mailto:${esc(s.email)}" style="color:${INK};text-decoration:none;">${esc(s.email)}</a>
          <span style="color:${BRONZE};">&nbsp;|&nbsp;</span>${esc(s.phone)}
          <span style="color:${BRONZE};">&nbsp;|&nbsp;</span>
          <a href="https://${esc(s.site)}" style="color:${INK};text-decoration:none;">${esc(s.site)}</a>
        </div>
      </td></tr>
    </table>`
}

function footerHtml() {
  const f = FOOTER
  const link = (t, u) => `<a href="${esc(u)}" style="color:${STONE};text-decoration:underline;">${esc(t)}</a>`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:40px;background:#F2EFE8;border-top:3px solid ${BRONZE};">
      <tr><td style="padding:24px 24px 8px 24px;">
        <div style="font-family:${SERIF};font-size:18px;letter-spacing:0.18em;color:${INK};">MERIDIAN INTERNATIONAL</div>
        <div style="font-family:${SERIF};font-size:15px;font-style:italic;color:${BRONZE};margin-top:2px;">${esc(f.tagline)}</div>
      </td></tr>
      <tr><td style="padding:12px 24px 0 24px;font-family:${SANS};font-size:12.5px;line-height:1.8;color:${INK};">
        <a href="mailto:${esc(f.enquiries)}" style="color:${INK};text-decoration:none;">${esc(f.enquiries)}</a><br/>
        ${link('WhatsApp ' + f.whatsapp, f.whatsappUrl)}<br/>
        ${link('meridianinternational.io', f.site)}
      </td></tr>
      <tr><td style="padding:12px 24px 0 24px;font-family:${SANS};font-size:12px;line-height:1.8;color:${STONE};">
        ${f.links.map(([t, u]) => link(t, u)).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;')}
      </td></tr>
      <tr><td style="padding:14px 24px 24px 24px;font-family:${SANS};font-size:11px;line-height:1.6;color:${STONE};">
        <p style="margin:0 0 8px 0;">${esc(f.company)}</p>
        <p style="margin:0 0 8px 0;">${esc(f.disclosure)}</p>
        <p style="margin:0;">${esc(f.copyright)}</p>
      </td></tr>
    </table>`
}

// Turns a typed reply into paragraphs for renderEmail. A pasted sign-off ("Kind regards,"
// and everything after it) is dropped, because the template adds its own closing,
// signature and footer to every message. Lines starting "- " become bullets.
function textToParagraphs(text) {
  const body = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*(?:Kind regards|Best regards|Regards|Yours sincerely)[,.]?[ \t]*(?:\n|$)/i)[0]
    .trim()
  if (!body) return []
  return body.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').map((l) => l.replace(/^\s*-\s+/, '\u2022 '))
    return { html: lines.map(esc).join('<br/>'), text: lines.join('\n') }
  })
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
    ${footerHtml()}
  </div>
</body></html>`

  const plain = (t) =>
    typeof t === 'string'
      ? t
      : t.text ?? String(t.html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  const text = [
    greeting ? plain(greeting) : null,
    ...paragraphs.map(plain),
    closing,
    signatureText(),
    footerText(),
  ].filter((x) => x !== null).join('\n\n')

  return { html, text }
}

module.exports = { renderEmail, textToParagraphs, esc, signatureHtml, signatureText, footerHtml, footerText, SIGNATURE, FOOTER }
