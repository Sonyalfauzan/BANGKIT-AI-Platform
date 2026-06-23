import { useState, useEffect } from 'react'
import { getTransactionStats } from '../services/db'
import { generateContent, isGeminiReady } from '../services/gemini'
import { dailyInsightPrompt } from '../services/prompts'
import { formatRupiah, formatShortNumber, getGreeting } from '../utils/helpers'

export default function Dashboard({ showToast, geminiReady, navigate }) {
  const [stats, setStats] = useState(null)
  const [aiInsight, setAiInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const data = await getTransactionStats()
      setStats(data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  async function generateInsight() {
    if (!geminiReady || !stats) return
    setLoadingInsight(true)
    try {
      const text = await generateContent(dailyInsightPrompt(stats))
      setAiInsight(text)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setLoadingInsight(false)
  }

  useEffect(() => {
    if (geminiReady && stats) {
      generateInsight()
    }
  }, [geminiReady, stats])

  const features = [
    { id: 'marketing', icon: '📱', color: 'var(--color-emerald-glow)', title: 'Promosi & Konten', desc: 'Buat caption & copywriting otomatis untuk sosmed', gradient: 'var(--gradient-emerald)' },
    { id: 'finance', icon: '📒', color: 'var(--color-gold-glow)', title: 'Buku Kas', desc: 'Catat transaksi dan kelola keuangan bisnis', gradient: 'var(--gradient-gold)' },
    { id: 'customer', icon: '💬', color: 'var(--color-blue-glow)', title: 'Layanan Pelanggan', desc: 'Buat FAQ & template balasan cepat WhatsApp', gradient: 'var(--gradient-blue)' },
    { id: 'analytics', icon: '📊', color: 'var(--color-purple-glow)', title: 'Laporan Penjualan', desc: 'Analisis penjualan & rekomendasi bisnis', gradient: 'var(--gradient-purple)' },
    { id: 'export', icon: '🌍', color: 'var(--color-rose-glow)', title: 'Go Internasional', desc: 'Buat deskripsi produk dalam berbagai bahasa', gradient: 'var(--gradient-rose)' },
    { id: 'settings', icon: '⚙️', color: 'var(--color-bg-card)', title: 'Pengaturan', desc: 'Profil bisnis, produk, dan preferensi sistem', gradient: 'linear-gradient(135deg, #475569, #334155)' }
  ]

  if (loading) {
    return (
      <div style={{ opacity: 0, animation: 'fadeIn 0.3s ease forwards' }}>
        <div className="page-header">
          <div className="skeleton" style={{ width: '300px', height: '36px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '200px', height: '20px' }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          {getGreeting()}, <span className="text-gradient">AKBAR 354</span> 👋
        </h1>
        <p className="page-description">
          Kelola bisnis makanan ringan Anda dengan kekuatan AI
        </p>
      </div>

      {/* AI Insight */}
      {(aiInsight || loadingInsight) && (
        <div className="ai-insight animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="ai-insight-label">
            <span>✨</span> AI Insight Hari Ini
          </div>
          {loadingInsight ? (
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          ) : (
            <div className="ai-insight-text">{aiInsight}</div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card emerald animate-fade-in-up stagger-1">
            <div className="stat-label">
              <span>💵</span> Pemasukan Hari Ini
            </div>
            <div className="stat-value" style={{ color: 'var(--color-emerald-light)' }}>
              {formatRupiah(stats.todayIncome)}
            </div>
            <div className="stat-change positive">
              📦 {stats.todayTransactions} transaksi
            </div>
          </div>

          <div className="stat-card gold animate-fade-in-up stagger-2">
            <div className="stat-label">
              <span>📊</span> Total Pemasukan
            </div>
            <div className="stat-value" style={{ color: 'var(--color-gold-light)' }}>
              {formatShortNumber(stats.totalIncome)}
            </div>
            <div className="stat-change positive">
              {stats.totalTransactions} total transaksi
            </div>
          </div>

          <div className="stat-card blue animate-fade-in-up stagger-3">
            <div className="stat-label">
              <span>💸</span> Total Pengeluaran
            </div>
            <div className="stat-value" style={{ color: 'var(--color-blue-light)' }}>
              {formatShortNumber(stats.totalExpense)}
            </div>
          </div>

          <div className="stat-card purple animate-fade-in-up stagger-4">
            <div className="stat-label">
              <span>💎</span> Laba Bersih
            </div>
            <div className="stat-value" style={{ color: stats.netProfit >= 0 ? 'var(--color-emerald-light)' : 'var(--color-rose-light)' }}>
              {formatShortNumber(stats.netProfit)}
            </div>
          </div>
        </div>
      )}

      {/* Top Products */}
      {stats && stats.productSales && Object.keys(stats.productSales).length > 0 && (
        <div className="card animate-fade-in-up stagger-3" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="card-header">
            <h3 className="card-title">🏆 Produk Terlaris</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('analytics')}>
              Lihat Detail →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Object.entries(stats.productSales)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([product, qty], idx) => {
                const maxQty = Math.max(...Object.values(stats.productSales))
                const pct = (qty / maxQty) * 100
                const colors = ['var(--color-emerald)', 'var(--color-gold)', 'var(--color-blue)', 'var(--color-purple)', 'var(--color-cyan)']
                return (
                  <div key={product} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ 
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: colors[idx], display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white',
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ width: '140px', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}>{product}</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-full)',
                        background: colors[idx], transition: 'width 1s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', width: '60px', textAlign: 'right' }}>
                      {qty} pcs
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
          ⚡ Menu Utama
        </h3>
        <div className="grid-3">
          {features.map((feat, idx) => (
            <button
              key={feat.id}
              className={`feature-card animate-fade-in-up stagger-${idx + 1}`}
              onClick={() => navigate(feat.id)}
              id={`feature-${feat.id}`}
              style={{ textAlign: 'left' }}
            >
              <div className="feature-card-icon" style={{ background: feat.color }}>
                {feat.icon}
              </div>
              <div className="feature-card-title">{feat.title}</div>
              <div className="feature-card-desc">{feat.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key Warning */}
      {!geminiReady && (
        <div className="ai-insight animate-fade-in-up" style={{ 
          borderColor: 'rgba(245, 158, 11, 0.3)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(244, 63, 94, 0.05))',
          marginTop: 'var(--space-6)'
        }}>
          <div className="ai-insight-label" style={{ color: 'var(--color-gold-light)' }}>
            <span>⚠️</span> Setup Diperlukan
          </div>
          <div className="ai-insight-text">
            Untuk mengaktifkan fitur AI, masukkan Google Gemini API Key di halaman{' '}
            <button 
              onClick={() => navigate('settings')} 
              style={{ color: 'var(--color-gold-light)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Pengaturan
            </button>. 
            API key bisa didapat gratis di Google AI Studio.
          </div>
        </div>
      )}
    </div>
  )
}
