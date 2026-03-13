import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import * as api from './api';
import Admin from './Admin';
import './App.css';

// ─────────────────────────────────────────────────────────────
// CART CONTEXT
// ─────────────────────────────────────────────────────────────
const CartContext = createContext(null);
const SESSION_KEY = 'rs_session';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function getSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = generateUUID(); localStorage.setItem(SESSION_KEY, s); }
  return s;
}

function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const sessionId = getSession();

  const fetchCart = useCallback(async () => {
    try { const r = await api.getCart(sessionId); setItems(r.data); setTotal(r.total); setCount(r.count); } catch {}
  }, [sessionId]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = async (productId, name) => {
    try { await api.addToCart({ session_id: sessionId, product_id: productId, quantity: 1 }); await fetchCart(); toast.success(`🛒 ${name} added!`); }
    catch (e) { toast.error(String(e)); }
  };
  const removeItem = async (id) => {
    try { await api.removeFromCart(id); await fetchCart(); } catch (e) { toast.error(String(e)); }
  };

  return (
    <CartContext.Provider value={{ items, total, count, sessionId, addItem, removeItem, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
const useCart = () => useContext(CartContext);

// ─────────────────────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rs_auth_token');
    if (!token) { setLoading(false); return; }
    api.getMe().then(r => setCustomer(r.customer)).catch(() => localStorage.removeItem('rs_auth_token')).finally(() => setLoading(false));
  }, []);

  const signIn = async (data) => {
    const r = await api.login(data);
    localStorage.setItem('rs_auth_token', r.token);
    setCustomer(r.customer);
    return r;
  };

  const signUp = async (data) => {
    const r = await api.register(data);
    localStorage.setItem('rs_auth_token', r.token);
    setCustomer(r.customer);
    return r;
  };

  const signOut = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem('rs_auth_token');
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    try { const r = await api.getMe(); setCustomer(r.customer); } catch {}
  };

  return (
    <AuthContext.Provider value={{ customer, loading, signIn, signUp, signOut, setCustomer, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}
const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────
function Navbar() {
  const { count } = useCart();
  const { customer, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const nav = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">Reasonable<span>Store</span></Link>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
        <li><Link to="/gallery"  onClick={() => setMenuOpen(false)}>Gallery</Link></li>
        <li><Link to="/contact"  onClick={() => setMenuOpen(false)}>Contact</Link></li>
      </ul>
      <div className="nav-right">
        <button className="cart-btn" onClick={() => nav('/cart')}>🛒 <span className="cart-badge">{count}</span></button>
        {customer ? (
          <div className="user-menu-wrap">
            <button className="user-btn" onClick={() => setUserMenu(!userMenu)}>
              <span className="user-avatar">{customer.full_name[0].toUpperCase()}</span>
              <span className="user-name-short">{customer.full_name.split(' ')[0]}</span> ▾
            </button>
            {userMenu && (
              <div className="user-dropdown" onClick={() => setUserMenu(false)}>
                <Link to="/account">👤 My Account</Link>
                <Link to="/orders">📦 My Orders</Link>
                <button onClick={signOut}>🚪 Logout</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="login-nav-btn">Login</Link>
        )}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────
function Home() {
  const [cats, setCats]       = useState([]);
  const [featured, setFeatured] = useState([]);
  const { addItem }           = useCart();
  const nav                   = useNavigate();

  useEffect(() => {
    api.getCategories().then(r => setCats(r.data)).catch(() => {});
    api.getProducts({ featured: true, limit: 8 }).then(r => setFeatured(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <div className="hero-badge">✨ New Arrivals Every Week</div>
          <h1>Everything You Need,<br /><em>Reasonably</em> Priced</h1>
          <p>From daily toiletries to branded fashion — thousands of quality products for the whole family.</p>
          <div className="hero-btns">
            <Link to="/products" className="btn-primary">Explore Products</Link>
            <Link to="/contact" className="btn-secondary">Send a Query</Link>
          </div>
          <div className="hero-stats">
            <div><div className="stat-val">500+</div><div className="stat-label">Products</div></div>
            <div><div className="stat-val">8+</div><div className="stat-label">Categories</div></div>
            <div><div className="stat-val">★ 4.9</div><div className="stat-label">Rating</div></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="main-card">
            <div className="main-card-icon">🛍️</div>
            <h3>Reasonable Store</h3>
            <p>Your family's one-stop shop for quality &amp; value</p>
          </div>
          <div className="float-chip" style={{ top: 30, right: -10 }}>🧴 Toiletries <span style={{ color: '#2a9d8f', fontWeight: 700 }}>New</span></div>
          <div className="float-chip" style={{ bottom: 90, left: -20 }}>👗 Branded Clothing ✨</div>
          <div className="float-chip" style={{ top: 130, left: -30 }}>💄 Makeup &amp; Beauty</div>
        </div>
      </section>

      <section className="categories-section" id="categories">
        <div className="section-label">Browse</div>
        <div className="section-title">All Categories</div>
        <div className="cat-grid">
          {cats.map((c, i) => (
            <div key={c.id} className={`cat-card c${(i % 8) + 1}`} onClick={() => nav(`/products?category=${c.slug}`)}>
              <span className="cat-icon">{c.icon}</span>
              <div className="cat-name">{c.name}</div>
              <div className="cat-count">{c.product_count} items</div>
            </div>
          ))}
        </div>
      </section>

      <section className="products-section">
        <div className="section-label">Featured</div>
        <div className="section-title">Top Picks</div>
        <div className="prod-grid">{featured.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}</div>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/products" className="btn-primary">View All Products →</Link>
        </div>
      </section>

      <section className="whyus-section">
        <div className="section-label center">Why Choose Us</div>
        <div className="section-title center">The Reasonable Difference</div>
        <div className="why-grid">
          {[['💰','Best Prices','We source directly — fair, transparent pricing.'],
            ['✅','100% Authentic','Every branded item verified genuine.'],
            ['🚀','Fast Delivery','Same or next-day delivery available.'],
            ['💬','24/7 Support','Always here to help via email or phone.'],
            ['🎁','Gift Wrapping','Complimentary gift packaging on request.'],
            ['🔄','Easy Returns','Return within 7 days, no questions asked.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="why-card"><span className="why-icon">{icon}</span><h4>{title}</h4><p>{desc}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────────────────────
function ProductCard({ product: p, onAdd }) {
  return (
    <div className="prod-card">
      <div className="prod-img" style={{ background: p.bg_color }}>
        {p.image_url
          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span>{p.emoji}</span>}
        {p.badge && <span className="prod-badge">{p.badge}</span>}
      </div>
      <div className="prod-body">
        <div className="prod-name">{p.name}</div>
        <div className="prod-desc">{p.description}</div>
        <div className="prod-footer">
          <div className="prod-price">
            <span className="price-current">Rs {Number(p.price).toLocaleString()}</span>
            {p.original_price && <span className="price-old">Rs {Number(p.original_price).toLocaleString()}</span>}
          </div>
          <button className="add-btn" onClick={() => onAdd(p.id, p.name)}>+ Add</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS PAGE
// ─────────────────────────────────────────────────────────────
function Products() {
  const [products, setProducts] = useState([]);
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [searchParams]          = useSearchParams();
  const [activecat, setActiveCat] = useState(searchParams.get('category') || 'all');
  const { addItem }             = useCart();

  useEffect(() => { api.getCategories().then(r => setCats(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activecat !== 'all') params.category = activecat;
    if (search) params.search = search;
    api.getProducts(params).then(r => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [activecat, search]);

  return (
    <section className="products-section page-section">
      <div className="section-label">Shop</div>
      <div className="section-title">All Products</div>
      <input className="search-input" placeholder="🔍 Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="prod-filter">
        <button className={`filter-btn ${activecat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>All</button>
        {cats.map(c => (
          <button key={c.id} className={`filter-btn ${activecat === c.slug ? 'active' : ''}`} onClick={() => setActiveCat(c.slug)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      {loading ? <div className="loading-state">Loading products…</div> : (
        <div className="prod-grid">
          {products.length === 0 && <div className="empty-state">No products found.</div>}
          {products.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// GALLERY PAGE
// ─────────────────────────────────────────────────────────────
function Gallery() {
  const [photos, setPhotos]     = useState([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { api.getGallery().then(r => setPhotos(r.data)).catch(() => {}); }, []);
  const handleUpload = async (e) => {
    const files = e.target.files; if (!files.length) return;
    setUploading(true);
    const fd = new FormData(); [...files].forEach(f => fd.append('photos', f));
    try { await api.uploadPhotos(fd); const r = await api.getGallery(); setPhotos(r.data); toast.success('📸 Uploaded!'); }
    catch (err) { toast.error(String(err)); }
    finally { setUploading(false); e.target.value = ''; }
  };
  const defaultPhotos = [
    { id:'d1', emoji:'🧴', bg:'#fde8e8', label:'Toiletries Collection' },
    { id:'d2', emoji:'💄', bg:'#fde8f4', label:'Makeup & Beauty' },
    { id:'d3', emoji:'👔', bg:'#e8edf9', label:"Men's Fashion" },
    { id:'d4', emoji:'🧸', bg:'#fff8e8', label:'Toys & Games' },
    { id:'d5', emoji:'👜', bg:'#fdf4e8', label:'Bags & Accessories' },
    { id:'d6', emoji:'🏠', bg:'#e8f9fd', label:'Home & Kitchen' },
  ];
  const allPhotos = [...defaultPhotos, ...photos];
  return (
    <section className="gallery-section page-section">
      <div className="section-label center">Our Store</div>
      <div className="section-title center">Photo Gallery</div>
      <div className="gallery-grid">
        {allPhotos.map((ph, i) => (
          <div key={ph.id} className={`g-item ${i === 0 ? 'large' : ''}`} style={{ background: ph.bg || '#eee' }}>
            {ph.url
              ? <img src={ph.url} alt={ph.label} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize: i === 0 ? '7rem' : '4rem' }}>{ph.emoji}</span>}
            <div className="g-overlay"><span className="g-label">{ph.label || ph.original_name}</span></div>
          </div>
        ))}
      </div>
      <div className="upload-area">
        <div className="section-label center" style={{ marginTop: '3rem' }}>Owner Upload</div>
        <label className="upload-box">
          <div className="upload-icon">📸</div>
          <div className="upload-title">{uploading ? 'Uploading…' : 'Click to Upload Photos'}</div>
          <div className="upload-sub">JPG, PNG, WEBP up to 10 MB</div>
          <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          <span className="upload-btn-label">{uploading ? '⏳ Please wait…' : 'Choose Photos'}</span>
        </label>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm]   = useState({ full_name:'', email:'', phone:'', category:'', message:'' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState(false);
  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const submit = async () => {
    if (!form.full_name || !form.email || !form.message) { toast.error('Please fill required fields.'); return; }
    setLoading(true);
    try { await api.submitQuery(form); setDone(true); toast.success('✅ Query sent!'); }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };
  return (
    <section className="contact-section page-section">
      <div className="section-label">Get In Touch</div>
      <div className="section-title">Send Us a Query</div>
      <div className="contact-wrap">
        <div className="contact-info">
          <h3>We'd Love to Hear From You!</h3>
          <p>Whether you have a product question, want a bulk order, or just want to say hello.</p>
          {[['📍','Reasonable Store, Main Market, Your City'],['📞','+92 300 0000000'],['📧','info@reasonablestore.pk'],['⏰','Mon–Sat: 9AM – 9PM']].map(([icon, text]) => (
            <div key={text} className="info-row"><span className="info-icon">{icon}</span><span className="info-text">{text}</span></div>
          ))}
        </div>
        <div className="form-card">
          <h4>📬 Product Query Form</h4>
          {done ? (
            <div className="form-success">
              <span className="ok-icon">🎉</span>
              <div>Thank you! Your query has been received.</div>
              <p>We'll get back to you within 24 hours.</p>
              <button className="btn-primary" style={{ marginTop:'1rem' }} onClick={() => setDone(false)}>Send Another</button>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group"><label>FULL NAME *</label><input name="full_name" placeholder="Your name" value={form.full_name} onChange={change} /></div>
                <div className="form-group"><label>PHONE</label><input name="phone" placeholder="+92 xxx xxxxxxx" value={form.phone} onChange={change} /></div>
              </div>
              <div className="form-group"><label>EMAIL *</label><input name="email" type="email" placeholder="you@email.com" value={form.email} onChange={change} /></div>
              <div className="form-group">
                <label>CATEGORY</label>
                <select name="category" value={form.category} onChange={change}>
                  <option value="">— Select —</option>
                  {['Toiletries','Makeup & Beauty',"Men's Clothing","Women's Lingerie",'Toys & Games','Bags & Accessories','Home & Kitchen','Health & Wellness','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label>MESSAGE *</label><textarea name="message" rows={4} placeholder="Tell us what you're looking for…" value={form.message} onChange={change} /></div>
              <button className="form-submit" onClick={submit} disabled={loading}>{loading ? '⏳ Sending…' : '📨 Send Query'}</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// CART PAGE
// ─────────────────────────────────────────────────────────────
function Cart() {
  const { items, total, removeItem } = useCart();
  const nav = useNavigate();
  const deliveryFee = total > 0 && total < 2000 ? 150 : 0;

  return (
    <section className="cart-section page-section">
      <div className="section-title">🛒 Your Cart</div>
      {items.length === 0 ? (
        <div className="empty"><p>Your cart is empty.</p><Link to="/products" className="btn-primary">Start Shopping</Link></div>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-emoji" style={{ background: item.bg_color }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }} />
                    : item.emoji}
                </div>
                <div className="cart-details">
                  <div className="cart-name">{item.name}</div>
                  <div className="cart-meta">Qty: {item.quantity} × Rs {Number(item.price).toLocaleString()}</div>
                </div>
                <div className="cart-subtotal">Rs {(item.quantity * item.price).toLocaleString()}</div>
                <button className="cart-remove" onClick={() => removeItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="cart-sum-row"><span>Subtotal</span><span>Rs {Number(total).toLocaleString()}</span></div>
            <div className="cart-sum-row"><span>Delivery</span><span>{deliveryFee === 0 ? <span style={{ color:'#2a9d8f' }}>FREE ✓</span> : `Rs ${deliveryFee}`}</span></div>
            {deliveryFee > 0 && <div className="free-delivery-hint">Add Rs {(2000-total).toLocaleString()} more for free delivery</div>}
            <div className="cart-sum-row total-row"><span>Total</span><span className="total-amount">Rs {(Number(total)+deliveryFee).toLocaleString()}</span></div>
          </div>
          <div style={{ textAlign:'center', marginTop:'1.5rem' }}>
            <button className="btn-primary" style={{ border:'none', cursor:'pointer', fontSize:'1rem' }} onClick={() => nav('/checkout')}>
              Proceed to Checkout →
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN / REGISTER PAGE
// ─────────────────────────────────────────────────────────────
function LoginPage() {
  const [mode, setMode]   = useState('login');   // login | register
  const [form, setForm]   = useState({ full_name:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, customer } = useAuth();
  const nav = useNavigate();

  useEffect(() => { if (customer) nav('/account'); }, [customer, nav]);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn({ email: form.email, password: form.password });
        toast.success('👋 Welcome back!');
        nav('/account');
      } else {
        await signUp(form);
        toast.success('🎉 Account created!');
        nav('/account');
      }
    } catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <section className="auth-section page-section">
      <div className="auth-card">
        <div className="auth-logo">🛍️</div>
        <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p>{mode === 'login' ? 'Login to your Reasonable Store account' : 'Join thousands of happy shoppers'}</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        {mode === 'register' && (
          <div className="form-group">
            <label>FULL NAME *</label>
            <input name="full_name" placeholder="Your full name" value={form.full_name} onChange={change} />
          </div>
        )}
        <div className="form-group">
          <label>EMAIL *</label>
          <input name="email" type="email" placeholder="you@email.com" value={form.email} onChange={change} />
        </div>
        <div className="form-group">
          <label>PASSWORD *</label>
          <input name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={change} />
        </div>
        {mode === 'register' && (
          <div className="form-group">
            <label>PHONE <span className="optional-lbl">(optional)</span></label>
            <input name="phone" placeholder="+92 xxx xxxxxxx" value={form.phone} onChange={change} />
          </div>
        )}
        <button className="auth-submit" onClick={submit} disabled={loading}>
          {loading ? '⏳ Please wait…' : mode === 'login' ? 'Login →' : 'Create Account →'}
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// ACCOUNT PAGE  (profile + address + password + orders)
// ─────────────────────────────────────────────────────────────
function AccountPage() {
  const { customer, signOut, refreshCustomer } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]     = useState('profile');
  const [profile, setProfile] = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { if (!customer) nav('/login'); }, [customer, nav]);
  useEffect(() => { if (customer) setProfile({ ...customer }); }, [customer]);

  if (!customer || !profile) return null;

  const change = e => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(profile);
      await refreshCustomer();
      toast.success('✅ Profile updated!');
    } catch (e) { toast.error(String(e)); }
    finally { setSaving(false); }
  };

  const PROVINCES = ['Punjab','Sindh','Khyber Pakhtunkhwa','Balochistan','Gilgit-Baltistan','Azad Kashmir','Islamabad'];

  return (
    <section className="account-section page-section">
      <div className="account-header">
        <div className="account-avatar">{customer.full_name[0].toUpperCase()}</div>
        <div>
          <h2>{customer.full_name}</h2>
          <p>{customer.email}</p>
          {customer.city && <p className="account-city">📍 {customer.city}{customer.province ? `, ${customer.province}` : ''}</p>}
        </div>
        <button className="btn-secondary" style={{ marginLeft:'auto' }} onClick={signOut}>Logout</button>
      </div>

      <div className="account-tabs">
        {[['profile','👤 Profile'],['address','📍 Address'],['password','🔒 Password'],['orders','📦 Orders']].map(([id,label]) => (
          <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="account-form">
          <div className="form-row">
            <div className="form-group"><label>FULL NAME</label><input name="full_name" value={profile.full_name||''} onChange={change} /></div>
            <div className="form-group"><label>PHONE</label><input name="phone" value={profile.phone||''} onChange={change} placeholder="+92 xxx xxxxxxx" /></div>
          </div>
          <div className="form-group"><label>EMAIL (cannot change)</label><input value={profile.email} disabled style={{ opacity:.6 }} /></div>
          <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving?'Saving…':'Save Profile'}</button>
        </div>
      )}

      {tab === 'address' && (
        <div className="account-form">
          <p className="account-hint">💡 Save your address here — it will auto-fill at checkout.</p>
          <div className="form-group"><label>ADDRESS LINE 1</label><input name="address_line1" value={profile.address_line1||''} onChange={change} placeholder="House/Flat no., Street name" /></div>
          <div className="form-group"><label>ADDRESS LINE 2 <span className="optional-lbl">(optional)</span></label><input name="address_line2" value={profile.address_line2||''} onChange={change} placeholder="Area, Landmark" /></div>
          <div className="form-row">
            <div className="form-group"><label>CITY</label><input name="city" value={profile.city||''} onChange={change} placeholder="Lahore" /></div>
            <div className="form-group">
              <label>PROVINCE</label>
              <select name="province" value={profile.province||''} onChange={change}>
                <option value="">— Select —</option>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>POSTAL CODE <span className="optional-lbl">(optional)</span></label><input name="postal_code" value={profile.postal_code||''} onChange={change} placeholder="54000" /></div>
            <div className="form-group"><label>COUNTRY</label><input name="country" value={profile.country||'Pakistan'} onChange={change} /></div>
          </div>
          <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving?'Saving…':'Save Address'}</button>
        </div>
      )}

      {tab === 'password' && <PasswordChange />}
      {tab === 'orders'   && <MyOrders />}
    </section>
  );
}

function PasswordChange() {
  const [form, setForm]   = useState({ current_password:'', new_password:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const save = async () => {
    if (form.new_password !== form.confirm) { toast.error('New passwords do not match'); return; }
    setSaving(true);
    try { await api.updatePassword({ current_password: form.current_password, new_password: form.new_password }); toast.success('✅ Password changed'); setForm({ current_password:'', new_password:'', confirm:'' }); }
    catch (e) { toast.error(String(e)); }
    finally { setSaving(false); }
  };
  return (
    <div className="account-form">
      <div className="form-group"><label>CURRENT PASSWORD</label><input name="current_password" type="password" value={form.current_password} onChange={change} /></div>
      <div className="form-group"><label>NEW PASSWORD</label><input name="new_password" type="password" value={form.new_password} onChange={change} /></div>
      <div className="form-group"><label>CONFIRM NEW PASSWORD</label><input name="confirm" type="password" value={form.confirm} onChange={change} /></div>
      <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Change Password'}</button>
    </div>
  );
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMyOrders().then(r => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const statusColor = { placed:'#e9b84a', confirmed:'#2a9d8f', shipped:'#6d4c8e', delivered:'#22c55e', cancelled:'#ef4444' };
  if (loading) return <div className="loading-state">Loading orders…</div>;
  if (!orders.length) return <div className="empty-state">No orders yet. <Link to="/products">Shop now →</Link></div>;
  return (
    <div className="my-orders">
      {orders.map(o => (
        <div key={o.id} className="my-order-card">
          <div className="my-order-header">
            <div><div className="my-order-num">#{o.order_number}</div><div className="my-order-date">{new Date(o.created_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</div></div>
            <span className="my-order-status" style={{ background: statusColor[o.status]+'20', color: statusColor[o.status] }}>{o.status}</span>
          </div>
          <div className="my-order-items">
            {(o.items||[]).filter(Boolean).map(item => (
              <div key={item.id} className="my-order-item">
                <span>{item.emoji||'📦'}</span>
                <span>{item.product_name} × {item.quantity}</span>
                <span>Rs {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="my-order-footer">
            <span>Payment: <strong>{o.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI Transfer'}</strong></span>
            <span className="my-order-total">Total: Rs {Number(o.total).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT PAGE  (COD + UPI)
// ─────────────────────────────────────────────────────────────
const UPI_ID   = process.env.REACT_APP_UPI_ID   || 'reasonablestore@upi';
const UPI_NAME = process.env.REACT_APP_UPI_NAME || 'Reasonable Store';

function Checkout() {
  const { items, total, sessionId, fetchCart } = useCart();
  const { customer } = useAuth();
  const nav = useNavigate();

  const deliveryFee = total > 0 && total < 2000 ? 150 : 0;
  const grandTotal  = total + deliveryFee;

  const [method, setMethod]   = useState('cod');
  const [step, setStep]       = useState(1);   // 1=details, 2=payment, 3=done
  const [placing, setPlacing] = useState(false);
  const [order, setOrder]     = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  const [form, setForm] = useState({
    delivery_name:    customer?.full_name    || '',
    delivery_phone:   customer?.phone        || '',
    delivery_address: customer?.address_line1
      ? `${customer.address_line1}${customer.address_line2 ? ', '+customer.address_line2 : ''}`
      : '',
    delivery_city:    customer?.city         || '',
    upi_txn_id:       '',
    notes:            '',
  });

  useEffect(() => { if (items.length === 0 && step === 1) nav('/cart'); }, [items, nav, step]);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleScreenshot = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const placeOrder = async () => {
    if (!form.delivery_name || !form.delivery_phone || !form.delivery_address || !form.delivery_city) {
      toast.error('Please fill all delivery details'); return;
    }
    if (method === 'upi' && !form.upi_txn_id) {
      toast.error('Please enter your UPI transaction ID'); return;
    }
    setPlacing(true);
    try {
      const fd = new FormData();
      fd.append('session_id', sessionId);
      if (customer?.id) fd.append('customer_id', customer.id);
      fd.append('delivery_name',    form.delivery_name);
      fd.append('delivery_phone',   form.delivery_phone);
      fd.append('delivery_address', form.delivery_address);
      fd.append('delivery_city',    form.delivery_city);
      fd.append('payment_method',   method);
      fd.append('notes',            form.notes);
      if (method === 'upi') fd.append('upi_txn_id', form.upi_txn_id);
      if (screenshot)        fd.append('upi_screenshot', screenshot);
      const r = await api.placeOrder(fd);
      setOrder(r.order);
      setStep(3);
      await fetchCart();
      toast.success('🎉 Order placed!');
    } catch (e) { toast.error(String(e)); }
    finally { setPlacing(false); }
  };

  if (step === 3 && order) return (
    <section className="checkout-section page-section">
      <div className="order-success">
        <div className="success-icon">🎉</div>
        <h2>Order Placed!</h2>
        <div className="order-num">#{order.order_number}</div>
        <p>{order.payment_method === 'cod'
          ? `Pay Rs ${Number(order.total).toLocaleString()} in cash when your order arrives.`
          : `We'll verify your UPI payment and confirm within 1–2 hours.`}</p>
        <div className="order-details-box">
          <div className="od-row"><span>Subtotal</span><span>Rs {Number(order.subtotal).toLocaleString()}</span></div>
          <div className="od-row"><span>Delivery</span><span>{order.delivery_fee > 0 ? `Rs ${order.delivery_fee}` : 'FREE ✓'}</span></div>
          <div className="od-row od-total"><span>Total</span><span>Rs {Number(order.total).toLocaleString()}</span></div>
          <div className="od-row"><span>Payment</span><span>{order.payment_method === 'cod' ? '💵 Cash on Delivery' : '📱 UPI Transfer'}</span></div>
          <div className="od-row"><span>Delivering to</span><span>{order.delivery_city}</span></div>
        </div>
        <div className="success-btns">
          <button className="btn-primary" onClick={() => nav('/orders')}>View My Orders</button>
          <button className="btn-secondary" onClick={() => nav('/products')}>Continue Shopping</button>
        </div>
      </div>
    </section>
  );

  return (
    <section className="checkout-section page-section">
      <div className="section-title">Checkout</div>
      <div className="checkout-layout">
        {/* LEFT: form */}
        <div className="checkout-form">
          {/* Step 1: Delivery details */}
          <div className="checkout-block">
            <div className="checkout-block-title">📍 Delivery Details</div>
            <div className="form-row">
              <div className="form-group"><label>FULL NAME *</label><input name="delivery_name" value={form.delivery_name} onChange={change} placeholder="Recipient name" /></div>
              <div className="form-group"><label>PHONE *</label><input name="delivery_phone" value={form.delivery_phone} onChange={change} placeholder="+92 xxx xxxxxxx" /></div>
            </div>
            <div className="form-group"><label>ADDRESS *</label><input name="delivery_address" value={form.delivery_address} onChange={change} placeholder="House no., Street, Area" /></div>
            <div className="form-row">
              <div className="form-group"><label>CITY *</label><input name="delivery_city" value={form.delivery_city} onChange={change} placeholder="Lahore" /></div>
            </div>
            <div className="form-group"><label>ORDER NOTES <span className="optional-lbl">(optional)</span></label><input name="notes" value={form.notes} onChange={change} placeholder="Any special instructions…" /></div>
          </div>

          {/* Step 2: Payment method */}
          <div className="checkout-block">
            <div className="checkout-block-title">💳 Payment Method</div>
            <div className="payment-methods">
              <label className={`payment-option ${method==='cod'?'selected':''}`}>
                <input type="radio" name="method" value="cod" checked={method==='cod'} onChange={()=>setMethod('cod')} />
                <span className="pm-icon">💵</span>
                <div className="pm-info"><div className="pm-title">Cash on Delivery</div><div className="pm-desc">Pay when your order arrives</div></div>
              </label>
              <label className={`payment-option ${method==='upi'?'selected':''}`}>
                <input type="radio" name="method" value="upi" checked={method==='upi'} onChange={()=>setMethod('upi')} />
                <span className="pm-icon">📱</span>
                <div className="pm-info"><div className="pm-title">UPI Transfer</div><div className="pm-desc">Pay via any UPI app (GPay, PhonePe, Paytm)</div></div>
              </label>
            </div>

            {method === 'upi' && (
              <div className="upi-instructions">
                <div className="upi-step">
                  <div className="upi-step-num">1</div>
                  <div>
                    <strong>Send Rs {grandTotal.toLocaleString()} to:</strong>
                    <div className="upi-id-box">
                      <span className="upi-id">{UPI_ID}</span>
                      <button className="copy-btn" type="button" onClick={()=>{navigator.clipboard.writeText(UPI_ID);toast.success('UPI ID copied!');}}>Copy</button>
                    </div>
                    <div className="upi-name">Account name: <strong>{UPI_NAME}</strong></div>
                  </div>
                </div>
                <div className="upi-step">
                  <div className="upi-step-num">2</div>
                  <div style={{ flex:1 }}>
                    <strong>Enter your transaction ID *</strong>
                    <input name="upi_txn_id" value={form.upi_txn_id} onChange={change}
                      placeholder="12-digit UTR / Transaction ID" className="upi-txn-input" />
                  </div>
                </div>
                <div className="upi-step">
                  <div className="upi-step-num">3</div>
                  <div style={{ flex:1 }}>
                    <strong>Upload screenshot <span className="optional-lbl">(optional but recommended)</span></strong>
                    <label className="screenshot-upload">
                      <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display:'none' }} />
                      {screenshotPreview
                        ? <img src={screenshotPreview} alt="screenshot" className="screenshot-preview" />
                        : <span>📸 Click to upload payment screenshot</span>}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: order summary */}
        <div className="checkout-summary">
          <div className="checkout-block">
            <div className="checkout-block-title">🧾 Order Summary</div>
            {items.map(item => (
              <div key={item.id} className="summary-item">
                <span className="summary-emoji" style={{ background:item.bg_color }}>
                  {item.image_url
                    ? <img src={item.image_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:6 }} />
                    : item.emoji}
                </span>
                <span className="summary-name">{item.name} <span className="summary-qty">×{item.quantity}</span></span>
                <span className="summary-price">Rs {(item.price*item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="summary-divider" />
            <div className="summary-row"><span>Subtotal</span><span>Rs {Number(total).toLocaleString()}</span></div>
            <div className="summary-row"><span>Delivery</span><span>{deliveryFee===0?<span style={{color:'#2a9d8f'}}>FREE</span>:`Rs ${deliveryFee}`}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>Rs {grandTotal.toLocaleString()}</span></div>
            <button className="place-order-btn" onClick={placeOrder} disabled={placing}>
              {placing ? '⏳ Placing order…' : `Place Order — Rs ${grandTotal.toLocaleString()}`}
            </button>
            <div className="checkout-note">
              {method === 'cod' ? '💵 Pay cash when your order arrives' : '📱 We verify UPI payment within 1–2 hrs'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// ORDERS PAGE (customer's orders shortcut)
// ─────────────────────────────────────────────────────────────
function OrdersPage() {
  const { customer } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!customer) nav('/login'); }, [customer, nav]);
  if (!customer) return null;
  return (
    <section className="account-section page-section">
      <div className="section-title">📦 My Orders</div>
      <MyOrders />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <div className="logo">Reasonable<span>Store</span></div>
          <p>Your trusted one-stop shop for quality products at honest prices.</p>
        </div>
        <div className="footer-col"><h5>Categories</h5><ul>{['Toiletries','Makeup',"Men's Clothing",'Lingerie','Toys'].map(c=><li key={c}><Link to={`/products?category=${c.toLowerCase()}`}>{c}</Link></li>)}</ul></div>
        <div className="footer-col"><h5>My Account</h5><ul><li><Link to="/login">Login / Register</Link></li><li><Link to="/orders">My Orders</Link></li><li><Link to="/cart">Cart</Link></li></ul></div>
        <div className="footer-col"><h5>Contact</h5><ul><li><a href="mailto:info@reasonablestore.pk">📧 info@reasonablestore.pk</a></li><li><a href="tel:+923000000000">📞 +92 300 0000000</a></li></ul></div>
      </div>
      <div className="footer-bottom"><span>© 2025 Reasonable Store</span><span>Made with ❤️</span></div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="bottom-right" toastOptions={{ style: { fontFamily:"'DM Sans', sans-serif" } }} />
          <Navbar />
          <main>
            <Routes>
              <Route path="/"         element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/gallery"  element={<Gallery />} />
              <Route path="/contact"  element={<Contact />} />
              <Route path="/cart"     element={<Cart />} />
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/account"  element={<AccountPage />} />
              <Route path="/orders"   element={<OrdersPage />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin"    element={<Admin />} />
            </Routes>
          </main>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
