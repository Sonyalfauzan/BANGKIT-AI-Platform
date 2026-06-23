/* IndexedDB Service — Dexie.js database for offline-first storage */

import Dexie from 'dexie'

const db = new Dexie('BangkitAI')

db.version(1).stores({
  transactions: '++id, type, category, product, amount, date, createdAt',
  contentHistory: '++id, type, platform, content, createdAt',
  products: '++id, name, price, category, description',
  chatHistory: '++id, sessionId, role, message, createdAt',
  exportHistory: '++id, productName, languages, createdAt'
})

// Initialize default products for AKBAR 354
export async function initializeProducts() {
  const count = await db.products.count()
  if (count === 0) {
    await db.products.bulkAdd([
      { name: 'Keripik Pisang', price: 5000, category: 'Keripik', description: 'Keripik pisang renyah khas Tarakan, dibuat dari pisang pilihan yang diiris tipis dan digoreng sempurna.' },
      { name: 'Keripik Singkong', price: 4000, category: 'Keripik', description: 'Keripik singkong gurih dan renyah, cocok untuk camilan sehari-hari.' },
      { name: 'Keripik Sukun', price: 6000, category: 'Keripik', description: 'Keripik sukun premium dengan tekstur renyah dan rasa yang unik.' },
      { name: 'Keripik Tempe', price: 5000, category: 'Keripik', description: 'Keripik tempe tradisional dengan bumbu rempah khas Nusantara.' },
      { name: 'Stik Ladran', price: 4000, category: 'Stik', description: 'Stik ladran renyah dengan cita rasa gurih, camilan tradisional yang digemari.' },
      { name: 'Kembang Goyang', price: 5000, category: 'Kue Tradisional', description: 'Kue kembang goyang tradisional, renyah dan manis, khas Indonesia.' },
      { name: 'Peyek', price: 4000, category: 'Peyek', description: 'Peyek kacang renyah dengan bumbu gurih, teman makan yang sempurna.' },
      { name: 'Rengginan', price: 5000, category: 'Kue Tradisional', description: 'Rengginan ketan renyah, jajanan tradisional khas yang tahan lama.' }
    ])
  }
}

// Initialize some sample transactions
export async function initializeSampleData() {
  const count = await db.transactions.count()
  if (count === 0) {
    const today = new Date()
    const sampleTransactions = []
    const products = ['Keripik Pisang', 'Keripik Singkong', 'Keripik Sukun', 'Keripik Tempe', 'Stik Ladran', 'Kembang Goyang', 'Peyek', 'Rengginan']
    const prices = [5000, 4000, 6000, 5000, 4000, 5000, 4000, 5000]

    // Generate 30 days of sample data
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // 2-5 transactions per day
      const txCount = Math.floor(Math.random() * 4) + 2
      for (let j = 0; j < txCount; j++) {
        const prodIdx = Math.floor(Math.random() * products.length)
        const qty = Math.floor(Math.random() * 20) + 5
        sampleTransactions.push({
          type: 'income',
          category: 'Penjualan',
          product: products[prodIdx],
          quantity: qty,
          unitPrice: prices[prodIdx],
          amount: qty * prices[prodIdx],
          description: `Jual ${products[prodIdx]} ${qty} bungkus`,
          date: dateStr,
          createdAt: date.toISOString()
        })
      }

      // Occasional expense
      if (i % 5 === 0) {
        const expenseAmount = Math.floor(Math.random() * 200000) + 50000
        sampleTransactions.push({
          type: 'expense',
          category: 'Bahan Baku',
          product: '-',
          quantity: 1,
          unitPrice: expenseAmount,
          amount: expenseAmount,
          description: 'Beli bahan baku (minyak, tepung, bumbu)',
          date: dateStr,
          createdAt: date.toISOString()
        })
      }
    }
    await db.transactions.bulkAdd(sampleTransactions)
  }
}

// Transactions
export async function addTransaction(tx) {
  return db.transactions.add({
    ...tx,
    createdAt: new Date().toISOString()
  })
}

export async function getTransactions(filter = {}) {
  let collection = db.transactions.orderBy('createdAt').reverse()
  if (filter.type) {
    collection = db.transactions.where('type').equals(filter.type).reverse()
  }
  if (filter.limit) {
    return collection.limit(filter.limit).toArray()
  }
  return collection.toArray()
}

export async function getTransactionsByDateRange(startDate, endDate) {
  return db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray()
}

export async function getTransactionStats() {
  const all = await db.transactions.toArray()
  const today = new Date().toISOString().split('T')[0]
  
  const todayTx = all.filter(t => t.date === today)
  const totalIncome = all.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = all.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const todayIncome = todayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const todayExpense = todayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  
  // Product sales count
  const productSales = {}
  all.filter(t => t.type === 'income').forEach(t => {
    productSales[t.product] = (productSales[t.product] || 0) + (t.quantity || 0)
  })

  // Daily totals for last 7 days
  const dailyTotals = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayIncome = all.filter(t => t.date === dateStr && t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    dailyTotals.push({ date: dateStr, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), income: dayIncome })
  }

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    todayIncome,
    todayExpense,
    todayTransactions: todayTx.length,
    totalTransactions: all.length,
    productSales,
    dailyTotals
  }
}

// Content History
export async function saveContent(content) {
  return db.contentHistory.add({
    ...content,
    createdAt: new Date().toISOString()
  })
}

export async function getContentHistory(limit = 20) {
  return db.contentHistory.orderBy('createdAt').reverse().limit(limit).toArray()
}

// Products
export async function getProducts() {
  return db.products.toArray()
}

export async function addProduct(product) {
  return db.products.add(product)
}

export async function updateProduct(id, changes) {
  return db.products.update(id, changes)
}

export async function deleteProduct(id) {
  return db.products.delete(id)
}

// Chat History
export async function saveChatMessage(msg) {
  return db.chatHistory.add({
    ...msg,
    createdAt: new Date().toISOString()
  })
}

export async function getChatHistory(sessionId) {
  return db.chatHistory.where('sessionId').equals(sessionId).toArray()
}

// Export History
export async function saveExport(data) {
  return db.exportHistory.add({
    ...data,
    createdAt: new Date().toISOString()
  })
}

export async function getExportHistory(limit = 10) {
  return db.exportHistory.orderBy('createdAt').reverse().limit(limit).toArray()
}

// Clear all data
export async function clearAllData() {
  await db.transactions.clear()
  await db.contentHistory.clear()
  await db.chatHistory.clear()
  await db.exportHistory.clear()
}

export default db
