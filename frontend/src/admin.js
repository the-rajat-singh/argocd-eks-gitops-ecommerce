import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import * as api from './api';
import './Admin.css';

const ADMIN_PASSWORD = 'admin@ReasonableStore2025';
const ADMIN_KEY      = 'rs_admin_auth';

const EMOJIS = ['🧴','🧼','🫧','💄','✨','👁️','👔','👖','🧥','👙','🌙','🧱','🧸','🚗','👜','🪢','🫙','💊','🛍️','👗','💍','📦','🌸','🎁'];
const CAT_EMOJIS = ['🛍️','🧴','💄','👔','👙','🧸','👜','🏠','💊','🎁','🌿','🌸','⭐','🎯','🎮','📚','🍽️','🏋️','🎵','👒'];
const BG_COLORS = ['#fde8e8','#e8f4fd','#e8fdf0','#fde8f4','#fff8e8','#ede8f9','#e8edf9','#f9ece8','#e8f9f5','#f4e8fd','#fdf4e8','#e8fde9','#e8f9fd'];
const EMPTY_PRODUCT  = { name:'',description:'',price:'',original_price:'',category_id:'',emoji:'📦',badge:'',bg_color:'#fde8e8',stock:100,is_featured:false };
const EMPTY_CATEGORY = { name:'',icon:'🛍️',description:'' };

