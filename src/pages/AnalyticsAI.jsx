import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { getTransactionStats, getTransactions } from '../services/db'
import { generateContent } from '../services/gemini'
import { salesAnalysisPrompt } from '../services/prompts'
import { formatRupiah, formatShortNumber } from '../utils/helpers'

Chart.register(...registerables)

export default function AnalyticsAI({ showToast, geminiReady }) {
  const [stats, setStats] = useState(null)
  const [allTx, setAllTx] = useState([])
  const [aiNarrative, setAiNarrative] = useState('')
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const lineChartRef = useRef(null)
  const donutChartRef = useRef(null)
  const lineChartInstance = useRef(null)
  const donutChartInstance = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (stats && !loading) {
      renderLineChart()
      renderDonutChart()
    }
    return () => {
      lineChartInstance.current?.destroy()
      donutChartInstance.current?.destroy()
    }
  }, [stats, loading])

  async function loadData() {
    const s = await getTransactionStats()
    setStats(s)
    const tx = await getTransactions({})
    setAllTx(tx)
    setLoading(false)
  }

  function renderLineChart() {
    if (!lineChartRef.current || !stats?.dailyTotals) return
    lineChartInstance.current?.destroy()

    const ctx = lineChartRef.current.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')

    lineChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: stats.dailyTotals.map(d => d.label),
        datasets: [{
          label: 'Pemasukan',
          data: stats.dailyTotals.map(d => d.income),
          borderColor: '#10B981',
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#162040',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(148, 163, 184, 0.12)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Pemasukan: ${formatRupiah(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.06)' },
            ticks: { color: '#64748B', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.06)' },
            ticks: {
              color: '#64748B',
              font: { family: 'Inter', size: 11 },
              callback: (val) => formatShortNumber(val)
            }
          }
        }
      }
    })
  }

  function renderDonutChart() {
    if (!donutChartRef.current || !stats?.productSales) return
    donutChartInstance.current?.destroy()

    const entries = Object.entries(stats.productSales).sort((a, b) => b[1] - a[1])
    const colors = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16']

    donutChartInstance.current = new Chart(donutChartRef.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([name]) => name),
        datasets: [{
          data: entries.map(([, qty]) => qty),
          backgroundColor: colors.slice(0, entries.length),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94A3B8',
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#162040',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(148, 163, 184, 0.12)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    })
  }

  async function handleGenerateNarrative() {
    if (!geminiReady || !stats) return
    setNarrativeLoading(true)
    try {
      const salesData = {
        ...stats,
        recentTransactions: allTx.slice(0, 30).map(t => ({
          date: t.date,
          type: t.type,
          product: t.product,
          quantity: t.quantity,
          amount: t.amount
        }))
      }
      const text = await generateContent(salesAnalysisPrompt(salesData))
      setAiNarrative(text)
    } catch (err) {
      showToast('Error', err.message, 'error')
    }
    setNarrativeLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ width: '250px', height: '36px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '300px', height: '20px' }} />
        </div>
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)', marginBottom: '20px' }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📊 <span className="text-gradient">Laporan Penjualan</span></h1>
        <p className="page-description">Visualisasi penjualan & metrik performa bisnis</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card emerald animate-fade-in-up stagger-1">
            <div className="stat-label"><span>📦</span> Total Transaksi</div>
            <div className="stat-value" style={{ fontSize: 'var(--font-size-2xl)' }}>{stats.totalTransactions}</div>
          </div>
          <div className="stat-card gold animate-fade-in-up stagger-2">
            <div className="stat-label"><span>💰</span> Revenue</div>
            <div className="stat-value" style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-gold-light)' }}>
              {formatShortNumber(stats.totalIncome)}
            </div>
          </div>
          <div className="stat-card blue animate-fade-in-up stagger-3">
            <div className="stat-label"><span>📊</span> Rata-rata/Hari</div>
            <div className="stat-value" style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-blue-light)' }}>
              {formatShortNumber(Math.round(stats.totalIncome / 30))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)', alignItems: 'start' }}>
        {/* Line Chart */}
        <div className="card animate-fade-in-up stagger-2">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📊 Tren Pemasukan 7 Hari</h3>
          <div style={{ height: '280px', position: 'relative' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card animate-fade-in-up stagger-3">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🍩 Distribusi Produk</h3>
          <div style={{ height: '280px', position: 'relative' }}>
            <canvas ref={donutChartRef} />
          </div>
        </div>
      </div>

      {/* AI Narrative */}
      <div className="card animate-fade-in-up stagger-4">
        <div className="card-header">
          <h3 className="card-title">🧠 Insight Bisnis Otomatis</h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerateNarrative}
            disabled={narrativeLoading || !geminiReady}
            id="generate-narrative-btn"
          >
            {narrativeLoading ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : '✨ Dapatkan Insight'}
          </button>
        </div>

        {narrativeLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>AI sedang menganalisis data penjualan...</p>
          </div>
        ) : aiNarrative ? (
          <div className="ai-insight" style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: 'var(--font-size-sm)' }}>
              {aiNarrative}
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <div className="empty-state-icon">🧠</div>
            <div className="empty-state-title">Dapatkan Insight AI</div>
            <div className="empty-state-text">
              Klik "Analisis AI" untuk mendapat narasi insight, tren, dan rekomendasi stok dari data penjualan Anda
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
