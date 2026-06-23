import { useState, useEffect } from 'react'
import { isGeminiReady } from '../services/gemini'
import { getProducts, addProduct, updateProduct, deleteProduct, clearAllData } from '../services/db'
import { APP_NAME, APP_VERSION, BUSINESS_NAME, BUSINESS_LOCATION } from '../utils/helpers'

export default function Settings({ showToast, geminiReady, onSaveApiKey }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [products, setProducts] = useState([])

  // Product CRUD state
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null) // null = adding new, object = editing
  const [productForm, setProductForm] = useState({ name: '', price: '', category: '', description: '' })
  const [productFormErrors, setProductFormErrors] = useState({})
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Business profile edit state
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: BUSINESS_NAME,
    location: BUSINESS_LOCATION,
    field: 'Makanan Ringan Rumahan'
  })

  useEffect(() => {
    const savedKey = localStorage.getItem('bangkit_api_key') || ''
    setApiKey(savedKey)
    loadProducts()

    // Load saved profile
    const savedProfile = localStorage.getItem('bangkit_profile')
    if (savedProfile) {
      try { setProfileForm(JSON.parse(savedProfile)) } catch {}
    }
  }, [])

  async function loadProducts() {
    const prods = await getProducts()
    setProducts(prods)
  }

  function handleSaveKey() {
    if (!apiKey.trim()) {
      showToast('Peringatan', 'Masukkan API Key', 'warning')
      return
    }
    const success = onSaveApiKey(apiKey.trim())
    if (!success) {
      showToast('Error', 'API Key tidak valid', 'error')
    }
  }

  async function handleClearData() {
    if (!confirm('Yakin ingin menghapus semua data? Tindakan ini tidak bisa dibatalkan.')) return
    await clearAllData()
    showToast('Berhasil', 'Semua data telah dihapus', 'success')
  }

  function handleRemoveKey() {
    localStorage.removeItem('bangkit_api_key')
    setApiKey('')
    showToast('API Key Dihapus', 'Refresh halaman untuk menerapkan', 'info')
  }

  // ===== Business Profile CRUD =====
  function handleSaveProfile() {
    if (!profileForm.name.trim() || !profileForm.location.trim()) {
      showToast('Peringatan', 'Nama dan lokasi wajib diisi', 'warning')
      return
    }
    localStorage.setItem('bangkit_profile', JSON.stringify(profileForm))
    setEditingProfile(false)
    showToast('Berhasil!', 'Profil bisnis diperbarui', 'success')
  }

  // ===== Product CRUD =====
  function openAddProduct() {
    setEditingProduct(null)
    setProductForm({ name: '', price: '', category: '', description: '' })
    setProductFormErrors({})
    setShowProductModal(true)
  }

  function openEditProduct(product) {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      description: product.description || ''
    })
    setProductFormErrors({})
    setShowProductModal(true)
  }

  function validateProductForm() {
    const errors = {}
    if (!productForm.name.trim()) errors.name = 'Nama produk wajib diisi'
    if (!productForm.price || isNaN(Number(productForm.price)) || Number(productForm.price) <= 0) {
      errors.price = 'Harga harus berupa angka positif'
    }
    if (!productForm.category.trim()) errors.category = 'Kategori wajib diisi'
    setProductFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSaveProduct() {
    if (!validateProductForm()) return

    const productData = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      category: productForm.category.trim(),
      description: productForm.description.trim()
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
        showToast('Berhasil!', `Produk "${productData.name}" diperbarui`, 'success')
      } else {
        await addProduct(productData)
        showToast('Berhasil!', `Produk "${productData.name}" ditambahkan`, 'success')
      }
      setShowProductModal(false)
      await loadProducts()
    } catch (err) {
      showToast('Error', 'Gagal menyimpan produk', 'error')
    }
  }

  async function handleDeleteProduct(id, name) {
    try {
      await deleteProduct(id)
      setDeleteConfirmId(null)
      showToast('Berhasil!', `Produk "${name}" dihapus`, 'success')
      await loadProducts()
    } catch (err) {
      showToast('Error', 'Gagal menghapus produk', 'error')
    }
  }

  function updateFormField(field, value) {
    setProductForm(prev => ({ ...prev, [field]: value }))
    // Clear error on change
    if (productFormErrors[field]) {
      setProductFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean)), 'Keripik', 'Stik', 'Kue Tradisional', 'Peyek', 'Lainnya']
  const uniqueCategories = [...new Set(categories)]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">⚙️ Pengaturan</h1>
        <p className="page-description">Konfigurasi API, profil bisnis, dan preferensi aplikasi</p>
      </div>

      {/* API Key Section */}
      <div className="card animate-fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h3 className="card-title">🔑 Google Gemini API Key</h3>
          <div className={`tag ${geminiReady ? 'emerald' : 'gold'}`}>
            {geminiReady ? '✅ Aktif' : '⚠️ Belum Set'}
          </div>
        </div>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          API Key diperlukan untuk mengaktifkan semua fitur AI. Dapatkan gratis di{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-emerald-light)' }}>
            Google AI Studio →
          </a>
        </p>

        <div className="input-group">
          <label className="input-label">API Key</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                id="api-key-input"
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowKey(!showKey)}
                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleSaveKey} id="save-api-btn">
              💾 Simpan
            </button>
          </div>
        </div>

        {geminiReady && (
          <button className="btn btn-ghost btn-sm" onClick={handleRemoveKey} style={{ color: 'var(--color-rose-light)' }}>
            🗑️ Hapus API Key
          </button>
        )}

        <div className="ai-insight" style={{ marginTop: 'var(--space-4)' }}>
          <div className="ai-insight-label"><span>🔒</span> Keamanan</div>
          <div className="ai-insight-text">
            API Key hanya disimpan di browser Anda (localStorage) dan tidak pernah dikirim ke server kami. 
            Semua panggilan AI dilakukan langsung dari browser ke Google API.
          </div>
        </div>
      </div>

      {/* Business Profile */}
      <div className="card animate-fade-in-up stagger-2" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h3 className="card-title">🏭 Profil Bisnis</h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setEditingProfile(!editingProfile)}
            id="edit-profile-btn"
          >
            {editingProfile ? '✕ Batal' : '✏️ Edit Profil'}
          </button>
        </div>
        
        {editingProfile ? (
          /* Edit Profile Form */
          <div className="animate-fade-in" style={{ marginTop: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Nama UMKM</label>
              <input
                className="input"
                value={profileForm.name}
                onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nama usaha Anda"
                id="profile-name-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Lokasi</label>
              <input
                className="input"
                value={profileForm.location}
                onChange={e => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Kota, Provinsi"
                id="profile-location-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Bidang Usaha</label>
              <input
                className="input"
                value={profileForm.field}
                onChange={e => setProfileForm(prev => ({ ...prev, field: e.target.value }))}
                placeholder="Contoh: Makanan Ringan Rumahan"
                id="profile-field-input"
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveProfile} id="save-profile-btn">
              💾 Simpan Profil
            </button>
          </div>
        ) : (
          /* Display Profile */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Nama UMKM</div>
              <div style={{ fontWeight: '600' }}>{profileForm.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Lokasi</div>
              <div style={{ fontWeight: '600' }}>{profileForm.location}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Bidang Usaha</div>
              <div style={{ fontWeight: '600' }}>{profileForm.field}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Jumlah Produk</div>
              <div style={{ fontWeight: '600' }}>{products.length} produk</div>
            </div>
          </div>
        )}

        {/* Product List with CRUD */}
        <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>📦 Daftar Produk</div>
            <button className="btn btn-primary btn-sm" onClick={openAddProduct} id="add-product-btn">
              ➕ Tambah Produk
            </button>
          </div>

          {products.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Belum ada produk</div>
              <div className="empty-state-text">Klik "Tambah Produk" untuk menambahkan produk pertama</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>Harga</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td><span className="tag">{p.category}</span></td>
                      <td style={{ textAlign: 'right', color: 'var(--color-emerald-light)', fontWeight: '500' }}>
                        Rp{p.price.toLocaleString('id-ID')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {deleteConfirmId === p.id ? (
                          /* Delete confirmation inline */
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              style={{ background: 'var(--color-rose)', color: 'white', padding: '4px 8px', fontSize: '11px' }}
                              id={`confirm-delete-${p.id}`}
                            >
                              Hapus
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeleteConfirmId(null)}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditProduct(p)}
                              title="Edit produk"
                              id={`edit-product-${p.id}`}
                              style={{ padding: '4px 8px' }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeleteConfirmId(p.id)}
                              title="Hapus produk"
                              id={`delete-product-${p.id}`}
                              style={{ padding: '4px 8px', color: 'var(--color-rose-light)' }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card animate-fade-in-up stagger-3" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🗃️ Manajemen Data</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Semua data disimpan secara lokal di browser Anda menggunakan IndexedDB. Data tetap tersedia bahkan saat offline.
        </p>
        <button
          className="btn btn-secondary"
          onClick={handleClearData}
          style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--color-rose-light)' }}
          id="clear-data-btn"
        >
          🗑️ Hapus Semua Data
        </button>
      </div>

      {/* About */}
      <div className="card animate-fade-in-up stagger-4">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>ℹ️ Tentang Aplikasi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Aplikasi</div>
            <div style={{ fontWeight: '600' }}>{APP_NAME}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Versi</div>
            <div>{APP_VERSION}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>AI Engine</div>
            <div>Google Gemini 2.5 Flash</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Storage</div>
            <div>IndexedDB (Offline-first)</div>
          </div>
        </div>
        <div style={{ 
          marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.6
        }}>
          <strong>{APP_NAME}</strong> — Bantu Anak Negeri Gerakkan Kemajuan Industri Tradisional dengan AI.<br />
          Dibuat untuk IDCamp Developer Challenge #2 — Digitalisasi & Akselerasi UMKM dengan Generative AI.<br />
          © 2026 — Seluruh hak cipta dilindungi.
        </div>
      </div>

      {/* ===== Product Modal (Add/Edit) ===== */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
              </h3>
              <button className="modal-close" onClick={() => setShowProductModal(false)} id="close-product-modal">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Product Name */}
              <div className="input-group">
                <label className="input-label">Nama Produk *</label>
                <input
                  className="input"
                  placeholder="Contoh: Keripik Pisang Coklat"
                  value={productForm.name}
                  onChange={e => updateFormField('name', e.target.value)}
                  id="product-name-input"
                  style={productFormErrors.name ? { borderColor: 'var(--color-rose)' } : {}}
                />
                {productFormErrors.name && (
                  <div style={{ color: 'var(--color-rose-light)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                    ⚠️ {productFormErrors.name}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="input-group">
                <label className="input-label">Harga (Rp) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Contoh: 5000"
                  value={productForm.price}
                  onChange={e => updateFormField('price', e.target.value)}
                  id="product-price-input"
                  min="0"
                  style={productFormErrors.price ? { borderColor: 'var(--color-rose)' } : {}}
                />
                {productFormErrors.price && (
                  <div style={{ color: 'var(--color-rose-light)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                    ⚠️ {productFormErrors.price}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="input-group">
                <label className="input-label">Kategori *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      className={`tag ${productForm.category === cat ? 'emerald' : ''}`}
                      onClick={() => updateFormField('category', cat)}
                      style={{ cursor: 'pointer', padding: '5px 10px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Atau ketik kategori baru..."
                  value={productForm.category}
                  onChange={e => updateFormField('category', e.target.value)}
                  id="product-category-input"
                  style={productFormErrors.category ? { borderColor: 'var(--color-rose)' } : {}}
                />
                {productFormErrors.category && (
                  <div style={{ color: 'var(--color-rose-light)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                    ⚠️ {productFormErrors.category}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label">Deskripsi (Opsional)</label>
                <textarea
                  className="input"
                  placeholder="Deskripsi singkat tentang produk ini..."
                  value={productForm.description}
                  onChange={e => updateFormField('description', e.target.value)}
                  rows={3}
                  id="product-description-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveProduct} id="save-product-btn">
                {editingProduct ? '💾 Simpan Perubahan' : '➕ Tambah Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
