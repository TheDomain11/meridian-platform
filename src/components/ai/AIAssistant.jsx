import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { useAIContext } from './useAIContext.js'
import { getSuggestedPrompts } from './suggestedPrompts.js'
import CostBadge from './CostBadge.jsx'

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const threadRef = useRef(null)

  const aiContext = useAIContext()
  const suggestedPrompts = getSuggestedPrompts(aiContext)

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, sending])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setSending(true)

    try {
      const res = await fetch('/.netlify/functions/claude-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context: aiContext }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'The AI assistant could not respond.')
      }

      const { reply } = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-6 z-40 w-12 h-12 bg-navy text-cream flex items-center justify-center transition-opacity duration-200 ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open Meridian AI"
      >
        <Sparkles size={20} strokeWidth={1.75} />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-navy/20 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-cream z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-navy/10 flex-shrink-0">
          <h2 className="font-heading text-lg text-navy">Meridian AI</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-slate/40 hover:text-navy transition-colors duration-150"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-1">Suggested</p>
              {suggestedPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left px-3 py-2.5 bg-white border border-navy/10 text-sm font-body text-slate hover:border-navy/30 hover:text-navy transition-colors duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-3.5 py-2.5 text-sm font-body leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'self-end bg-navy text-cream'
                  : 'self-start bg-white text-slate border border-navy/8'
              }`}
            >
              {m.content}
            </div>
          ))}

          {sending && (
            <div className="self-start bg-white text-slate/50 border border-navy/8 px-3.5 py-2.5 text-sm font-body">
              Thinking…
            </div>
          )}

          {error && (
            <p className="text-sm font-body text-red-700">{error}</p>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 px-4 py-4 border-t border-navy/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Meridian AI…"
              disabled={sending}
              className="flex-1 px-3 py-2.5 bg-white border border-navy/10 text-sm font-body text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-10 h-10 flex-shrink-0 bg-navy text-cream flex items-center justify-center disabled:opacity-40 transition-opacity duration-150"
              aria-label="Send"
            >
              <Send size={15} strokeWidth={1.75} />
            </button>
          </div>
          <CostBadge tier="sonnet-search" />
        </form>
      </div>
    </>
  )
}
