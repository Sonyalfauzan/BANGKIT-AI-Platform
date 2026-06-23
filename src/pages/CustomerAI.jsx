import { useState, useRef, useEffect } from 'react'
import { generateContent, createChatSession } from '../services/gemini'
import { customerChatSystemPrompt, faqGeneratorPrompt, whatsappTemplatePrompt } from '../services/prompts'
import { copyToClipboard } from '../utils/helpers'

export default function CustomerAI({ showToast, geminiReady }) {
  const [tab, setTab] = useState('whatsapp')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Halo! 👋 Selamat datang di AKBAR 354. Saya asisten virtual yang siap membantu Anda. Ada yang bisa saya bantu hari ini?\n\n🛒 Lihat produk kami\n💰 Cek harga\n📦 Info pengiriman\n📞 Hubungi kami' }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatSession, setChatSession] = useState(null)
  const [faqResult, setFaqResult] = useState('')
  const [faqLoading, setFaqLoading] = useState(false)
  const [waScenario, setWaScenario] = useState('')
  const [waResult, setWaResult] = useState('')
  const [waLoading, setWaLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (geminiReady && !chatSession) {
      try {
        const session = createChatSession(customerChatSystemPrompt())
        setChatSession(session)
      } catch (e) {
        // Will retry when user sends first message
      }
    }
  }, [geminiReady])

  async function handleSendMessage() {
    if (!inputText.trim() || loading) return
    if (!geminiReady) {
      showToast('Error', 'Masukkan API Key di Settings', 'error')
      return
    }

    const userMsg = inputText.trim()
    setInputText('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      let session = chatSession
      if (!session) {
        session = createChatSession(customerChatSystemPrompt())
        setChatSession(session)
      }
      const reply = await session.sendMessage(userMsg)
      setMessages(prev => [...prev, { role: 'ai', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Maaf, terjadi kendala. Silakan coba lagi.' }])
      showToast('Error', err.message, 'error')
    }
    setLoading(false)
  }

  async function handleGenerateFAQ() {
    if (!geminiReady) return
    setFaqLoading(true)
    try {
      const text = await generateContent(faqGeneratorPrompt())
      setFaqResult(text)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setFaqLoading(false)
  }

  async function handleGenerateWATemplate() {
    if (!geminiReady || !waScenario.trim()) {
      showToast('Peringatan', 'Masukkan skenario terlebih dahulu', 'warning')
      return
    }
    setWaLoading(true)
    try {
      const text = await generateContent(whatsappTemplatePrompt(waScenario))
      setWaResult(text)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setWaLoading(false)
  }

  function resetChat() {
    setMessages([
      { role: 'ai', text: 'Halo! 👋 Selamat datang di AKBAR 354. Saya asisten virtual yang siap membantu. Ada yang bisa saya bantu?' }
    ])
    if (geminiReady) {
      const session = createChatSession(customerChatSystemPrompt())
      setChatSession(session)
    }
  }

  const sampleQuestions = [
    'Harga keripik pisang berapa?',
    'Bisa kirim ke Jakarta?',
    'Pesan keripik tempe 10 bungkus',
    'Ada promo hari ini?',
    'Apa aja produk yang tersedia?'
  ]

  const waScenarios = [
    'Konfirmasi pesanan',
    'Balas pertanyaan harga',
    'Info keterlambatan pengiriman',
    'Ucapan terima kasih ke pelanggan',
    'Broadcast promo produk baru'
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">💬 <span className="text-gradient">Layanan Pelanggan</span></h1>
        <p className="page-description">Buat template WhatsApp & FAQ otomatis untuk efisiensi bisnis</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'whatsapp' ? 'active' : ''}`} onClick={() => setTab('whatsapp')}>💬 Template WA</button>
        <button className={`tab ${tab === 'faq' ? 'active' : ''}`} onClick={() => setTab('faq')}>❓ Generator FAQ</button>
        <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>🤖 Uji Coba Asisten</button>
      </div>

      {tab === 'chat' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-emerald)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
              }}>
                🤖
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Asisten AKBAR 354</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-emerald-light)' }}>● Online</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={resetChat}>🔄 Reset</button>
          </div>

          {/* Chat Messages */}
          <div className="chat-container" style={{ 
            maxHeight: '450px', minHeight: '300px',
            background: 'var(--color-bg-input)', borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className="chat-bubble-label">
                  {msg.role === 'user' ? '👤 Pelanggan' : '🤖 AKBAR 354'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble ai">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Questions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            {sampleQuestions.map(q => (
              <button key={q} className="tag" onClick={() => setInputText(q)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              className="input"
              placeholder="Ketik pesan pelanggan..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
              id="chat-input"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              id="send-btn"
            >
              {loading ? <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : '📤'}
            </button>
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">❓ FAQ Generator</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleGenerateFAQ}
              disabled={faqLoading || !geminiReady}
              id="generate-faq-btn"
            >
              {faqLoading ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : '🤖 Generate FAQ'}
            </button>
          </div>

          {faqLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>AI sedang membuat FAQ...</p>
            </div>
          ) : faqResult ? (
            <div>
              <div className="output-box" style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-3)' }}>
                {faqResult}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                await copyToClipboard(faqResult)
                showToast('Disalin!', '', 'success')
              }}>
                📋 Salin Semua
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">❓</div>
              <div className="empty-state-title">Generate FAQ Otomatis</div>
              <div className="empty-state-text">AI akan membuat 10 FAQ yang paling relevan untuk bisnis AKBAR 354</div>
            </div>
          )}
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="card animate-fade-in">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>💬 Template WhatsApp</h3>
          
          <div className="input-group">
            <label className="input-label">Pilih Skenario</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              {waScenarios.map(s => (
                <button key={s} className={`tag ${waScenario === s ? 'emerald' : ''}`}
                  onClick={() => setWaScenario(s)} style={{ cursor: 'pointer', padding: '6px 12px' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <input
                className="input"
                placeholder="Atau ketik skenario sendiri..."
                value={waScenario}
                onChange={e => setWaScenario(e.target.value)}
                id="wa-scenario-input"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleGenerateWATemplate}
                disabled={waLoading || !geminiReady}
                id="generate-wa-btn"
              >
                {waLoading ? <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : '🤖 Generate'}
              </button>
            </div>
          </div>

          {waLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>Membuat template...</p>
            </div>
          ) : waResult ? (
            <div>
              <div className="output-box" style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-3)' }}>
                {waResult}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                await copyToClipboard(waResult)
                showToast('Disalin!', '', 'success')
              }}>
                📋 Salin Template
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-title">Buat Template WhatsApp</div>
              <div className="empty-state-text">Pilih skenario untuk membuat template pesan WhatsApp yang siap dipakai</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