// ── Login ──────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = e => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) { sessionStorage.setItem(ADMIN_KEY,'1'); onLogin(); }
    else { setErr('Incorrect password.'); setPw(''); }
  };
  return (
    <div className="admin-login"><div className="login-card">
      <div className="login-logo">🔐</div>
      <h2>Admin Panel</h2><p>Reasonable Store Management</p>
      <form onSubmit={submit}>
        <input type="password" placeholder="Enter admin password" value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} autoFocus />
        {err && <div className="login-err">{err}</div>}
        <button type="submit">Login →</button>
      </form>
    </div></div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ tab, setTab, onLogout }) {
  const items = [
    {id:'dashboard',icon:'📊',label:'Dashboard'},
    {id:'products', icon:'🛍️',label:'Products'},
    {id:'add',      icon:'➕',label:'Add Product'},
    {id:'categories',icon:'📂',label:'Categories'},
    {id:'orders',   icon:'💳',label:'Orders'},
    {id:'queries',  icon:'📬',label:'Queries'},
    {id:'gallery',  icon:'🖼️',label:'Gallery'},
  ];
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <span>🛍️</span>
        <div><div className="sidebar-brand">Reasonable</div><div className="sidebar-sub">Store Admin</div></div>
      </div>
      <nav className="sidebar-nav">
        {items.map(i => (
          <button key={i.id} className={`sidebar-item ${tab===i.id?'active':''}`} onClick={()=>setTab(i.id)}>
            <span className="sidebar-icon">{i.icon}</span>{i.label}
          </button>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>🚪 Logout</button>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard({ setTab }) {
  const [stats, setStats] = useState({products:0,categories:0,queries:0,newQueries:0,orders:0,revenue:0});
  const [recentOrders, setRecentOrders] = useState([]);
  useEffect(() => {
    Promise.all([
      api.getProducts({limit:1}), api.getCategories(),
      api.getQueries({limit:5}), api.getAllOrders({limit:5}),
    ]).then(([p,c,q,o]) => {
      const paid = o.data.filter(x=>x.payment_status==='verified'||x.payment_method==='cod'&&x.status==='delivered');
      setStats({
        products: p.total||0, categories: c.data.length,
        queries: q.total||0, newQueries: q.data.filter(x=>x.status==='new').length,
        orders: o.total||0, revenue: paid.reduce((s,x)=>s+parseFloat(x.total||0),0),
      });
      setRecentOrders(o.data.slice(0,5));
    }).catch(()=>{});
  },[]);

  const statusColor = {placed:'#e9b84a',confirmed:'#2a9d8f',shipped:'#6d4c8e',delivered:'#22c55e',cancelled:'#ef4444'};
  return (
    <div className="admin-content">
      <div className="page-header"><h1>Dashboard</h1><p>Welcome back!</p></div>
      <div className="stats-grid">
        {[
          {n:stats.products,   l:'Products',    c:'#f4845f', bg:'#fff0ec', i:'🛍️'},
          {n:stats.categories, l:'Categories',  c:'#2a9d8f', bg:'#e8f9f5', i:'📂'},
          {n:stats.orders,     l:'Orders',      c:'#0891b2', bg:'#e0f2fe', i:'💳'},
          {n:stats.newQueries, l:'New Queries',  c:'#e9b84a', bg:'#fffbeb', i:'🔔'},
        ].map(({n,l,c,bg,i}) => (
          <div key={l} className="stat-card" style={{borderColor:c}}>
            <div className="stat-icon" style={{background:bg}}>{i}</div>
            <div className="stat-info"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>
          </div>
        ))}
      </div>
      <div className="dash-section">
        <div className="dash-section-header"><h3>Recent Orders</h3><button className="link-btn" onClick={()=>setTab('orders')}>View All →</button></div>
        {recentOrders.length===0 ? <div className="empty-state">No orders yet.</div> : recentOrders.map(o=>(
          <div key={o.id} className="query-row" style={{alignItems:'center'}}>
            <div className="query-avatar" style={{background:statusColor[o.status]||'#ccc'}}>{o.order_number.slice(-3)}</div>
            <div className="query-info">
              <div className="query-name">#{o.order_number} <span className="query-email">{o.delivery_name}</span></div>
              <div className="query-msg">{o.payment_method==='cod'?'💵 COD':'📱 UPI'} · Rs {Number(o.total).toLocaleString()} · {o.delivery_city}</div>
            </div>
            <span className="status-badge" style={{background:statusColor[o.status]+'20',color:statusColor[o.status]}}>{o.status}</span>
          </div>
        ))}
      </div>
      <div className="quick-actions"><h3>Quick Actions</h3>
        <div className="qa-grid">
          {[['➕','Add Product','add'],['📂','Categories','categories'],['💳','Orders','orders'],['📬','Queries','queries']].map(([i,l,t])=>(
            <button key={t} className="qa-btn" onClick={()=>setTab(t)}>{i} {l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Product Form ──────────────────────────────────────────────
function ProductForm({ initial=EMPTY_PRODUCT, categories, onSave, onCancel, isEdit }) {
  const [form, setForm]           = useState({...EMPTY_PRODUCT,...initial});
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState(initial.image_url || null);
  const [saving, setSaving]       = useState(false);

  const change = e => {
    const { name, value, type, checked } = e.target;
    setForm(f=>({...f,[name]:type==='checkbox'?checked:value}));
  };
  const handleImage = e => {
    const file = e.target.files[0]; if (!file) return;
    setImageFile(file); setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!form.name||!form.price) { toast.error('Name and Price required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (isEdit) { await api.updateProduct(initial.id, fd); toast.success('✅ Updated!'); }
      else        { await api.createProduct(fd);              toast.success('✅ Added!'); }
      onSave();
    } catch(e) { toast.error(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="product-form">
      <div className="form-preview">
        <div className="preview-card" style={{background:form.bg_color}}>
          {preview
            ? <img src={preview} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}} />
            : <div className="preview-emoji">{form.emoji}</div>}
          {form.badge && <span className="preview-badge">{form.badge}</span>}
        </div>
        <div className="preview-info">
          <div className="preview-name">{form.name||'Product Name'}</div>
          <div className="preview-price">Rs {form.price||'0'}{form.original_price&&<span className="preview-old"> Rs {form.original_price}</span>}</div>
          {form.is_featured&&<span className="featured-tag">⭐ Featured</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group full"><label>PRODUCT NAME *</label><input name="name" value={form.name} onChange={change} placeholder="e.g. Rose Glow Face Wash" /></div>
        <div className="form-group full"><label>DESCRIPTION</label><textarea name="description" value={form.description} onChange={change} rows={3} placeholder="Short description…" /></div>
        <div className="form-group"><label>PRICE (Rs) *</label><input name="price" type="number" value={form.price} onChange={change} /></div>
        <div className="form-group"><label>ORIGINAL PRICE</label><input name="original_price" type="number" value={form.original_price} onChange={change} placeholder="optional" /></div>
        <div className="form-group">
          <label>CATEGORY</label>
          <select name="category_id" value={form.category_id} onChange={change}>
            <option value="">— Select —</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>BADGE</label>
          <select name="badge" value={form.badge} onChange={change}>
            <option value="">None</option>
            {['NEW','SALE','HOT','LIMITED'].map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group"><label>STOCK</label><input name="stock" type="number" value={form.stock} onChange={change} /></div>
        <div className="form-group">
          <label>PRODUCT IMAGE</label>
          <label className="img-upload-btn">
            <input type="file" accept="image/*" onChange={handleImage} style={{display:'none'}} />
            {preview ? '🔄 Change image' : '📸 Upload image'}
          </label>
          <div className="img-hint">JPG, PNG, WEBP · max 10 MB</div>
        </div>
        <div className="form-group">
          <label>EMOJI (fallback if no image)</label>
          <div className="emoji-grid">
            {EMOJIS.map(em=><button key={em} type="button" className={`emoji-btn ${form.emoji===em?'selected':''}`} onClick={()=>setForm(f=>({...f,emoji:em}))}>{em}</button>)}
          </div>
        </div>
        <div className="form-group">
          <label>CARD BACKGROUND</label>
          <div className="color-grid">
            {BG_COLORS.map(c=><button key={c} type="button" className={`color-swatch ${form.bg_color===c?'selected':''}`} style={{background:c}} onClick={()=>setForm(f=>({...f,bg_color:c}))} />)}
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
        {onCancel&&<button className="btn-cancel" onClick={onCancel}>Cancel</button>}
        <button className="btn-save" onClick={submit} disabled={saving}>{saving?'⏳ Saving…':isEdit?'💾 Save Changes':'➕ Add Product'}</button>
      </div>
    </div>
  );
}

// ── Products Manager ──────────────────────────────────────────
function ProductsManager({ setTab }) {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(null);
  const [search, setSearch]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getProducts({limit:200}), api.getCategories()])
      .then(([p,c])=>{ setProducts(p.data); setCategories(c.data); })
      .catch(()=>toast.error('Failed to load'))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{ load(); },[load]);

  const del = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.deleteProduct(id); toast.success('Deleted'); load(); } catch(e) { toast.error(String(e)); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())||(p.category_name||'').toLowerCase().includes(search.toLowerCase()));

  if (editing) return (
    <div className="admin-content">
      <div className="page-header"><button className="back-btn" onClick={()=>setEditing(null)}>← Back</button><h1>Edit Product</h1></div>
      <ProductForm initial={editing} categories={categories} isEdit onSave={()=>{setEditing(null);load();}} onCancel={()=>setEditing(null)} />
    </div>
  );

  return (
    <div className="admin-content">
      <div className="page-header">
        <div><h1>Products</h1><p>{products.length} total</p></div>
        <button className="btn-primary-sm" onClick={()=>setTab('add')}>➕ Add Product</button>
      </div>
      <input className="admin-search" placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)} />
      {loading ? <div className="loading-state">Loading…</div> : (
        <div className="products-table">
          <div className="prod-tbl-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Badge</span><span>Actions</span></div>
          {filtered.map(p=>(
            <div key={p.id} className="prod-tbl-row">
              <div className="row-product">
                <div className="row-emoji" style={{background:p.bg_color}}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
                    : p.emoji}
                </div>
                <div><div className="row-name">{p.name}</div>{p.is_featured&&<span className="mini-tag">⭐</span>}</div>
              </div>
              <span className="row-cat">{p.category_name||'—'}</span>
              <div><div className="row-price">Rs {Number(p.price).toLocaleString()}</div>{p.original_price&&<div className="row-old">Rs {Number(p.original_price).toLocaleString()}</div>}</div>
              <span className="row-stock">{p.stock}</span>
              <span>{p.badge?<span className="badge-pill">{p.badge}</span>:'—'}</span>
              <div className="row-actions">
                <button className="btn-edit" onClick={()=>setEditing(p)}>✏️</button>
                <button className="btn-del" onClick={()=>del(p.id,p.name)}>🗑️</button>
              </div>
            </div>
          ))}
          {filtered.length===0&&<div className="empty-state">No products found.</div>}
        </div>
      )}
    </div>
  );
}

// ── Add Product ───────────────────────────────────────────────
function AddProduct({ setTab }) {
  const [cats, setCats] = useState([]);
  useEffect(()=>{ api.getCategories().then(r=>setCats(r.data)).catch(()=>{}); },[]);
  return (
    <div className="admin-content">
      <div className="page-header"><h1>Add New Product</h1></div>
      <ProductForm categories={cats} isEdit={false} onSave={()=>setTab('products')} />
    </div>
  );
}

// ── Categories Manager ────────────────────────────────────────
function CategoriesManager() {
  const [cats, setCats]     = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(EMPTY_CATEGORY);
  const [saving, setSaving]   = useState(false);

  const load = ()=>{ api.getCategories().then(r=>setCats(r.data)).catch(()=>{}); };
  useEffect(()=>{ load(); },[]);

  const change = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const startEdit = c => { setEditing(c.id); setAdding(false); setForm({name:c.name,icon:c.icon,description:c.description||''}); };
  const startAdd  = ()=> { setAdding(true); setEditing(null); setForm(EMPTY_CATEGORY); };
  const cancel    = ()=> { setEditing(null); setAdding(false); };

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await api.updateCategory(editing, form); toast.success('✅ Updated'); }
      else         { await api.createCategory(form);          toast.success('✅ Created'); }
      load(); cancel();
    } catch(e) { toast.error(String(e)); }
    finally { setSaving(false); }
  };

  const del = async (id, name, count) => {
    if (parseInt(count)>0) { toast.error(`${count} products use this category — reassign first`); return; }
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.deleteCategory(id); toast.success('Deleted'); load(); } catch(e) { toast.error(String(e)); }
  };

  return (
    <div className="admin-content">
      <div className="page-header">
        <div><h1>Categories</h1><p>{cats.length} categories</p></div>
        <button className="btn-primary-sm" onClick={startAdd}>➕ Add Category</button>
      </div>

      {(adding||editing) && (
        <div className="form-card" style={{marginBottom:'1.5rem'}}>
          <div className="form-card-title">{editing?'Edit Category':'New Category'}</div>
          <div className="form-grid">
            <div className="form-group"><label>NAME *</label><input name="name" value={form.name} onChange={change} placeholder="e.g. Sports & Fitness" /></div>
            <div className="form-group"><label>DESCRIPTION</label><input name="description" value={form.description} onChange={change} placeholder="Short description" /></div>
            <div className="form-group full">
              <label>ICON EMOJI</label>
              <div className="emoji-grid">
                {CAT_EMOJIS.map(em=><button key={em} type="button" className={`emoji-btn ${form.icon===em?'selected':''}`} onClick={()=>setForm(f=>({...f,icon:em}))}>{em}</button>)}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={cancel}>Cancel</button>
            <button className="btn-save" onClick={save} disabled={saving}>{saving?'⏳ Saving…':editing?'💾 Update':'➕ Create'}</button>
          </div>
        </div>
      )}

      <div className="products-table">
        <div className="prod-tbl-head" style={{gridTemplateColumns:'2fr 1fr 2fr 1.2fr'}}><span>Category</span><span>Products</span><span>Description</span><span>Actions</span></div>
        {cats.map(c=>(
          <div key={c.id} className="prod-tbl-row" style={{gridTemplateColumns:'2fr 1fr 2fr 1.2fr'}}>
            <div className="row-product">
              <div className="row-emoji" style={{background:'#f5f0e8',fontSize:20}}>{c.icon}</div>
              <div className="row-name">{c.name}</div>
            </div>
            <span className="row-stock">{c.product_count}</span>
            <span className="row-cat">{c.description||'—'}</span>
            <div className="row-actions">
              <button className="btn-edit" onClick={()=>startEdit(c)}>✏️</button>
              <button className="btn-del" onClick={()=>del(c.id,c.name,c.product_count)}>🗑️</button>
            </div>
          </div>
        ))}
        {cats.length===0&&<div className="empty-state">No categories.</div>}
      </div>
    </div>
  );
}

