import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { post } from '../lib/api'

const ADMIN_Q = ["What's pending today?", 'Which reels are waiting for approval?', 'Who has overdue work?', 'Give me this week\'s summary']
const EMP_Q = ['What are my tasks today?', 'Which of my reels are in editing?', 'What is due this week?']

// Light formatting: **bold** and bullet lines
function Text({ text }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        const parts = line.replace(/^\s*[-*•]\s+/, '').split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <strong key={j}>{p}</strong> : p))
        if (!line.trim()) return <div key={i} className="h-1" />
        return /^\s*[-*•]\s+/.test(line)
          ? <div key={i} className="flex gap-2"><span className="text-slate-400">•</span><span>{parts}</span></div>
          : <p key={i}>{parts}</p>
      })}
    </div>
  )
}

export default function AskAI({ onClose }) {
  const { isAdmin } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])

  const ask = async (q) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next); setInput(''); setBusy(true)
    try {
      const { answer } = await post('/ai/ask', { messages: next.filter((m) => !m.error) })
      setMessages([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: e.message, error: true }])
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-brand" /> AI Assistant</div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && <button onClick={() => setMessages([])} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="New chat"><RotateCcw size={16} /></button>}
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
          {messages.length === 0 && (
            <>
              <p className="text-slate-500">Ask about clients, reels, tasks or the team. Answers come from live ERP data.</p>
              {(isAdmin ? ADMIN_Q : EMP_Q).map((q) => (
                <button key={q} onClick={() => ask(q)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-slate-700 hover:bg-slate-50">{q}</button>
              ))}
            </>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-slate-900 text-slate-50' : m.error ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'}`}>
                {m.role === 'user' ? m.content : <Text text={m.content} />}
              </div>
            </div>
          ))}
          {busy && <div className="w-fit rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-500">Checking the data…</div>}
          <div ref={end} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask() }} className="flex gap-2 border-t border-slate-200 p-4">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything… (English / Tamil / Tanglish)"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
          <button disabled={busy || !input.trim()} className="rounded-lg bg-brand px-3 text-white hover:bg-brand/90 disabled:opacity-50" aria-label="Send"><Send size={16} /></button>
        </form>
      </div>
    </div>
  )
}
