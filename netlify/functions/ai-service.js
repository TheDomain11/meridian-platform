const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'PLACEHOLDER_ANTHROPIC_API_KEY'
const AI_PROVIDER = process.env.AI_PROVIDER || 'claude'
const MODEL = 'claude-sonnet-4-6'

const MERIDIAN_CONTEXT = `You are the AI engine behind Meridian Platform, the internal operating system for Meridian International — a Hong Kong-registered China sourcing and procurement agency. The owner, George, holds both an LLB and an LLM (dual legal qualifications) and is based in Guangzhou. Meridian operates on a commission-only basis: it sources factories, negotiates pricing, and manages quality control and logistics on behalf of B2B clients — it never holds inventory itself. Target markets are South Africa, the EU, and the UK.

When drafting any communication, write in first person as George: professional, specific, and concrete — reference the actual details you've been given. Never use generic corporate language, vague filler, or placeholder brackets left for someone to fill in.`

function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

function safeParseJson(text, fallback) {
  try {
    return JSON.parse(stripMarkdownFences(text))
  } catch {
    return fallback
  }
}

async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  if (AI_PROVIDER !== 'claude') {
    throw new Error(`Unsupported AI_PROVIDER: "${AI_PROVIDER}"`)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  const result = await res.json()
  if (!res.ok) {
    throw new Error(`Claude API error: ${result.error?.message || JSON.stringify(result)}`)
  }
  return result.content?.[0]?.text ?? ''
}

// ── Feature handlers ──────────────────────────────────────────────────────────
// Each returns { result, action, data }. ai-service.js is the only place in the
// platform that talks to the AI provider — callers never call Claude directly.

async function emailProcess(payload) {
  const { fromName = '', fromEmail = '', subject = '', bodyText = '' } = payload

  const systemPrompt = `${MERIDIAN_CONTEXT}

You are triaging an inbound email. Do all of the following:
1. Classify the intent as exactly one of: NEW_ENQUIRY, RFQ, STATUS_UPDATE, GENERAL
2. Extract the sender's name, company (if mentioned or reasonably inferable), product interest, and budget (if mentioned)
3. Write a one-line summary of the enquiry
4. Draft a professional reply in George's voice, signed "George"

Respond with ONLY a JSON object — no markdown fences, no commentary — in exactly this shape:
{
  "intent": "NEW_ENQUIRY" | "RFQ" | "STATUS_UPDATE" | "GENERAL",
  "clientName": string,
  "company": string or null,
  "productInterest": string or null,
  "budget": string or null,
  "summary": string,
  "draftResponse": string
}`

  const userMessage = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${bodyText}`
  const raw = await callClaude(systemPrompt, userMessage, 1024)

  const result = safeParseJson(raw, {
    intent: 'GENERAL',
    clientName: fromName,
    company: null,
    productInterest: null,
    budget: null,
    summary: subject || 'Inbound email could not be auto-summarized.',
    draftResponse: '',
  })

  return { result, action: null, data: null }
}

async function emailReply(payload) {
  const { fromName = '', fromEmail = '', subject = '', bodyText = '', instruction = '' } = payload

  const systemPrompt = `${MERIDIAN_CONTEXT}

Below the line is the email you're replying to, plus any extra instruction from George about how to handle it. Draft a professional reply in George's voice, signed "George". Respond with ONLY a JSON object — no markdown fences — in exactly this shape: { "draftResponse": string }`

  const userMessage = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${bodyText}${
    instruction ? `\n\n---\nGeorge's instruction for this reply: ${instruction}` : ''
  }`

  const raw = await callClaude(systemPrompt, userMessage, 1024)
  const result = safeParseJson(raw, { draftResponse: '' })
  return { result, action: null, data: null }
}

async function orderSummary(payload) {
  const { order = {}, client = {} } = payload

  const systemPrompt = `${MERIDIAN_CONTEXT}

Summarise the status of this order and the specific next actions needed. Be concrete — reference the actual order details given. Respond with ONLY a JSON object — no markdown fences — in exactly this shape: { "summary": string }`

  const userMessage = `Order: ${JSON.stringify(order)}\nClient: ${JSON.stringify(client)}`
  const raw = await callClaude(systemPrompt, userMessage, 600)
  const result = safeParseJson(raw, { summary: 'Could not generate a summary for this order.' })
  return { result, action: null, data: null }
}

async function clientSummary(payload) {
  const { client = {}, orders = [], invoices = [] } = payload

  const systemPrompt = `${MERIDIAN_CONTEXT}

Summarise this client's history and the current state of the relationship — order volume, payment reliability, and anything that needs attention. Be concrete. Respond with ONLY a JSON object — no markdown fences — in exactly this shape: { "summary": string }`

  const userMessage = `Client: ${JSON.stringify(client)}\nOrders: ${JSON.stringify(orders)}\nInvoices: ${JSON.stringify(invoices)}`
  const raw = await callClaude(systemPrompt, userMessage, 600)
  const result = safeParseJson(raw, { summary: 'Could not generate a summary for this client.' })
  return { result, action: null, data: null }
}