// ── Orders Manager ────────────────────────────────────────────
function OrdersManager() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    const p = filter!=='all' ? {status:filter} : {};
    api.getAllOrders(p).then(r=>setOrders(r.data)).catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  },[filter]);
  useEffect(()=>{ load(); },[load]);

  const updateStatus = async (num, status, payment_status) => {
    try { await api.updateOrderStatus(num, {status, payment_status}); toast.success('Updated'); load(); } catch(e) { toast.error(String(e)); }
  };

  const stColor = {placed:'#e9b84a',confirmed:'#2a9d8f',shipped:'#6d4c8e',delivered:'#22c55e',cancelled:'#ef4444'};
  const pyColor = {pending:'#e9b84a',pending_verification:'#f4845f',verified:'#2a9d8f',failed:'#ef4444'};

  const paidOrders = orders.filter(o=>o.status==='delivered');
  const revenue = paidOrders.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const upiPending = orders.filter(o=>o.payment_status==='pending_verification');

  return (
    <div className="admin-content">
      <div className="page-header"><h1>Orders</h1><p>{orders.length} total</p></div>

      <div className="stats-grid" style={{marginBottom:'1.5rem',gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card" style={{borderColor:'#2a9d8f'}}><div className="stat-icon" style={{background:'#e8f9f5'}}>💰</div><div className="stat-info"><div className="stat-num">Rs {revenue.toLocaleString()}</div><div className="stat-lbl">Revenue (delivered)</div></div></div>
        <div className="stat-card" style={{borderColor:'#f4845f'}}><div className="stat-icon" style={{background:'#fff0ec'}}>📱</div><div className="stat-info"><div className="stat-num">{upiPending.length}</div><div className="stat-lbl">UPI awaiting verify</div></div></div>
        <div className="stat-card" style={{borderColor:'#e9b84a'}}><div className="stat-icon" style={{background:'#fffbeb'}}>📦</div><div className="stat-info"><div className="stat-num">{orders.filter(o=>o.status==='placed').length}</div><div className="stat-lbl">New orders</div></div></div>
      </div>

      <div className="filter-tabs">
        {['all','placed','confirmed','shipped','delivered','cancelled'].map(f=>(
          <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-state">Loading…</div> : (
        <div className="queries-list">
          {orders.length===0&&<div className="empty-state">No orders found.</div>}
          {orders.map(o=>(
            <div key={o.id} className={`query-card ${expanded===o.id?'expanded':''}`}>
              <div className="query-card-header" onClick={()=>setExpanded(expanded===o.id?null:o.id)}>
                <div className="query-avatar-lg" style={{background:stColor[o.status]||'#ccc',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {o.order_number?.slice(-4)}
                </div>
                <div className="query-card-info">
                  <div className="query-card-name">#{o.order_number} — {o.delivery_name}</div>
                  <div className="query-card-meta">
                    📞 {o.delivery_phone} · 📍 {o.delivery_city}
                    {o.payment_method==='upi' && <span style={{marginLeft:8,color:'#6d4c8e'}}>📱 UPI</span>}
                    {o.payment_method==='cod' && <span style={{marginLeft:8,color:'#2a9d8f'}}>💵 COD</span>}
                  </div>
                  <div className="query-preview">
                    Rs {Number(o.total).toLocaleString()} · {(o.items||[]).filter(Boolean).length} item(s)
                  </div>
                </div>
                <div className="query-card-right">
                  <span className="status-badge" style={{background:stColor[o.status]+'20',color:stColor[o.status]}}>{o.status}</span>
                  <span className="status-badge" style={{background:pyColor[o.payment_status]+'20',color:pyColor[o.payment_status]||'#999',marginTop:4}}>{o.payment_status}</span>
                  <div className="query-date">{new Date(o.created_at).toLocaleDateString()}</div>
                  <span className="expand-arrow">{expanded===o.id?'▲':'▼'}</span>
                </div>
              </div>
              {expanded===o.id && (
                <div className="query-body">
                  <div className="query-full-msg">
                    <strong>Delivery:</strong>
                    <p>{o.delivery_address}, {o.delivery_city}</p>
                    {o.notes && <p><strong>Notes:</strong> {o.notes}</p>}
                    {o.upi_txn_id && <p><strong>UPI Txn ID:</strong> {o.upi_txn_id}</p>}
                    {o.upi_screenshot && (
                      <div style={{marginTop:8}}>
                        <strong>UPI Screenshot:</strong>
                        <img src={`/uploads/upi/${o.upi_screenshot}`} alt="UPI" style={{display:'block',maxWidth:240,marginTop:6,borderRadius:8,border:'1px solid #eee'}} />
                      </div>
                    )}
                    <div style={{marginTop:12}}>
                      <strong>Items:</strong>
                      {(o.items||[]).filter(Boolean).map(item=>(
                        <div key={item.id} style={{display:'flex',gap:8,alignItems:'center',marginTop:4,fontSize:13}}>
                          <span>{item.emoji||'📦'}</span>
                          <span>{item.product_name} × {item.quantity}</span>
                          <span style={{marginLeft:'auto',fontWeight:600}}>Rs {(item.price*item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="query-status-actions">
                    <span>Order status:</span>
                    {['placed','confirmed','shipped','delivered','cancelled'].map(s=>(
                      <button key={s} className={`status-btn ${o.status===s?'active':''}`} style={{'--clr':stColor[s]}} onClick={()=>updateStatus(o.order_number,s,undefined)}>{s}</button>
                    ))}
                  </div>
                  {o.payment_method==='upi' && (
                    <div className="query-status-actions" style={{marginTop:8}}>
                      <span>Payment:</span>
                      {['pending_verification','verified','failed'].map(s=>(
                        <button key={s} className={`status-btn ${o.payment_status===s?'active':''}`} style={{'--clr':pyColor[s]}} onClick={()=>updateStatus(o.order_number,undefined,s)}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Queries Manager ───────────────────────────────────────────
function QueriesManager() {
  const [queries, setQueries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    const p = filter!=='all' ? {status:filter} : {};
    api.getQueries(p).then(r=>setQueries(r.data)).catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  },[filter]);
  useEffect(()=>{ load(); },[load]);

  const changeStatus = async (id, status) => {
    try { await api.updateQueryStatus(id,status); toast.success(`Marked ${status}`); load(); } catch(e) { toast.error(String(e)); }
  };
  const sc = {new:'#f4845f',read:'#e9b84a',replied:'#2a9d8f'};

  return (
    <div className="admin-content">
      <div className="page-header"><h1>Customer Queries</h1></div>
      <div className="filter-tabs">
        {['all','new','read','replied'].map(f=>(
          <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
        ))}
      </div>
      {loading ? <div className="loading-state">Loading…</div> : (
        <div className="queries-list">
          {queries.length===0&&<div className="empty-state">No queries.</div>}
          {queries.map(q=>(
            <div key={q.id} className={`query-card ${expanded===q.id?'expanded':''}`}>
              <div className="query-card-header" onClick={()=>setExpanded(expanded===q.id?null:q.id)}>
                <div className="query-avatar-lg" style={{background:sc[q.status]||'#ccc'}}>{q.full_name[0].toUpperCase()}</div>
                <div className="query-card-info">
                  <div className="query-card-name">{q.full_name}</div>
                  <div className="query-card-meta">📧 {q.email}{q.phone&&` · 📞 ${q.phone}`}{q.category&&` · 🏷️ ${q.category}`}</div>
                  <div className="query-preview">{q.message.slice(0,100)}{q.message.length>100?'…':''}</div>
                </div>
                <div className="query-card-right">
                  <span className={`status-badge status-${q.status}`}>{q.status}</span>
                  <div className="query-date">{new Date(q.created_at).toLocaleDateString()}</div>
                  <span className="expand-arrow">{expanded===q.id?'▲':'▼'}</span>
                </div>
              </div>
              {expanded===q.id&&(
                <div className="query-body">
                  <div className="query-full-msg"><strong>Message:</strong><p>{q.message}</p></div>
                  <div className="query-status-actions">
                    <span>Status:</span>
                    {['new','read','replied'].map(s=>(
                      <button key={s} className={`status-btn ${q.status===s?'active':''}`} style={{'--clr':sc[s]}} onClick={()=>changeStatus(q.id,s)}>{s}</button>
                    ))}
                    <a href={`mailto:${q.email}?subject=Re: Your Query at Reasonable Store`} className="reply-btn">✉️ Reply</a>
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
  const [photos, setPhotos]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const load = ()=>{ api.getGallery().then(r=>setPhotos(r.data)).catch(()=>{}); };
  useEffect(()=>{ load(); },[]);
  const handleUpload = async e => {
    const files = e.target.files; if (!files.length) return;
    setUploading(true);
    const fd = new FormData(); [...files].forEach(f=>fd.append('photos',f));
    try { await api.uploadPhotos(fd); load(); toast.success(`📸 ${files.length} uploaded!`); }
    catch(e) { toast.error(String(e)); }
    finally { setUploading(false); e.target.value=''; }
  };
  const del = async id => {
    if (!window.confirm('Delete photo?')) return;
    try { await api.deleteGalleryPhoto(id); load(); toast.success('Deleted'); } catch(e) { toast.error(String(e)); }
  };
  return (
    <div className="admin-content">
      <div className="page-header"><h1>Gallery</h1><p>{photos.length} photos</p></div>
      <label className="upload-zone">
        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{display:'none'}} />
        <div className="upload-zone-inner">
          <span className="upload-zone-icon">📸</span>
          <div>{uploading?'⏳ Uploading…':'Click or drag photos to upload'}</div>
          <div className="upload-zone-sub">JPG, PNG, WEBP · Max 10 MB each</div>
        </div>
      </label>
      {photos.length===0&&<div className="empty-state" style={{marginTop:'2rem'}}>No photos yet.</div>}
      <div className="gallery-admin-grid">
        {photos.map(ph=>(
          <div key={ph.id} className="gallery-thumb">
            <img src={ph.url} alt={ph.label} />
            <div className="gallery-thumb-overlay">
              <div className="thumb-label">{ph.label||ph.original_name}</div>
              <button className="thumb-del" onClick={()=>del(ph.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(ADMIN_KEY));
  const [tab, setTab]       = useState('dashboard');
  const logout = () => { sessionStorage.removeItem(ADMIN_KEY); setAuthed(false); };
  if (!authed) return <Login onLogin={()=>setAuthed(true)} />;
  return (
    <div className="admin-shell">
      <Sidebar tab={tab} setTab={setTab} onLogout={logout} />
      <div className="admin-main">
        {tab==='dashboard'  && <Dashboard setTab={setTab} />}
        {tab==='products'   && <ProductsManager setTab={setTab} />}
        {tab==='add'        && <AddProduct setTab={setTab} />}
        {tab==='categories' && <CategoriesManager />}
        {tab==='orders'     && <OrdersManager />}
        {tab==='queries'    && <QueriesManager />}
        {tab==='gallery'    && <GalleryManager />}
      </div>
    </div>
  );
}
