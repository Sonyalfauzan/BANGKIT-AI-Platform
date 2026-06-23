import { useState, useEffect, useCallback } from 'react'
import { initGemini, isGeminiReady } from './services/gemini'
import { initializeProducts, initializeSampleData } from './services/db'
import { NAV_ITEMS, APP_NAME } from './utils/helpers'
import Dashboard from './pages/Dashboard'
import MarketingAI from './pages/MarketingAI'
import FinanceAI from './pages/FinanceAI'
import CustomerAI from './pages/CustomerAI'
import AnalyticsAI from './pages/AnalyticsAI'
import ExportAI from './pages/ExportAI'
import Settings from './pages/Settings'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [geminiReady, setGeminiReady] = useState(false)
  const [toasts, setToasts] = useState([])

  // Initialize app
  useEffect(() => {
    const init = async () => {
      await initializeProducts()
      await initializeSampleData()
      
      // Try to restore API key
      const savedKey = localStorage.getItem('bangkit_api_key')
      if (savedKey) {
        const success = initGemini(savedKey)
        setGeminiReady(success)
      }
    }
    init()
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Toast notification system
  const showToast = useCallback((title, message, type = 'info') => {
    const id = Date.now()
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }
    setToasts(prev => [...prev, { id, title, message, icon: icons[type] || 'ℹ️' }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  // Handle API key save
  const handleSaveApiKey = useCallback((key) => {
    localStorage.setItem('bangkit_api_key', key)
    const success = initGemini(key)
    setGeminiReady(success)
    if (success) {
      showToast('API Key Tersimpan', 'Gemini AI siap digunakan!', 'success')
    } else {
      showToast('Gagal', 'API Key tidak valid.', 'error')
    }
    return success
  }, [showToast])

  // Navigate
  const navigate = useCallback((page) => {
    setCurrentPage(page)
    setSidebarOpen(false)
  }, [])

  // Render current page
  const renderPage = () => {
    const pageProps = { showToast, geminiReady, navigate }
    switch (currentPage) {
      case 'dashboard': return <Dashboard {...pageProps} />
      case 'marketing': return <MarketingAI {...pageProps} />
      case 'finance': return <FinanceAI {...pageProps} />
      case 'customer': return <CustomerAI {...pageProps} />
      case 'analytics': return <AnalyticsAI {...pageProps} />
      case 'export': return <ExportAI {...pageProps} />
      case 'settings': return <Settings {...pageProps} onSaveApiKey={handleSaveApiKey} />
      default: return <Dashboard {...pageProps} />
    }
  }

  const pageTitle = currentPage === 'settings' 
    ? 'Pengaturan' 
    : NAV_ITEMS.find(n => n.id === currentPage)?.label || 'Dashboard'

  return (
    <div className="app-layout">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">B</div>
          <div className="sidebar-logo-text">
            <h1>{APP_NAME}</h1>
            <span>Platform UMKM Cerdas</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Utama</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              id={`nav-${item.id}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </button>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '16px' }}>Lainnya</div>
          <button
            className={`sidebar-item ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
            id="nav-settings"
          >
            <span className="sidebar-item-icon">⚙️</span>
            <span>Pengaturan</span>
          </button>
        </nav>

        {/* Sidebar footer */}
        <div style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span>🏭</span>
            <strong style={{ color: 'var(--color-text-secondary)' }}>AKBAR 354</strong>
          </div>
          <div>Tarakan, Kalimantan Utara</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="mobile-menu-toggle"
            >
              ☰
            </button>
            <div>
              <div className="header-title">{pageTitle}</div>
            </div>
          </div>
          <div className="header-right">
            <div className="header-status">
              <div className={`header-status-dot ${isOnline ? '' : 'offline'}`} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="header-status" style={{ 
              borderColor: geminiReady ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)' 
            }}>
              <span>{geminiReady ? '🤖' : '⚠️'}</span>
              <span>{geminiReady ? 'AI Aktif' : 'API Key Belum Set'}</span>
            </div>
            {!geminiReady && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => navigate('settings')}
                id="setup-api-btn"
              >
                Setup AI
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="app-content">
          {renderPage()}
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="offline-banner">
            📡 Anda sedang offline. Data tetap tersimpan lokal.
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <button
            key={item.id}
            className={`bottom-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
            id={`bottom-nav-${item.id}`}
          >
            <span className="bottom-nav-item-icon">{item.emoji}</span>
            <span>{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
          id="bottom-nav-settings"
        >
          <span className="bottom-nav-item-icon">⚙️</span>
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className="toast">
              <span className="toast-icon">{toast.icon}</span>
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
