import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import * as api from './api';
import './Admin.css';

// ── Simple password gate (change this password!) ──────────────
const ADMIN_PASSWORD = 'admin@ReasonableStore2025';
const ADMIN_KEY = 'rs_admin_auth';

// ── Emoji options for products ────────────────────────────────
const EMOJIS = ['🧴','🧼','🫧','💄','✨','👁️','👔','👖','🧥','👙','🌙',
  '🧱','🧸','🚗','👜','🪢','🫙','💊','🛍️','👒','👗','💍','📦'];
const BG_COLORS = ['#fde8e8','#e8f4fd','#e8fdf0','#fde8f4','#fff8e8',
  '#ede8f9','#e8edf9','#f9ece8','#e8f9f5','#f4e8fd','#fdf4e8','#e8fde9','#e8f9fd'];

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', original_price: '',
  category_id: '', emoji: '📦', badge: '', bg_color: '#fde8e8',
  stock: 100, is_featured: false,
};

// ── Login Screen ──────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_KEY, '1');
      onLogin();
    } else {
      setErr('Incorrect password. Please try again.');
      setPw('');
    }
  };
  return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-logo">🔐</div>
        <h2>Admin Panel</h2>
        <p>Reasonable Store Management</p>
        <form onSubmit={submit}>
          <input
            type="password" placeholder="Enter admin password"
            value={pw} onChange={e => { setPw(e.target.value); setErr(''); }}
            autoFocus
          />
          {err && <div className="login-err">{err}</div>}
          <button type="submit">Login →</button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ tab, setTab, onLogout }) {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'products',  icon: '🛍️', label: 'Products' },
    { id: 'add',       icon: '➕', label: 'Add Product' },
    { id: 'queries',   icon: '📬', label: 'Customer Queries' },
    { id: 'gallery',   icon: '🖼️', label: 'Gallery' },
  ];
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <span>🛍️</span>
        <div>
          <div className="sidebar-brand">Reasonable</div>
          <div className="sidebar-sub">Store Admin</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <button key={item.id}
            className={`sidebar-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>🚪 Logout</button>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard({ setTab }) {
  const [stats, setStats] = useState({ products: 0, categories: 0, queries: 0, newQueries: 0 });
  const [recentQueries, setRecentQueries] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getProducts({ limit: 1 }),
      api.getCategories(),
      api.getQueries({ limit: 5 }),
    ]).then(([p, c, q]) => {
      setStats({
        products: p.total || 0,
        categories: c.data.length,
        queries: q.total || 0,
        newQueries: q.data.filter(x => x.status === 'new').length,
      });
      setRecentQueries(q.data.slice(0, 5));
    }).catch(() => {});
  }, []);

  return (
    <div className="admin-content">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening at Reasonable Store.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card" style={{ borderColor: '#f4845f' }}>
          <div className="stat-icon" style={{ background: '#fff0ec' }}>🛍️</div>
          <div className="stat-info">
            <div className="stat-num">{stats.products}</div>
            <div className="stat-lbl">Total Products</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: '#2a9d8f' }}>
          <div className="stat-icon" style={{ background: '#e8f9f5' }}>📂</div>
          <div className="stat-info">
            <div className="stat-num">{stats.categories}</div>
            <div className="stat-lbl">Categories</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: '#6d4c8e' }}>
          <div className="stat-icon" style={{ background: '#f3eeff' }}>📬</div>
          <div className="stat-info">
            <div className="stat-num">{stats.queries}</div>
            <div className="stat-lbl">Total Queries</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: '#e9b84a' }}>
          <div className="stat-icon" style={{ background: '#fffbeb' }}>🔔</div>
          <div className="stat-info">
            <div className="stat-num">{stats.newQueries}</div>
            <div className="stat-lbl">New Queries</div>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Recent Customer Queries</h3>
          <button className="link-btn" onClick={() => setTab('queries')}>View All →</button>
        </div>
        <div className="query-list">
          {recentQueries.length === 0 && <div className="empty-state">No queries yet.</div>}
          {recentQueries.map(q => (
            <div key={q.id} className="query-row">
              <div className="query-avatar">{q.full_name[0].toUpperCase()}</div>
              <div className="query-info">
                <div className="query-name">{q.full_name} <span className="query-email">{q.email}</span></div>
                <div className="query-msg">{q.message.slice(0, 80)}{q.message.length > 80 ? '…' : ''}</div>
              </div>
              <span className={`status-badge status-${q.status}`}>{q.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="qa-grid">
          <button className="qa-btn" onClick={() => setTab('add')}>➕ Add New Product</button>
          <button className="qa-btn" onClick={() => setTab('queries')}>📬 View Queries</button>
          <button className="qa-btn" onClick={() => setTab('gallery')}>🖼️ Manage Gallery</button>
          <button className="qa-btn" onClick={() => setTab('products')}>✏️ Edit Products</button>
        </div>
      </div>
    </div>
  );
}

// ── Product Form (shared for Add & Edit) ──────────────────────
function ProductForm({ initial = EMPTY_PRODUCT, categories, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...initial });
  const [saving, setSaving] = useState(false);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async () => {
    if (!form.name || !form.price) { toast.error('Name and Price are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        stock: parseInt(form.stock) || 100,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      if (isEdit) {
        await api.updateProduct(initial.id, payload);
        toast.success('✅ Product updated!');
      } else {
        await api.createProduct(payload);
        toast.success('✅ Product added!');
      }
      onSave();
    } catch (e) { toast.error(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="product-form">
      {/* Preview card */}
      <div className="form-preview">
        <div className="preview-card" style={{ background: form.bg_color }}>
          <div className="preview-emoji">{form.emoji}</div>
          {form.badge && <span className="preview-badge">{form.badge}</span>}
        </div>
        <div className="preview-info">
          <div className="preview-name">{form.name || 'Product Name'}</div>
          <div className="preview-price">
            Rs {form.price || '0'}
            {form.original_price && <span className="preview-old"> Rs {form.original_price}</span>}
          </div>
          {form.is_featured && <span className="featured-tag">⭐ Featured</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label>PRODUCT NAME *</label>
          <input name="name" value={form.name} onChange={change} placeholder="e.g. Rose Glow Face Wash" />
        </div>
        <div className="form-group full">
          <label>DESCRIPTION</label>
          <textarea name="description" value={form.description} onChange={change}
            rows={3} placeholder="Short product description…" />
        </div>
        <div className="form-group">
          <label>PRICE (Rs) *</label>
          <input name="price" type="number" value={form.price} onChange={change} placeholder="350" />
        </div>
        <div className="form-group">
          <label>ORIGINAL PRICE (Rs)</label>
          <input name="original_price" type="number" value={form.original_price} onChange={change} placeholder="500 (optional)" />
        </div>
        <div className="form-group">
          <label>CATEGORY</label>
          <select name="category_id" value={form.category_id} onChange={change}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>BADGE</label>
          <select name="badge" value={form.badge} onChange={change}>
            <option value="">None</option>
            {['NEW','SALE','HOT','LIMITED'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>STOCK QTY</label>
          <input name="stock" type="number" value={form.stock} onChange={change} />
        </div>
        <div className="form-group">
          <label>EMOJI ICON</label>
          <div className="emoji-grid">
            {EMOJIS.map(em => (
              <button key={em} type="button"
                className={`emoji-btn ${form.emoji === em ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, emoji: em }))}>
                {em}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>CARD BACKGROUND</label>
          <div className="color-grid">
            {BG_COLORS.map(c => (
              <button key={c} type="button"
                className={`color-swatch ${form.bg_color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setForm(f => ({ ...f, bg_color: c }))} />
            ))}
          </div>
        </div>
        <div className="form-group full">
          <label className="checkbox-label">
            <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={change} />
            <span>⭐ Mark as Featured (shows on homepage)</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        {onCancel && <button className="btn-cancel" onClick={onCancel}>Cancel</button>}
        <button className="btn-save" onClick={submit} disabled={saving}>
          {saving ? '⏳ Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Product'}
        </button>
      </div>
    </div>
  );
}

// ── Products Manager ──────────────────────────────────────────
function ProductsManager({ setTab }) {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [search, setSearch]       = useState('');
  const [deleting, setDeleting]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getProducts({ limit: 100 }), api.getCategories()])
      .then(([p, c]) => { setProducts(p.data); setCategories(c.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.deleteProduct(id);
      toast.success('🗑️ Product deleted');
      load();
    } catch (e) { toast.error(String(e)); }
    finally { setDeleting(null); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (editing) {
    return (
      <div className="admin-content">
        <div className="page-header">
          <button className="back-btn" onClick={() => setEditing(null)}>← Back to Products</button>
          <h1>Edit Product</h1>
        </div>
        <ProductForm
          initial={editing}
          categories={categories}
          isEdit
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>{products.length} products total</p>
        </div>
        <button className="btn-primary-sm" onClick={() => setTab('add')}>➕ Add Product</button>
      </div>
      <input className="admin-search" placeholder="🔍 Search products or category…"
        value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <div className="loading-state">Loading products…</div> : (
        <div className="products-table">
          <div className="table-head">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Badge</span>
            <span>Actions</span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className="table-row">
              <div className="row-product">
                <div className="row-emoji" style={{ background: p.bg_color }}>{p.emoji}</div>
                <div>
                  <div className="row-name">{p.name}</div>
                  {p.is_featured && <span className="mini-tag">⭐ Featured</span>}
                </div>
              </div>
              <span className="row-cat">{p.category_name || '—'}</span>
              <div>
                <div className="row-price">Rs {Number(p.price).toLocaleString()}</div>
                {p.original_price && <div className="row-old">Rs {Number(p.original_price).toLocaleString()}</div>}
              </div>
              <span className="row-stock">{p.stock}</span>
              <span>{p.badge ? <span className="badge-pill">{p.badge}</span> : '—'}</span>
              <div className="row-actions">
                <button className="btn-edit" onClick={() => setEditing(p)}>✏️ Edit</button>
                <button className="btn-del" disabled={deleting === p.id}
                  onClick={() => handleDelete(p.id, p.name)}>
                  {deleting === p.id ? '…' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty-state">No products found.</div>}
        </div>
      )}
    </div>
  );
}

// ── Add Product ───────────────────────────────────────────────
function AddProduct({ setTab }) {
  const [categories, setCategories] = useState([]);
  useEffect(() => { api.getCategories().then(r => setCategories(r.data)).catch(() => {}); }, []);
  return (
    <div className="admin-content">
      <div className="page-header">
        <h1>Add New Product</h1>
        <p>Fill in the details below to add a product to your store.</p>
      </div>
      <ProductForm
        categories={categories}
        isEdit={false}
        onSave={() => { toast.success('Product added! View it in Products.'); setTab('products'); }}
      />
    </div>
  );
}

// ── Queries Manager ───────────────────────────────────────────
function QueriesManager() {
  const [queries, setQueries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = filter !== 'all' ? { status: filter } : {};
    api.getQueries(params)
      .then(r => setQueries(r.data))
      .catch(() => toast.error('Failed to load queries'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, status) => {
    try {
      await api.updateQueryStatus(id, status);
      toast.success(`Marked as ${status}`);
      load();
    } catch (e) { toast.error(String(e)); }
  };

  const statusColor = { new: '#f4845f', read: '#e9b84a', replied: '#2a9d8f' };

  return (
    <div className="admin-content">
      <div className="page-header">
        <h1>Customer Queries</h1>
        <p>{queries.length} queries</p>
      </div>
      <div className="filter-tabs">
        {['all','new','read','replied'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="loading-state">Loading…</div> : (
        <div className="queries-list">
          {queries.length === 0 && <div className="empty-state">No queries found.</div>}
          {queries.map(q => (
            <div key={q.id} className={`query-card ${expanded === q.id ? 'expanded' : ''}`}>
              <div className="query-card-header" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                <div className="query-avatar-lg" style={{ background: statusColor[q.status] || '#ccc' }}>
                  {q.full_name[0].toUpperCase()}
                </div>
                <div className="query-card-info">
                  <div className="query-card-name">{q.full_name}</div>
                  <div className="query-card-meta">
                    📧 {q.email}
                    {q.phone && ` · 📞 ${q.phone}`}
                    {q.category && ` · 🏷️ ${q.category}`}
                  </div>
                  <div className="query-preview">{q.message.slice(0, 100)}{q.message.length > 100 ? '…' : ''}</div>
                </div>
                <div className="query-card-right">
                  <span className={`status-badge status-${q.status}`}>{q.status}</span>
                  <div className="query-date">{new Date(q.created_at).toLocaleDateString()}</div>
                  <span className="expand-arrow">{expanded === q.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === q.id && (
                <div className="query-body">
                  <div className="query-full-msg">
                    <strong>Message:</strong>
                    <p>{q.message}</p>
                  </div>
                  <div className="query-status-actions">
                    <span>Change status:</span>
                    {['new','read','replied'].map(s => (
                      <button key={s}
                        className={`status-btn ${q.status === s ? 'active' : ''}`}
                        style={{ '--clr': statusColor[s] }}
                        onClick={() => changeStatus(q.id, s)}>
                        {s}
                      </button>
                    ))}
                    <a href={`mailto:${q.email}?subject=Re: Your Query at Reasonable Store`}
                      className="reply-btn">✉️ Reply via Email</a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Gallery Manager ───────────────────────────────────────────
function GalleryManager() {
  const [photos, setPhotos]     = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = () => api.getGallery().then(r => setPhotos(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    [...files].forEach(f => fd.append('photos', f));
    try {
      await api.uploadPhotos(fd);
      await load();
      toast.success(`📸 ${files.length} photo(s) uploaded!`);
    } catch (err) { toast.error(String(err)); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.deleteGalleryPhoto(id);
      toast.success('Photo deleted');
      load();
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="admin-content">
      <div className="page-header">
        <h1>Gallery</h1>
        <p>{photos.length} photos uploaded</p>
      </div>
      <label className="upload-zone">
        <input type="file" accept="image/*" multiple onChange={handleUpload}
          disabled={uploading} style={{ display: 'none' }} />
        <div className="upload-zone-inner">
          <span className="upload-zone-icon">📸</span>
          <div>{uploading ? '⏳ Uploading…' : 'Click or drag photos here to upload'}</div>
          <div className="upload-zone-sub">JPG, PNG, WEBP · Max 10 MB each</div>
        </div>
      </label>
      {photos.length === 0 && <div className="empty-state" style={{ marginTop: '2rem' }}>No photos uploaded yet.</div>}
      <div className="gallery-admin-grid">
        {photos.map(ph => (
          <div key={ph.id} className="gallery-thumb">
            <img src={ph.url} alt={ph.label} />
            <div className="gallery-thumb-overlay">
              <div className="thumb-label">{ph.label || ph.original_name}</div>
              <button className="thumb-del" onClick={() => handleDelete(ph.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin App ────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(ADMIN_KEY));
  const [tab, setTab]       = useState('dashboard');

  const logout = () => { sessionStorage.removeItem(ADMIN_KEY); setAuthed(false); };

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="admin-shell">
      <Sidebar tab={tab} setTab={setTab} onLogout={logout} />
      <div className="admin-main">
        {tab === 'dashboard' && <Dashboard setTab={setTab} />}
        {tab === 'products'  && <ProductsManager setTab={setTab} />}
        {tab === 'add'       && <AddProduct setTab={setTab} />}
        {tab === 'queries'   && <QueriesManager />}
        {tab === 'gallery'   && <GalleryManager />}
      </div>
    </div>
  );
}