async function invoiceChase(payload) {
  const { invoice = {}, client = {} } = payload

  const systemPrompt = `${MERIDIAN_CONTEXT}

Draft a payment reminder email in George's voice, signed "George". Tone should scale with how overdue the invoice is — polite if just due, firmer if significantly overdue — but always professional. Respond with ONLY a JSON object — no markdown fences — in exactly this shape: { "draftResponse": string }`

  const userMessage = `Invoice: ${JSON.stringify(invoice)}\nClient: ${JSON.stringify(client)}`
  const raw = await callClaude(systemPrompt, userMessage, 600)
  const result = safeParseJson(raw, { draftResponse: '' })
  return { result, action: null, data: null }
}

async function dashboardSummary(payload) {
  const systemPrompt = `${MERIDIAN_CONTEXT}

Give a short natural-language overview of business status from the figures provided, ending with specific priority actions for today — not generic advice, reference the actual numbers and named items given. Respond with ONLY a JSON object — no markdown fences — in exactly this shape: { "summary": string }`

  const userMessage = `Business snapshot: ${JSON.stringify(payload)}`
  const raw = await callClaude(systemPrompt, userMessage, 500)
  const result = safeParseJson(raw, { summary: 'Could not generate today\'s summary.' })
  return { result, action: null, data: null }
}

const SHELL_ACTIONS = [
  'create_client', 'update_client',
  'create_order', 'update_order',
  'create_supplier', 'update_supplier',
  'send_email', 'query', 'none',
]

async function shellCommand(payload) {
  const { instruction = '', context = {} } = payload
  if (!instruction.trim()) {
    return { result: 'Please type an instruction or question.', action: 'none', data: null }
  }

  const systemPrompt = `${MERIDIAN_CONTEXT}

You are the command interpreter for Meridian Platform's AI Shell — a single command bar where George types freeform instructions or questions. You're given the instruction plus a compact list of existing clients, orders, and suppliers (id + display name + status) so you can resolve names mentioned in the instruction to their record IDs.

Decide exactly ONE action: ${SHELL_ACTIONS.join(', ')}.
- update_client / update_order / update_supplier require a resolved id from the provided list — if you can't confidently match one, use "none" instead and ask for clarification.
- send_email means drafting an email — you never send it yourself, only draft it for human approval.
- query means answering a question using the context you were given — put the actual answer in "response".
- none covers conversational replies, clarifying questions, or anything you can't safely act on.

Respond with ONLY a JSON object — no markdown fences — in exactly this shape:
{
  "action": "create_client" | "update_client" | "create_order" | "update_order" | "create_supplier" | "update_supplier" | "send_email" | "query" | "none",
  "response": string — a short, plain-English confirmation or answer,
  "data": object or null
}

"data" shape by action:
- create_client: { company, contact, email, phone, country, status, source, notes }
- update_client: { id, ...fields to change }
- create_order: { orderId, clientId, reference, category, description, value, origin, status, deadline, notes }
- update_order: { id, ...fields to change }
- create_supplier: { name, contactName, wechat, phone, email, location, category, moq, leadTime, paymentTerms, status, notes }
- update_supplier: { id, ...fields to change }
- send_email: { toEmail, toName, subject, draftResponse, clientId or null }
- query / none: null

Be conservative — if anything is ambiguous, prefer "none" and ask for clarification in "response" rather than guessing.`

  const userMessage = `Instruction: ${instruction}\n\nExisting records:\n${JSON.stringify(context)}`
  const raw = await callClaude(systemPrompt, userMessage, 1024)

  const parsed = safeParseJson(raw, {
    action: 'none',
    response: "Sorry, I couldn't process that — try rephrasing.",
    data: null,
  })

  if (!SHELL_ACTIONS.includes(parsed.action)) {
    parsed.action = 'none'
  }

  // send_email is the one shell action ai-service.js executes itself: drafts go into
  // email_approvals (service-role only — the browser can't write to it directly) for
  // human review, rather than sending immediately from a freeform command.
  if (parsed.action === 'send_email' && parsed.data) {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: approval, error } = await supabaseAdmin
      .from('email_approvals')
      .insert({
        from_email: parsed.data.toEmail || '',
        from_name: parsed.data.toName || '',
        subject: parsed.data.subject || '',
        body_raw: '',
        intent: 'GENERAL',
        client_id: parsed.data.clientId ?? null,
        summary: parsed.response,
        draft_response: parsed.data.draftResponse || '',
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    parsed.data = { ...parsed.data, approvalId: approval.id }
  }

  return { result: parsed.response, action: parsed.action, data: parsed.data }
}

const FEATURE_HANDLERS = {
  email_process: emailProcess,
  email_reply: emailReply,
  order_summary: orderSummary,
  client_summary: clientSummary,
  invoice_chase: invoiceChase,
  dashboard_summary: dashboardSummary,
  shell_command: shellCommand,
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 200, body: JSON.stringify({ result: null, action: null, data: null, error: 'Invalid JSON body' }) }
  }

  const { feature, payload } = body || {}
  const handlerFn = FEATURE_HANDLERS[feature]

  if (!handlerFn) {
    return {
      statusCode: 200,
      body: JSON.stringify({ result: null, action: null, data: null, error: `Unknown feature: "${feature}"` }),
    }
  }

  try {
    const { result, action, data } = await handlerFn(payload || {})
    return { statusCode: 200, body: JSON.stringify({ result, action: action ?? null, data: data ?? null, error: null }) }
  } catch (err) {
    console.error(`[ai-service] feature=${feature} failed:`, err)
    return { statusCode: 200, body: JSON.stringify({ result: null, action: null, data: null, error: err.message }) }
  }
}
