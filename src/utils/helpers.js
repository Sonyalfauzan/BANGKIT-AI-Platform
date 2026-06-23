/* Utility functions — Formatters, helpers, constants */

// Currency formatter for Indonesian Rupiah
export function formatRupiah(amount) {
  if (amount === null || amount === undefined) return 'Rp0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Short number format (e.g., 1.5jt, 500rb)
export function formatShortNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'jt'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'rb'
  return num.toString()
}

// Date formatters
export function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  })
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

// File to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
}

// Debounce
export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// Truncate text
export function truncate(str, len = 100) {
  if (!str) return ''
  if (str.length <= len) return str
  return str.substring(0, len) + '...'
}

// Download as CSV
export function downloadCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    }).join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// App constants
export const APP_NAME = 'BANGKIT'
export const APP_VERSION = '1.0.0'
export const BUSINESS_NAME = 'AKBAR 354'
export const BUSINESS_LOCATION = 'Tarakan, Kalimantan Utara'

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'marketplace', label: 'Marketplace', icon: '🛒' }
]

export const WRITING_STYLES = [
  { id: 'casual', label: 'Casual', icon: '😊' },
  { id: 'formal', label: 'Formal', icon: '👔' },
  { id: 'humor', label: 'Humor', icon: '😄' },
  { id: 'storytelling', label: 'Storytelling', icon: '📖' },
  { id: 'promosi', label: 'Promosi', icon: '🔥' }
]

export const EXPORT_LANGUAGES = [
  { id: 'english', label: 'English', flag: '🇬🇧' },
  { id: 'mandarin', label: '中文 (Mandarin)', flag: '🇨🇳' },
  { id: 'japanese', label: '日本語 (Japanese)', flag: '🇯🇵' },
  { id: 'korean', label: '한국어 (Korean)', flag: '🇰🇷' },
  { id: 'malay', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { id: 'arabic', label: 'العربية (Arabic)', flag: '🇸🇦' }
]

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Beranda', icon: '🏠', emoji: '🏠' },
  { id: 'marketing', label: 'Promosi & Konten', icon: '📱', emoji: '📱', badge: '✨' },
  { id: 'finance', label: 'Buku Kas', icon: '📒', emoji: '📒', badge: '⚡' },
  { id: 'customer', label: 'Layanan Pelanggan', icon: '💬', emoji: '💬', badge: '🪄' },
  { id: 'analytics', label: 'Laporan Penjualan', icon: '📊', emoji: '📊', badge: '🧠' },
  { id: 'export', label: 'Go Internasional', icon: '🌍', emoji: '🌍', badge: '✨' }
]
