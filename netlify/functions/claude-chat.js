// Drop the real key into the Netlify site's environment variables as ANTHROPIC_API_KEY.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) throw new Error('Missing required environment variable: ANTHROPIC_API_KEY')
const MODEL = 'claude-sonnet-4-6'

const { MERIDIAN_SYSTEM_PROMPT } = require('./lib/meridian-ai-context.js')

// web_search_20250305 is Anthropic's server-executed search tool — Claude decides per call
// whether a question actually needs it, so a routine question costs the same as before and
// only a genuinely research-worthy one triggers a real search instead of an answer
// confidently guessed from training data.
const WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }]

function describeEntity(entity) {
  if (!entity) return ''
  const fields = Object.entries(entity)
    .filter(([key, value]) => key !== 'type' && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
  return `\n\nThe user is currently viewing this ${entity.type}: ${fields}.`
}

function buildSystemPrompt(context) {
  const module = context?.module || 'Dashboard'
  const entityBlock = describeEntity(context?.entity)

  return `${MERIDIAN_SYSTEM_PROMPT}

You are Meridian AI, an assistant embedded directly in the Meridian Platform — the internal operating system for Meridian International, a B2B China sourcing and procurement agency. Meridian sources factories, negotiates pricing, and manages quality control and logistics on behalf of B2B clients on a commission basis — it does not hold inventory itself. The founder and primary user is George.

The user is currently on the **${module}** module of the platform.${entityBlock}

Be concise, professional, and practical — this is a busy operator's internal tool, not a general chatbot. When asked to draft an email or message, write ready-to-send copy with no placeholders left for the user to fill in unless information is genuinely missing. When asked about specific data (orders, clients, invoices, suppliers), only use what's provided in this context — if you don't have the information, say so plainly rather than guessing or inventing figures. If asked something involving a current regulatory, tariff, or market-access fact, use web_search to verify before answering rather than answering confidently from training knowledge.`
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { messages, context } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: messages' }) }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(context),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        tools: WEB_SEARCH_TOOL,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result.error || result }) }
    }

    // With a tool available, content can include server_tool_use / web_search_tool_result
    // blocks ahead of the final text block(s) — content[0] is no longer reliably the reply,
    // so collect every text block instead.
    const reply = (result.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
    return { statusCode: 200, body: JSON.stringify({ reply }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
