import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import * as api from './api';
import './App.css';

// ── Cart Context ──────────────────────────────────────────────
const CartContext = createContext(null);
const SESSION_KEY = 'rs_session';

// generateUUID MUST be outside getSession — works with or without HTTPS
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = generateUUID(); localStorage.setItem(SESSION_KEY, s); }
  return s;
}

function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [count, setCount]   = useState(0);
  const sessionId = getSession();

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.getCart(sessionId);
      setItems(res.data); setTotal(res.total); setCount(res.count);
    } catch {}
  }, [sessionId]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = async (productId, name) => {
    try {
      await api.addToCart({ session_id: sessionId, product_id: productId, quantity: 1 });
      await fetchCart();
      toast.success(`🛒 ${name} added to cart!`);
    } catch (e) { toast.error(String(e)); }
  };

  const removeItem = async (id) => {
    try { await api.removeFromCart(id); await fetchCart(); } catch (e) { toast.error(String(e)); }
  };

  return (
    <CartContext.Provider value={{ items, total, count, addItem, removeItem, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
const useCart = () => useContext(CartContext);

// ── Navbar ───────────────────────────────────────────────────
function Navbar() {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">Reasonable<span>Store</span></Link>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
        <li><Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link></li>
        <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
      </ul>
      <div className="nav-right">
        <button className="cart-btn" onClick={() => nav('/cart')}>
          🛒 <span className="cart-badge">{count}</span>
        </button>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>
    </nav>
  );
}

// ── Home Page ────────────────────────────────────────────────
function Home() {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const nav = useNavigate();
  const { addItem } = useCart();

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
            <div key={c.id} className={`cat-card c${(i % 8) + 1}`}
              onClick={() => nav(`/products?category=${c.slug}`)}>
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
        <div className="prod-grid">
          {featured.map(p => (
            <ProductCard key={p.id} product={p} onAdd={addItem} />
          ))}
        </div>
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
            <div key={title} className="why-card">
              <span className="why-icon">{icon}</span>
              <h4>{title}</h4><p>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Product Card ─────────────────────────────────────────────
function ProductCard({ product: p, onAdd }) {
  return (
    <div className="prod-card">
      <div className="prod-img" style={{ background: p.bg_color }}>
        <span>{p.emoji}</span>
        {p.badge && <span className="prod-badge">{p.badge}</span>}
      </div>
      <div className="prod-body">
        <div className="prod-cat">{p.category_name || p.category_slug}</div>
        <div className="prod-name">{p.name}</div>
        <div>
          <span className="prod-price">Rs {Number(p.price).toLocaleString()}</span>
          {p.original_price && <span className="prod-old">Rs {Number(p.original_price).toLocaleString()}</span>}
        </div>
        <div className="prod-actions">
          <button className="btn-cart" onClick={() => onAdd(p.id, p.name)}>Add to Cart</button>
          <button className="btn-wish" title="Wishlist">♡</button>
        </div>
      </div>
    </div>
  );
}

// ── Products Page ────────────────────────────────────────────
function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const { addItem } = useCart();
  const category = searchParams.get('category') || 'all';

  useEffect(() => {
    api.getCategories().then(r => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (category && category !== 'all') params.category = category;
    if (search) params.search = search;
    api.getProducts(params)
      .then(r => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <section className="products-section page-section">
      <div className="section-label">Shop</div>
      <div className="section-title">All Products</div>
      <input className="search-input" placeholder="🔍 Search products..."
        value={search} onChange={e => setSearch(e.target.value)} />
      <div className="prod-filter">
        {[{ slug: 'all', name: 'All' }, ...cats].map(c => (
          <button key={c.slug} className={`filter-btn ${category === c.slug ? 'active' : ''}`}
            onClick={() => setSearchParams(c.slug === 'all' ? {} : { category: c.slug })}>
            {c.icon && c.slug !== 'all' ? `${c.icon} ` : ''}{c.name}
          </button>
        ))}
      </div>
      {loading ? <div className="loader">Loading products…</div> : (
        products.length === 0
          ? <div className="empty">No products found.</div>
          : <div className="prod-grid">
              {products.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}
            </div>
      )}
    </section>
  );
}

// ── Gallery Page ─────────────────────────────────────────────
function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = () => api.getGallery().then(r => setPhotos(r.data)).catch(() => {});
  useEffect(() => { fetchPhotos(); }, []);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    [...files].forEach(f => fd.append('photos', f));
    try {
      await api.uploadPhotos(fd);
      await fetchPhotos();
      toast.success(`📸 ${files.length} photo(s) uploaded!`);
    } catch (err) { toast.error(String(err)); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const defaultPhotos = [
    { id: 'd1', url: null, label: 'Store Front',      emoji: '🛒', bg: 'linear-gradient(135deg,#fde8e8,#fdd5b1)' },
    { id: 'd2', url: null, label: 'Toiletries Aisle', emoji: '🧴', bg: 'linear-gradient(135deg,#d4f1e4,#b3e8d4)' },
    { id: 'd3', url: null, label: 'Clothing Section', emoji: '👗', bg: 'linear-gradient(135deg,#ede8f9,#ddd3f5)' },
    { id: 'd4', url: null, label: 'Beauty Corner',    emoji: '💄', bg: 'linear-gradient(135deg,#fff3cd,#ffe0a0)' },
    { id: 'd5', url: null, label: 'Toys Section',     emoji: '🧸', bg: 'linear-gradient(135deg,#fce7f3,#f8c5e3)' },
  ];

  const allPhotos = [...defaultPhotos, ...photos];

  return (
    <section className="gallery-section page-section">
      <div className="section-label center">Our Store</div>
      <div className="section-title center">Photo Gallery</div>
      <div className="gallery-grid">
        {allPhotos.map((ph, i) => (
          <div key={ph.id} className={`g-item ${i === 0 ? 'large' : ''}`}
               style={{ background: ph.bg || '#eee' }}>
            {ph.url
              ? <img src={ph.url} alt={ph.label} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
              : <span style={{ fontSize: i === 0 ? '7rem' : '4rem' }}>{ph.emoji}</span>
            }
            <div className="g-overlay"><span className="g-label">{ph.label || ph.original_name}</span></div>
          </div>
        ))}
      </div>
      <div className="upload-area">
        <div className="section-label center" style={{ marginTop: '3rem' }}>Owner Upload</div>
        <label className="upload-box">
          <div className="upload-icon">📸</div>
          <div className="upload-title">{uploading ? 'Uploading…' : 'Click to Upload Photos'}</div>
          <div className="upload-sub">JPG, PNG, WEBP up to 10 MB each</div>
          <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          <span className="upload-btn-label">{uploading ? '⏳ Please wait…' : 'Choose Photos'}</span>
        </label>
      </div>
    </section>
  );
}

// ── Contact Page ─────────────────────────────────────────────
function Contact() {
  const [form, setForm]       = useState({ full_name: '', email: '', phone: '', category: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.full_name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.'); return;
    }
    setLoading(true);
    try {
      await api.submitQuery(form);
      setDone(true);
      toast.success('✅ Query sent! We\'ll reply soon.');
    } catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <section className="contact-section page-section">
      <div className="section-label">Get In Touch</div>
      <div className="section-title">Send Us a Query</div>
      <div className="contact-wrap">
        <div className="contact-info">
          <h3>We'd Love to Hear From You!</h3>
          <p>Whether you have a product question, want a bulk order, or just want to say hello — we're a message away.</p>
          {[['📍','Reasonable Store, Main Market, Your City'],
            ['📞','+92 300 0000000'],
            ['📧','info@reasonablestore.pk'],
            ['⏰','Mon–Sat: 9AM – 9PM'],
          ].map(([icon, text]) => (
            <div key={text} className="info-row">
              <span className="info-icon">{icon}</span>
              <span className="info-text">{text}</span>
            </div>
          ))}
        </div>
        <div className="form-card">
          <h4>📬 Product Query Form</h4>
          {done ? (
            <div className="form-success">
              <span className="ok-icon">🎉</span>
              <div>Thank you! Your query has been received.</div>
              <p>We'll get back to you within 24 hours.</p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setDone(false)}>Send Another</button>
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
                  <option value="">— Select a category —</option>
                  {['Toiletries','Makeup & Beauty',"Men's Clothing","Women's Lingerie",'Toys & Games','Bags & Accessories','Home & Kitchen','Health & Wellness','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label>MESSAGE *</label><textarea name="message" rows={4} placeholder="Tell us what you're looking for…" value={form.message} onChange={change} /></div>
              <button className="form-submit" onClick={submit} disabled={loading}>
                {loading ? '⏳ Sending…' : '📨 Send Query'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Cart Page ────────────────────────────────────────────────
function Cart() {
  const { items, total, removeItem } = useCart();
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
                <span className="cart-emoji" style={{ background: item.bg_color }}>{item.emoji}</span>
                <div className="cart-details">
                  <div className="cart-name">{item.name}</div>
                  <div className="cart-meta">Qty: {item.quantity} × Rs {Number(item.price).toLocaleString()}</div>
                </div>
                <div className="cart-subtotal">Rs {(item.quantity * item.price).toLocaleString()}</div>
                <button className="cart-remove" onClick={() => removeItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <span>Total:</span>
            <span className="total-amount">Rs {Number(total).toLocaleString()}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/contact" className="btn-primary">Proceed to Query / Order →</Link>
          </div>
        </>
      )}
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <div className="logo">Reasonable<span>Store</span></div>
          <p>Your trusted one-stop shop for quality products at honest prices.</p>
        </div>
        <div className="footer-col"><h5>Categories</h5><ul>{['Toiletries','Makeup',"Men's Clothing",'Lingerie','Toys'].map(c=><li key={c}><Link to={`/products?category=${c.toLowerCase()}`}>{c}</Link></li>)}</ul></div>
        <div className="footer-col"><h5>Info</h5><ul>{['About Us','Privacy Policy','Return Policy','Delivery Info'].map(c=><li key={c}><a href="#top">{c}</a></li>)}</ul></div>
        <div className="footer-col"><h5>Contact</h5><ul><li><a href="mailto:info@reasonablestore.pk">📧 info@reasonablestore.pk</a></li><li><a href="tel:+923000000000">📞 +92 300 0000000</a></li></ul></div>
      </div>
      <div className="footer-bottom"><span>© 2025 Reasonable Store</span><span>Made with ❤️</span></div>
    </footer>
  );
}

// ── App Root ─────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif" } }} />
        <Navbar />
        <main>
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/gallery"  element={<Gallery />} />
            <Route path="/contact"  element={<Contact />} />
            <Route path="/cart"     element={<Cart />} />
          </Routes>
        </main>
        <Footer />
      </CartProvider>
    </BrowserRouter>
  );
}
