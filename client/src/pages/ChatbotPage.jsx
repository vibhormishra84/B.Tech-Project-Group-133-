import { useState } from 'react'
import { apiFetch } from '../api/client'

function MessageContent({ text }) {
  // Render simple markdown-ish output: paragraphs and bullet points
  const lines = String(text || '').split('\n')
  return (
    <div>
      {lines.map((l, idx) => {
        if (l.trim().startsWith('- ')) {
          return <div key={idx} className="li">{l.replace(/^\s*-\s*/, '')}</div>
        }
        return <p key={idx} className="p">{l}</p>
      })}
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([{ role: 'system', content: 'Ask about medicines or symptoms. No diagnosis will be given.' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('token') || ''

  async function send() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await apiFetch('/api/chatbot/ask', { method: 'POST', body: { message: userMsg.content }, token })
      setMessages(m => [...m, { role: 'assistant', content: res.answer }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat">
      <div className="page-header">
        <h2>Chatbot</h2>
        <p className="muted">Ask about medicines, usage and side effects</p>
      </div>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`msg-bubble ${m.role}`}>
            <div className="msg-content"><MessageContent text={m.content} /></div>
          </div>
        ))}
        {loading && (
          <div className="msg-bubble assistant"><div className="msg-content typing"><span/><span/><span/></div></div>
        )}
      </div>
      <div className="chat-input input-group">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question..." onKeyDown={e => e.key==='Enter' && send()} />
        <button className="btn" onClick={send} disabled={loading}>{loading ? 'Thinking…' : 'Send'}</button>
      </div>
    </div>
  )
}


