import { useState, useRef } from 'react'
import { generateContent, analyzeImage } from '../services/gemini'
import { captionPrompt, captionFromImagePrompt } from '../services/prompts'
import { saveContent, getContentHistory } from '../services/db'
import { copyToClipboard, PLATFORMS, WRITING_STYLES } from '../utils/helpers'
import { useEffect } from 'react'

export default function MarketingAI({ showToast, geminiReady }) {
  const [tab, setTab] = useState('create')
  const [product, setProduct] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [style, setStyle] = useState('casual')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [imageMime, setImageMime] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    const data = await getContentHistory(20)
    setHistory(data)
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Error', 'Pilih file gambar (JPG, PNG)', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Error', 'Ukuran file maksimal 10MB', 'error')
      return
    }

    setImagePreview(URL.createObjectURL(file))
    setImageMime(file.type)

    const reader = new FileReader()
    reader.onload = () => {
      setImageData(reader.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImagePreview(null)
    setImageData(null)
    setImageMime('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGenerate() {
    if (!geminiReady) {
      showToast('Error', 'Masukkan API Key di Settings terlebih dahulu', 'error')
      return
    }

    if (!imageData && !product) {
      showToast('Peringatan', 'Pilih produk atau upload foto terlebih dahulu', 'warning')
      return
    }

    setLoading(true)
    setResult('')

    try {
      let text
      if (imageData) {
        const prompt = captionFromImagePrompt(platform, style)
        text = await analyzeImage(imageData, imageMime, prompt)
      } else {
        const prompt = captionPrompt(product, platform, style, additionalInfo)
        text = await generateContent(prompt)
      }

      setResult(text)
      await saveContent({
        type: 'caption',
        platform,
        style,
        product: product || 'Dari Foto',
        content: text
      })
      await loadHistory()
      showToast('Berhasil!', 'Konten berhasil dibuat', 'success')
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setLoading(false)
  }

  async function handleCopy() {
    await copyToClipboard(result)
    showToast('Disalin!', 'Konten berhasil disalin ke clipboard', 'success')
  }

  const products = ['Keripik Pisang', 'Keripik Singkong', 'Keripik Sukun', 'Keripik Tempe', 'Stik Ladran', 'Kembang Goyang', 'Peyek', 'Rengginan']

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📱 <span className="text-gradient">Promosi & Konten</span></h1>
        <p className="page-description">Manajer konten media sosial dengan asisten copywriting cerdas</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>📝 Buat Konten</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 Draft & Riwayat ({history.length})</button>
      </div>

      {tab === 'create' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Input Form */}
          <div className="card animate-fade-in-up">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Input Konten</h3>

            {/* Image Upload */}
            <div className="input-group">
              <label className="input-label">📸 Upload Foto Produk (Opsional)</label>
              <div className={`upload-zone ${imagePreview ? 'has-image' : ''}`} onClick={() => fileInputRef.current?.click()}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); clearImage() }}
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      ✕ Hapus
                    </button>
                  </>
                ) : (
                  <>
                    <div className="upload-zone-icon">📷</div>
                    <div className="upload-zone-text">Klik untuk upload foto produk</div>
                    <div className="upload-zone-text" style={{ fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                      JPG, PNG (maks 10MB)
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Product Select */}
            {!imageData && (
              <div className="input-group">
                <label className="input-label">🏷️ Pilih Produk</label>
                <select className="select" value={product} onChange={e => setProduct(e.target.value)} id="product-select">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Platform Select */}
            <div className="input-group">
              <label className="input-label">📱 Platform</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    className={`tag ${platform === p.id ? 'emerald' : ''}`}
                    onClick={() => setPlatform(p.id)}
                    style={{ cursor: 'pointer', padding: '6px 12px' }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Select */}
            <div className="input-group">
              <label className="input-label">✍️ Gaya Penulisan</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {WRITING_STYLES.map(s => (
                  <button
                    key={s.id}
                    className={`tag ${style === s.id ? 'gold' : ''}`}
                    onClick={() => setStyle(s.id)}
                    style={{ cursor: 'pointer', padding: '6px 12px' }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="input-group">
              <label className="input-label">📝 Info Tambahan (Opsional)</label>
              <textarea
                className="input"
                placeholder="Contoh: promo diskon 20%, gratis ongkir, stok terbatas..."
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                rows={3}
                id="additional-info"
              />
            </div>

            {/* Generate Button */}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={loading || !geminiReady}
              style={{ width: '100%', background: 'var(--gradient-emerald)', border: 'none' }}
              id="generate-btn"
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Sedang memproses...
                </>
              ) : (
                <>🪄 Auto-Generate dengan AI</>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="card animate-fade-in-up stagger-2">
            <div className="card-header">
              <h3 className="card-title">📄 Hasil</h3>
              {result && (
                <button className="btn btn-primary btn-sm" onClick={handleCopy} id="copy-btn">
                  📋 Salin
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  🤖 AI sedang membuat konten...
                </p>
                <div className="typing-indicator" style={{ justifyContent: 'center', marginTop: 'var(--space-3)' }}>
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            ) : result ? (
              <div className="output-box" style={{ whiteSpace: 'pre-wrap' }}>
                {result}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🎨</div>
                <div className="empty-state-title">Belum ada konten</div>
                <div className="empty-state-text">
                  Upload foto atau pilih produk, lalu klik Generate untuk membuat konten marketing otomatis
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="card animate-fade-in">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-5)' }}>📋 Riwayat Konten</h3>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">Belum ada riwayat</div>
              <div className="empty-state-text">Konten yang Anda buat akan tersimpan di sini</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {history.map(item => (
                <div key={item.id} className="output-box animate-fade-in-up" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <span className="tag emerald">{item.platform}</span>
                    <span className="tag">{item.product}</span>
                    <span className="tag" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                      {new Date(item.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {item.content?.substring(0, 300)}{item.content?.length > 300 ? '...' : ''}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await copyToClipboard(item.content)
                      showToast('Disalin!', '', 'success')
                    }}
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    📋 Salin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
