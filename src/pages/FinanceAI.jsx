import { useState, useEffect, useRef } from 'react'
import { generateContent } from '../services/gemini'
import { parseTransactionPrompt, financeSummaryPrompt } from '../services/prompts'
import { addTransaction, getTransactions, getTransactionStats } from '../services/db'
import { formatRupiah, formatDate, downloadCSV } from '../utils/helpers'

export default function FinanceAI({ showToast, geminiReady }) {
  const [tab, setTab] = useState('ledger')
  const [inputText, setInputText] = useState('')
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [parsedPreview, setParsedPreview] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const txs = await getTransactions({ limit: 50 })
    setTransactions(txs)
    const s = await getTransactionStats()
    setStats(s)
  }

  async function handleParseInput() {
    if (!inputText.trim()) {
      showToast('Peringatan', 'Ketik transaksi terlebih dahulu', 'warning')
      return
    }
    if (!geminiReady) {
      showToast('Error', 'Masukkan API Key di Settings', 'error')
      return
    }

    setLoading(true)
    setParsedPreview(null)

    try {
      const prompt = parseTransactionPrompt(inputText)
      const result = await generateContent(prompt)

      // Parse JSON from AI response
      let parsed
      try {
        // Extract JSON from possible markdown code block
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result)
      } catch {
        showToast('Error', 'AI tidak dapat memahami input. Coba format: "Jual keripik pisang 50 bungkus @5000"', 'error')
        setLoading(false)
        return
      }

      if (parsed.error) {
        showToast('Error', parsed.error, 'error')
        setLoading(false)
        return
      }

      setParsedPreview(parsed)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setLoading(false)
  }

  async function handleConfirmTransaction() {
    if (!parsedPreview) return

    try {
      await addTransaction({
        ...parsedPreview,
        date: new Date().toISOString().split('T')[0]
      })
      showToast('Berhasil!', `Transaksi "${parsedPreview.description}" tercatat`, 'success')
      setInputText('')
      setParsedPreview(null)
      await loadData()
      setTab('ledger') // return to ledger after adding
    } catch (err) {
      showToast('Error', 'Gagal menyimpan transaksi', 'error')
    }
  }

  async function handleManualAdd(type) {
    const desc = prompt(type === 'income' ? 'Deskripsi pemasukan:' : 'Deskripsi pengeluaran:')
    if (!desc) return
    const amountStr = prompt('Jumlah (Rp):')
    if (!amountStr) return
    const amount = parseInt(amountStr.replace(/\D/g, ''))
    if (!amount || amount <= 0) {
      showToast('Error', 'Jumlah tidak valid', 'error')
      return
    }

    await addTransaction({
      type,
      category: type === 'income' ? 'Penjualan' : 'Operasional',
      product: '-',
      quantity: 1,
      unitPrice: amount,
      amount,
      description: desc,
      date: new Date().toISOString().split('T')[0]
    })
    showToast('Berhasil!', 'Transaksi tercatat', 'success')
    await loadData()
  }

  async function handleGenerateSummary() {
    if (!geminiReady || !stats) return
    setSummaryLoading(true)
    try {
      const text = await generateContent(financeSummaryPrompt(stats))
      setAiSummary(text)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setSummaryLoading(false)
  }

  function handleExportCSV() {
    if (transactions.length === 0) {
      showToast('Peringatan', 'Tidak ada data untuk diekspor', 'warning')
      return
    }
    const exportData = transactions.map(t => ({
      Tanggal: t.date,
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: t.category,
      Produk: t.product,
      Jumlah: t.quantity,
      'Harga Satuan': t.unitPrice,
      Total: t.amount,
      Deskripsi: t.description
    }))
    downloadCSV(exportData, `laporan-keuangan-akbar354-${new Date().toISOString().split('T')[0]}.csv`)
    showToast('Berhasil!', 'File CSV berhasil diunduh', 'success')
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📒 <span className="text-gradient">Buku Kas</span></h1>
        <p className="page-description">Kelola pencatatan transaksi masuk dan keluar</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card emerald animate-fade-in-up stagger-1">
            <div className="stat-label"><span>💵</span> Total Pemasukan</div>
            <div className="stat-value" style={{ color: 'var(--color-emerald-light)', fontSize: 'var(--font-size-2xl)' }}>
              {formatRupiah(stats.totalIncome)}
            </div>
          </div>
          <div className="stat-card rose animate-fade-in-up stagger-2" style={{}}>
            <div className="stat-label"><span>💸</span> Total Pengeluaran</div>
            <div className="stat-value" style={{ color: 'var(--color-rose-light)', fontSize: 'var(--font-size-2xl)' }}>
              {formatRupiah(stats.totalExpense)}
            </div>
          </div>
          <div className="stat-card purple animate-fade-in-up stagger-3">
            <div className="stat-label"><span>💎</span> Laba Bersih</div>
            <div className="stat-value" style={{ color: stats.netProfit >= 0 ? 'var(--color-emerald-light)' : 'var(--color-rose-light)', fontSize: 'var(--font-size-2xl)' }}>
              {formatRupiah(stats.netProfit)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'ledger' ? 'active' : ''}`} onClick={() => setTab('ledger')}>📝 Tabel Transaksi ({transactions.length})</button>
        <button className={`tab ${tab === 'input' ? 'active' : ''}`} onClick={() => setTab('input')}>⚡ Smart Input</button>
        <button className={`tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>🧠 Insight Bisnis</button>
      </div>

      {tab === 'input' && (
        <div className="card animate-fade-in-up">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>🗣️ Catat Transaksi dengan Bahasa Natural</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }}>
            Ketik seperti ngobrol biasa, AI akan otomatis mengekstrak data transaksi
          </p>

          {/* Examples */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {[
              'Jual keripik pisang 30 bungkus @5000',
              'Beli minyak goreng 150rb',
              'Laku peyek 20 bungkus',
              'Bayar listrik 200000'
            ].map(ex => (
              <button
                key={ex}
                className="tag"
                onClick={() => setInputText(ex)}
                style={{ cursor: 'pointer', padding: '6px 12px' }}
              >
                💡 {ex}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              ref={inputRef}
              className="input"
              placeholder='Ketik transaksi... contoh: "Jual keripik singkong 50 bungkus @4000"'
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleParseInput()}
              id="finance-input"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleParseInput}
              disabled={loading || !geminiReady}
              id="parse-btn"
            >
              {loading ? <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : '🤖 Proses'}
            </button>
          </div>

          {/* Parsed Preview */}
          {parsedPreview && (
            <div className="ai-insight animate-scale-in" style={{ marginTop: 'var(--space-5)' }}>
              <div className="ai-insight-label">
                <span>🔍</span> AI mendeteksi transaksi:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Tipe</div>
                  <div className={`tag ${parsedPreview.type === 'income' ? 'emerald' : 'gold'}`} style={{ marginTop: '4px' }}>
                    {parsedPreview.type === 'income' ? '💵 Pemasukan' : '💸 Pengeluaran'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Produk</div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>{parsedPreview.product}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Jumlah</div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>{parsedPreview.quantity} pcs</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Total</div>
                  <div style={{ fontWeight: '700', marginTop: '4px', color: 'var(--color-emerald-light)' }}>
                    {formatRupiah(parsedPreview.amount)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-primary" onClick={handleConfirmTransaction} id="confirm-tx-btn">
                  ✅ Simpan Transaksi
                </button>
                <button className="btn btn-secondary" onClick={() => setParsedPreview(null)}>
                  ✕ Batal
                </button>
              </div>
            </div>
          )}

          {/* Manual Add Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--color-border)' }}>
            <button className="btn btn-secondary" onClick={() => handleManualAdd('income')} id="manual-income-btn">
              ➕ Tambah Pemasukan Manual
            </button>
            <button className="btn btn-secondary" onClick={() => handleManualAdd('expense')} id="manual-expense-btn">
              ➖ Tambah Pengeluaran Manual
            </button>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">📒 Buku Kas</h3>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} id="export-csv-btn">
              📥 Export CSV
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📒</div>
              <div className="empty-state-title">Belum ada transaksi</div>
              <div className="empty-state-text">Mulai catat transaksi di tab "Input AI"</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Tipe</th>
                    <th>Deskripsi</th>
                    <th>Produk</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{tx.date}</td>
                      <td>
                        <span className={`tag ${tx.type === 'income' ? 'emerald' : 'gold'}`}>
                          {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td>{tx.description}</td>
                      <td>{tx.product}</td>
                      <td style={{ 
                        textAlign: 'right', fontWeight: '600',
                        color: tx.type === 'income' ? 'var(--color-emerald-light)' : 'var(--color-rose-light)'
                      }}>
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'report' && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">📊 Laporan AI</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleGenerateSummary}
              disabled={summaryLoading || !geminiReady}
              id="generate-summary-btn"
            >
              {summaryLoading ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : '🤖 Analisis AI'}
            </button>
          </div>

          {summaryLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>AI sedang menganalisis data keuangan...</p>
            </div>
          ) : aiSummary ? (
            <div className="ai-insight" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: 'var(--font-size-sm)' }}>
                {aiSummary}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">Klik "Analisis AI" untuk mendapat laporan</div>
              <div className="empty-state-text">AI akan menganalisis data keuangan Anda dan memberikan insight yang actionable</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
