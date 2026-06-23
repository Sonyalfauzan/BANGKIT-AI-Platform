import { useState, useEffect } from 'react'
import { generateContent } from '../services/gemini'
import { exportDescriptionPrompt } from '../services/prompts'
import { getProducts, saveExport, getExportHistory } from '../services/db'
import { copyToClipboard, EXPORT_LANGUAGES } from '../utils/helpers'

export default function ExportAI({ showToast, geminiReady }) {
  const [tab, setTab] = useState('create')
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedLangs, setSelectedLangs] = useState(['english', 'mandarin'])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const prods = await getProducts()
    setProducts(prods)
    if (prods.length > 0) setSelectedProduct(prods[0])
    const hist = await getExportHistory(10)
    setHistory(hist)
  }

  function toggleLanguage(langId) {
    setSelectedLangs(prev => 
      prev.includes(langId) 
        ? prev.filter(l => l !== langId)
        : [...prev, langId]
    )
  }

  async function handleGenerate() {
    if (!geminiReady) {
      showToast('Error', 'Masukkan API Key di Settings', 'error')
      return
    }
    if (!selectedProduct) {
      showToast('Peringatan', 'Pilih produk terlebih dahulu', 'warning')
      return
    }
    if (selectedLangs.length === 0) {
      showToast('Peringatan', 'Pilih minimal satu bahasa', 'warning')
      return
    }

    setLoading(true)
    setResult('')

    try {
      const langLabels = selectedLangs.map(id => EXPORT_LANGUAGES.find(l => l.id === id)?.label || id)
      const prompt = exportDescriptionPrompt(selectedProduct.name, selectedProduct.description, langLabels)
      const text = await generateContent(prompt)
      setResult(text)
      
      await saveExport({
        productName: selectedProduct.name,
        languages: selectedLangs.join(', '),
        content: text
      })
      const hist = await getExportHistory(10)
      setHistory(hist)
      showToast('Berhasil!', 'Deskripsi multi-bahasa berhasil dibuat', 'success')
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🌍 <span className="text-gradient">Go Internasional</span></h1>
        <p className="page-description">Buat deskripsi produk multi-bahasa untuk pasar global</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>📝 Buat Deskripsi</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 Riwayat Ekspor ({history.length})</button>
      </div>

      {tab === 'create' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Input */}
          <div className="card animate-fade-in-up">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Pilih Produk & Bahasa</h3>

            {/* Product Selection */}
            <div className="input-group">
              <label className="input-label">🏷️ Produk</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      background: selectedProduct?.id === p.id ? 'var(--color-emerald-glow)' : 'var(--color-bg-input)',
                      border: `1px solid ${selectedProduct?.id === p.id ? 'var(--color-emerald)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--font-size-sm)',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'left'
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                      Rp{p.price.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Description Preview */}
            {selectedProduct && (
              <div className="input-group">
                <label className="input-label">📝 Deskripsi Asli</label>
                <div className="output-box" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-3) var(--space-4)' }}>
                  {selectedProduct.description}
                </div>
              </div>
            )}

            {/* Language Selection */}
            <div className="input-group">
              <label className="input-label">🌐 Bahasa Target</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {EXPORT_LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    className={`tag ${selectedLangs.includes(lang.id) ? 'emerald' : ''}`}
                    onClick={() => toggleLanguage(lang.id)}
                    style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 'var(--font-size-sm)' }}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                {selectedLangs.length} bahasa dipilih
              </div>
            </div>

            {/* Generate Button */}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={loading || !geminiReady}
              style={{ width: '100%' }}
              id="export-generate-btn"
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
              <h3 className="card-title">📄 Hasil Terjemahan</h3>
              {result && (
                <button className="btn btn-primary btn-sm" onClick={async () => {
                  await copyToClipboard(result)
                  showToast('Disalin!', '', 'success')
                }} id="export-copy-btn">
                  📋 Salin Semua
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  🌍 AI sedang membuat deskripsi multi-bahasa...
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
                <div className="empty-state-icon">🌍</div>
                <div className="empty-state-title">Siap untuk Ekspor</div>
                <div className="empty-state-text">
                  Pilih produk dan bahasa target, lalu generate deskripsi yang siap dipasang di marketplace internasional
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="card animate-fade-in">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-5)' }}>📋 Riwayat Ekspor</h3>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Belum ada riwayat</div>
              <div className="empty-state-text">Deskripsi yang Anda buat akan tersimpan di sini</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {history.map(item => (
                <div key={item.id} className="output-box animate-fade-in-up">
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <span className="tag emerald">{item.productName}</span>
                    <span className="tag blue">{item.languages}</span>
                    <span className="tag" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                      {new Date(item.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'hidden' }}>
                    {item.content?.substring(0, 400)}{item.content?.length > 400 ? '...' : ''}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={async () => {
                    await copyToClipboard(item.content)
                    showToast('Disalin!', '', 'success')
                  }} style={{ marginTop: 'var(--space-2)' }}>
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
