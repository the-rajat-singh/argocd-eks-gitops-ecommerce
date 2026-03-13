import React, {
  useState, useEffect, useCallback,
  createContext, useContext, useRef
} from 'react';
import {
  BrowserRouter, Routes, Route,
  Link, useNavigate, useSearchParams, useParams
} from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import * as api from './api';
import Admin from './Admin';
import './App.css';

// ═══════════════════════════════════════════════
// CONTEXTS
// ═══════════════════════════════════════════════

// — Cart —
const CartContext = createContext(null);
const SESSION_KEY = 'rs_session';
function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function getSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = genUUID(); localStorage.setItem(SESSION_KEY, s); }
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
  const addItem = async (productId, name, qty = 1) => {
    try {
      await api.addToCart({ session_id: sessionId, product_id: productId, quantity: qty });
      await fetchCart();
      toast.success(`🛒 ${name} added to cart!`, { duration: 1800 });
    } catch (e) { toast.error(String(e)); }
  };
  const removeItem = async (id) => { try { await api.removeFromCart(id); await fetchCart(); } catch (e) { toast.error(String(e)); } };
  return (
    <CartContext.Provider value={{ items, total, count, sessionId, addItem, removeItem, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
const useCart = () => useContext(CartContext);

// — Auth —
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    const t = localStorage.getItem('rs_auth_token');
    if (!t) { setLoading(false); return; }
    api.getMe().then(r => setCustomer(r.customer)).catch(() => localStorage.removeItem('rs_auth_token')).finally(() => setLoading(false));
  }, []);
  const signIn = async (d) => { const r = await api.login(d); localStorage.setItem('rs_auth_token', r.token); setCustomer(r.customer); return r; };
  const signUp = async (d) => { const r = await api.register(d); localStorage.setItem('rs_auth_token', r.token); setCustomer(r.customer); return r; };
  const signOut = async () => { try { await api.logout(); } catch {} localStorage.removeItem('rs_auth_token'); setCustomer(null); };
  const refreshCustomer = async () => { try { const r = await api.getMe(); setCustomer(r.customer); } catch {} };
  return (
    <AuthContext.Provider value={{ customer, loading, signIn, signUp, signOut, setCustomer, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}
const useAuth = () => useContext(AuthContext);

// — Wishlist —
const WishContext = createContext(null);
function WishProvider({ children }) {
  const [wished, setWished] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('rs_wishlist') || '[]')); } catch { return new Set(); }
  });
  const toggle = (id) => setWished(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    localStorage.setItem('rs_wishlist', JSON.stringify([...next]));
    return next;
  });
  return <WishContext.Provider value={{ wished, toggle }}>{children}</WishContext.Provider>;
}
const useWish = () => useContext(WishContext);

// — Theme —
const ThemeContext = createContext(null);
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('rs_theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('rs_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}
const useTheme = () => useContext(ThemeContext);

// ═══════════════════════════════════════════════
// STAR RATING
// ═══════════════════════════════════════════════
function Stars({ rating = 4.2, count }) {
  return (
    <div className="prod-rating">
      <div className="stars">
        {[1,2,3,4,5].map(i => <span key={i} className={`star ${i <= Math.round(rating) ? '' : 'empty'}`}>★</span>)}
      </div>
      <span className="rating-count">({count || Math.floor(Math.random()*400+20)})</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PRICE DISPLAY — strikethrough original, highlighted discounted
// ═══════════════════════════════════════════════
function PriceDisplay({ price, original, size = 'normal' }) {
  const discount = original && original > price
    ? Math.round((1 - price / original) * 100)
    : null;
  return (
    <div className="prod-price-wrap" style={size === 'large' ? { marginBottom: 0 } : {}}>
      <span className="price-current" style={size === 'large' ? { fontSize: '2rem' } : {}}>
        Rs {Number(price).toLocaleString()}
      </span>
      {original && original > price && (
        <span className="price-original">Rs {Number(original).toLocaleString()}</span>
      )}
      {discount && (
        <span className="price-save">{discount}% off</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════
function ProductCard({ product: p, onAdd, onQuickView }) {
  const { wished, toggle } = useWish();
  const [adding, setAdding] = useState(false);
  const nav = useNavigate();

  const handleAdd = async (e) => {
    e.stopPropagation();
    setAdding(true);
    await onAdd(p.id, p.name);
    setTimeout(() => setAdding(false), 1200);
  };

  return (
    <div className="prod-card" onClick={() => nav(`/product/${p.id}`)}>
      <div className="prod-card-img">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} loading="lazy" />
          : <div className="prod-emoji">{p.emoji || '📦'}</div>
        }
        {/* Badges */}
        <div className="prod-badges">
          {p.badge && <span className={`prod-badge badge-${p.badge.toLowerCase()}`}>{p.badge}</span>}
        </div>
        {p.original_price && p.original_price > p.price && (
          <span className="prod-discount">{Math.round((1 - p.price / p.original_price) * 100)}% OFF</span>
        )}
        {/* Wishlist */}
        <button
          className={`prod-wish ${wished.has(p.id) ? 'wishlisted' : ''}`}
          onClick={e => { e.stopPropagation(); toggle(p.id); toast(wished.has(p.id) ? '💔 Removed from wishlist' : '❤️ Added to wishlist', { duration: 1400 }); }}
        >
          {wished.has(p.id) ? '❤️' : '🤍'}
        </button>
        {/* Quick view */}
        <div className="prod-quickview" onClick={e => { e.stopPropagation(); onQuickView && onQuickView(p); }}>
          <button className="qv-btn">⚡ Quick View</button>
        </div>
      </div>
      <div className="prod-card-body">
        {p.category_name && <div className="prod-cat-tag">{p.category_name}</div>}
        <div className="prod-name">{p.name}</div>
        <Stars rating={p.rating || 4.2} count={p.review_count} />
        <PriceDisplay price={p.price} original={p.original_price} />
        <button
          className={`prod-add-btn ${adding ? 'adding' : ''}`}
          onClick={handleAdd}
        >
          {adding ? '✓ Added!' : '+ Add to Cart'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// QUICK VIEW MODAL
// ═══════════════════════════════════════════════
function QuickViewModal({ product: p, onClose, onAdd }) {
  const { wished, toggle } = useWish();
  const [qty, setQty] = useState(1);
  useEffect(() => { const h = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  if (!p) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="qv-layout">
          <div className="qv-img">
            {p.image_url ? <img src={p.image_url} alt={p.name} /> : p.emoji || '📦'}
          </div>
          <div>
            {p.category_name && <div className="prod-cat-tag" style={{marginBottom:8}}>{p.category_name}</div>}
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.35rem',fontWeight:800,marginBottom:10,lineHeight:1.3}}>{p.name}</h2>
            <Stars rating={p.rating || 4.2} />
            <div style={{margin:'14px 0'}}>
              <PriceDisplay price={p.price} original={p.original_price} size="large" />
            </div>
            {p.description && <p style={{fontSize:'.88rem',color:'var(--text-secondary)',lineHeight:1.7,marginBottom:16}}>{p.description}</p>}
            <div className="product-qty-row" style={{marginBottom:16}}>
              <div className="qty-label">Qty</div>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
                <span className="qty-num">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => q+1)}>+</button>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={() => { onAdd(p.id, p.name, qty); onClose(); }}>
                🛒 Add to Cart
              </button>
              <button
                className={`btn btn-secondary`}
                onClick={() => { toggle(p.id); toast(wished.has(p.id) ? '💔 Removed' : '❤️ Wishlisted', { duration: 1400 }); }}
              >
                {wished.has(p.id) ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════
const CATS_FOR_BAR = ['All','Toiletries','Makeup','Clothing','Toys','Health','Home','Bags'];

function Navbar() {
  const { count }          = useCart();
  const { customer, signOut } = useAuth();
  const { dark, toggle }   = useTheme();
  const [search, setSearch]= useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [showUserDD, setShowUserDD] = useState(false);
  const nav = useNavigate();
  const searchRef = useRef();

  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try { const r = await api.getProducts({ search, limit: 5 }); setSuggestions(r.data || []); setShowSug(true); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSug(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doSearch = () => { if (search.trim()) { nav(`/products?search=${encodeURIComponent(search)}`); setShowSug(false); } };

  return (
    <>
      <div className="top-bar">🚀 <strong>Free Shipping</strong> on orders above Rs 500 &nbsp;·&nbsp; New arrivals every week ✨</div>
      <header className="navbar">
        <div className="nav-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            RS<span>.</span><span className="nav-logo-dot" />
          </Link>

          {/* Search */}
          <div className="nav-search" ref={searchRef}>
            <input
              className="nav-search-input"
              placeholder="Search products, categories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              onFocus={() => suggestions.length && setShowSug(true)}
            />
            <button className="nav-search-btn" onClick={doSearch}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            {showSug && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map(p => (
                  <div key={p.id} className="suggestion-item" onClick={() => { nav(`/product/${p.id}`); setShowSug(false); setSearch(''); }}>
                    <div className="suggestion-icon">
                      {p.image_url ? <img src={p.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:6}} /> : p.emoji || '📦'}
                    </div>
                    <div>
                      <div className="suggestion-name">{p.name}</div>
                      <div className="suggestion-cat">Rs {Number(p.price).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="nav-actions">
            {/* Dark mode */}
            <button className="theme-toggle" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>
            {/* Wishlist */}
            <Link to="/wishlist">
              <button className="nav-icon-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </Link>
            {/* Cart */}
            <Link to="/cart">
              <button className="nav-icon-btn" style={{position:'relative'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                {count > 0 && <span className="nav-badge">{count > 9 ? '9+' : count}</span>}
              </button>
            </Link>
            {/* User */}
            {customer ? (
              <div className="user-dd-wrap">
                <button className="nav-user-btn" onClick={() => setShowUserDD(d => !d)}>
                  <span className="nav-avatar">{customer.full_name[0].toUpperCase()}</span>
                  <span className="nav-user-name" style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{customer.full_name.split(' ')[0]}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {showUserDD && (
                  <div className="user-dropdown" onClick={() => setShowUserDD(false)}>
                    <Link to="/account">👤 My Account</Link>
                    <Link to="/orders">📦 My Orders</Link>
                    <Link to="/wishlist">❤️ Wishlist</Link>
                    <div className="dd-divider" />
                    <button onClick={signOut}>🚪 Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-login-btn" onClick={() => nav('/login')}>Login / Signup</button>
            )}
          </div>
        </div>
        {/* Categories bar */}
        <div style={{borderTop:'1px solid var(--border)'}}>
          <div className="cat-bar container">
            {CATS_FOR_BAR.map(c => (
              <span key={c} className="cat-bar-item"
                onClick={() => nav(c === 'All' ? '/products' : `/products?category=${c.toLowerCase()}`)}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}

// ═══════════════════════════════════════════════
// HERO CAROUSEL
// ═══════════════════════════════════════════════
const SLIDES = [
  { bg:'hero-slide-1', eyebrow:'🔥 Hot Deals', title:'Everything You Need,\n', titleEm:'Reasonably Priced', desc:'From daily essentials to branded fashion — quality products for the whole family.', cta:'Shop Now', cta2:'Explore Deals', emoji:'🛍️', accent:'#6C63FF' },
  { bg:'hero-slide-2', eyebrow:'💄 Beauty Sale', title:'Glow Up With\n', titleEm:'Top Makeup Brands', desc:'Premium skincare, makeup and beauty products at prices that make you smile.', cta:'Shop Beauty', cta2:'View Offers', emoji:'💄', accent:'#FF6B6B' },
  { bg:'hero-slide-3', eyebrow:'👔 Fashion Week', title:'Dress Sharp,\n', titleEm:'Spend Less', desc:"Men's and women's branded clothing, footwear and accessories with up to 60% off.", cta:'Shop Fashion', cta2:'See New Arrivals', emoji:'👗', accent:'#22C55E' },
  { bg:'hero-slide-4', eyebrow:'⚡ Flash Sale', title:'Limited Time\n', titleEm:'Mega Discounts', desc:'Flash deals on thousands of products. Hurry — these prices won\'t last long!', cta:'Grab Deals', cta2:'Start Shopping', emoji:'⚡', accent:'#F59E0B' },
];

function HeroCarousel() {
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[active];
  return (
    <div className="hero-carousel">
      {SLIDES.map((s, i) => (
        <div key={i} className={`hero-slide ${s.bg} ${i === active ? 'active' : ''}`}>
          <div className="hero-content">
            <div className="hero-eyebrow">{s.eyebrow}</div>
            <h1 className="hero-title">
              {s.title.replace('\n', '')}<span>{s.titleEm}</span>
            </h1>
            <p className="hero-desc">{s.desc}</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => nav('/products')}>{s.cta}</button>
              <button className="btn btn-secondary" onClick={() => nav('/products')}>{s.cta2}</button>
            </div>
          </div>
          <div className="hero-visual">{s.emoji}</div>
        </div>
      ))}
      <button className="carousel-arrow prev" onClick={() => setActive(a => (a - 1 + SLIDES.length) % SLIDES.length)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button className="carousel-arrow next" onClick={() => setActive(a => (a + 1) % SLIDES.length)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <div className="carousel-dots">
        {SLIDES.map((_, i) => <button key={i} className={`carousel-dot ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// FLASH SALE COUNTDOWN
// ═══════════════════════════════════════════════
function useCountdown(targetH = 23, targetM = 59, targetS = 59) {
  const calcLeft = () => {
    const now = new Date();
    const end = new Date(); end.setHours(targetH, targetM, targetS, 0);
    if (end < now) end.setDate(end.getDate() + 1);
    const diff = Math.max(0, end - now);
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
  };
  const [time, setTime] = useState(calcLeft);
  useEffect(() => { const t = setInterval(() => setTime(calcLeft()), 1000); return () => clearInterval(t); }, []);
  return time;
}

// ═══════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════
function Home() {
  const [cats, setCats]       = useState([]);
  const [trending, setTrending] = useState([]);
  const [bestsell, setBestsell] = useState([]);
  const [flashItems, setFlash] = useState([]);
  const [quickView, setQuickView] = useState(null);
  const { addItem }           = useCart();
  const nav                   = useNavigate();
  const { h, m, s }           = useCountdown();
  const [email, setEmail]     = useState('');

  useEffect(() => {
    api.getCategories().then(r => setCats(r.data)).catch(() => {});
    api.getProducts({ featured: true, limit: 8 }).then(r => setTrending(r.data)).catch(() => {});
    api.getProducts({ limit: 8, page: 2 }).then(r => setBestsell(r.data)).catch(() => {});
    api.getProducts({ limit: 4, badge: 'SALE' }).then(r => setFlash(r.data.length ? r.data : [])).catch(() => {});
  }, []);

  const TESTIMONIALS = [
    { name:'Ayesha Khan', rating:5, quote:'Amazing quality products! The delivery was super fast and packaging was perfect. Will definitely order again.', meta:'Karachi · 12 orders', verified:true },
    { name:'Ali Hassan', rating:5, quote:'Best prices in town for branded clothing. Authentic products and great customer service when I had a question.', meta:'Lahore · 8 orders', verified:true },
    { name:'Sara Malik', rating:4, quote:'Love the makeup section! Found my favorite brands at half the price. The website is so easy to use too.', meta:'Islamabad · 5 orders', verified:true },
    { name:'Usman Tariq', rating:5, quote:'Ordered toys for my kids and they were absolutely thrilled. Quality is top-notch and arrived same day!', meta:'Faisalabad · 3 orders', verified:false },
  ];

  return (
    <>
      <HeroCarousel />

      {/* Promo strip */}
      <div className="promo-strip">
        <div className="promo-strip-inner container">
          {[['🚚','Free Shipping','On orders above Rs 500'],['🔄','Easy Returns','7-day hassle-free returns'],['✅','100% Authentic','All products verified genuine'],['💬','24/7 Support','Always here to help']].map(([icon,title,desc]) => (
            <div key={title} className="promo-item">
              <div className="promo-icon">{icon}</div>
              <div><div className="promo-title">{title}</div><div className="promo-desc">{desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="section-gap" style={{background:'var(--bg-card)'}}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">Browse</div>
              <div className="section-title">Shop by <em>Category</em></div>
            </div>
            <button className="view-all" onClick={() => nav('/products')}>View All <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
          </div>
          <div className="cats-grid">
            {cats.map((c, i) => (
              <div key={c.id} className="cat-card" onClick={() => nav(`/products?category=${c.slug}`)}>
                <div className="cat-card-icon">{c.icon}</div>
                <div className="cat-card-name">{c.name}</div>
                <div className="cat-card-count">{c.product_count} items</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="section-gap">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">🔥 Trending</div>
              <div className="section-title">Top <em>Picks</em> This Week</div>
            </div>
            <button className="view-all" onClick={() => nav('/products')}>View All <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
          </div>
          <div className="products-grid">
            {trending.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} onQuickView={setQuickView} />)}
          </div>
        </div>
      </section>

      {/* Flash Sale */}
      <section className="flash-section">
        <div className="container">
          <div className="flash-header">
            <div className="flash-title-wrap">
              <span className="flash-badge">⚡ LIVE</span>
              <span className="flash-title">Flash Sale</span>
            </div>
            <div className="countdown">
              <div className="cd-unit"><div className="cd-num">{String(h).padStart(2,'0')}</div><div className="cd-label">Hrs</div></div>
              <div className="cd-sep">:</div>
              <div className="cd-unit"><div className="cd-num">{String(m).padStart(2,'0')}</div><div className="cd-label">Min</div></div>
              <div className="cd-sep">:</div>
              <div className="cd-unit"><div className="cd-num">{String(s).padStart(2,'0')}</div><div className="cd-label">Sec</div></div>
            </div>
          </div>
          <div className="products-grid">
            {(flashItems.length ? flashItems : trending.slice(0, 4)).map(p => (
              <ProductCard key={p.id} product={{ ...p, original_price: p.original_price || Math.round(p.price * 1.3) }} onAdd={addItem} onQuickView={setQuickView} />
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="section-gap" style={{background:'var(--bg-card)'}}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">⭐ Best Sellers</div>
              <div className="section-title">Customer <em>Favourites</em></div>
            </div>
            <button className="view-all" onClick={() => nav('/products')}>View All <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
          </div>
          <div className="products-grid">
            {bestsell.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} onQuickView={setQuickView} />)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-gap testimonials-section">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">💬 Reviews</div>
              <div className="section-title">What Customers <em>Say</em></div>
            </div>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="testimonial-card">
                <div className="t-stars">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                <p className="t-quote">"{t.quote}"</p>
                <div className="t-author">
                  <div className="t-avatar">{t.name[0]}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-meta">{t.meta}</div>
                    {t.verified && <div className="t-verified">✓ Verified Buyer</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-inner">
            <div className="newsletter-label">Newsletter</div>
            <div className="newsletter-title">Get Exclusive Deals First 🎁</div>
            <p className="newsletter-desc">Subscribe to our newsletter and never miss a sale, new arrival, or exclusive offer.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Enter your email address…" value={email} onChange={e => setEmail(e.target.value)} />
              <button onClick={() => { if (email) { toast.success('🎉 Subscribed!'); setEmail(''); } else toast.error('Enter your email'); }}>
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} onAdd={addItem} />}
    </>
  );
}

// ═══════════════════════════════════════════════
// PRODUCTS PAGE (listing + filters)
// ═══════════════════════════════════════════════
function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [cats, setCats]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('grid');   // grid | list
  const [quickView, setQuickView] = useState(null);
  const [searchParams]          = useSearchParams();
  const { addItem }             = useCart();
  const nav                     = useNavigate();

  const [filters, setFilters] = useState({
    search:    searchParams.get('search') || '',
    category:  searchParams.get('category') || '',
    sort:      'featured',
    page:      1,
    minPrice:  '',
    maxPrice:  '',
    rating:    '',
    inStock:   false,
  });

  useEffect(() => {
    api.getCategories().then(r => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 20, page: filters.page };
    if (filters.search)   params.search   = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.sort === 'price_asc')  params.sort = 'price_asc';
    if (filters.sort === 'price_desc') params.sort = 'price_desc';
    api.getProducts(params)
      .then(r => { setProducts(r.data); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));
  const SORTS = [['featured','Featured'],['newest','Newest'],['price_asc','Price: Low → High'],['price_desc','Price: High → Low'],['rating','Top Rated']];
  const PAGES = Math.ceil(total / 20);

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-layout">
          {/* Sidebar filters */}
          <aside className="filters-sidebar">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:'1rem'}}>🔧 Filters</div>
              <button className="clear-filters-btn" style={{width:'auto',padding:'.3rem .8rem',marginTop:0}} onClick={() => setFilters(f => ({...f,category:'',minPrice:'',maxPrice:'',rating:'',inStock:false,page:1}))}>Clear All</button>
            </div>

            <div className="filter-section-title">Category</div>
            {[{id:'',slug:'',name:'All Categories'}, ...cats].map(c => (
              <div key={c.slug} className="filter-option">
                <input type="checkbox" id={`cat-${c.slug}`} checked={filters.category === c.slug} onChange={() => setF('category', filters.category === c.slug ? '' : c.slug)} />
                <label htmlFor={`cat-${c.slug}`}>{c.icon || ''} {c.name}</label>
              </div>
            ))}

            <div className="filter-divider" />
            <div className="filter-section-title">Price Range (Rs)</div>
            <div className="price-range-inputs">
              <input className="price-range-input" type="number" placeholder="Min" value={filters.minPrice} onChange={e => setF('minPrice', e.target.value)} />
              <input className="price-range-input" type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setF('maxPrice', e.target.value)} />
            </div>

            <div className="filter-divider" />
            <div className="filter-section-title">Rating</div>
            <div className="rating-filter">
              {[5,4,3].map(r => (
                <div key={r} className="rating-row" onClick={() => setF('rating', filters.rating === String(r) ? '' : String(r))}>
                  <input type="checkbox" checked={filters.rating === String(r)} onChange={() => {}} />
                  <div>{'★'.repeat(r)}<span className="filter-stars empty">{'★'.repeat(5-r)}</span></div>
                  <span className="rating-label">& up</span>
                </div>
              ))}
            </div>

            <div className="filter-divider" />
            <div className="filter-option">
              <input type="checkbox" id="in-stock" checked={filters.inStock} onChange={e => setF('inStock', e.target.checked)} />
              <label htmlFor="in-stock">In Stock Only</label>
            </div>
          </aside>

          {/* Products main */}
          <div>
            <div className="products-list-header">
              <div className="results-count">
                Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
                {filters.search && <> for <strong>"{filters.search}"</strong></>}
              </div>
              <div className="sort-and-view">
                <select className="sort-select" value={filters.sort} onChange={e => setF('sort', e.target.value)}>
                  {SORTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="view-toggle">
                  <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>⊞</button>
                  <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>☰</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="products-grid">
                {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{height:320,borderRadius:20}} />)}
              </div>
            ) : (
              <>
                {products.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">No products found</div>
                    <div className="empty-desc">Try adjusting your filters or search terms</div>
                    <button className="btn btn-primary" onClick={() => setFilters(f => ({...f,search:'',category:'',page:1}))}>Clear Search</button>
                  </div>
                ) : (
                  <div className={`products-grid ${view === 'list' ? 'list-view' : ''}`}>
                    {products.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} onQuickView={setQuickView} />)}
                  </div>
                )}
                {PAGES > 1 && (
                  <div className="pagination">
                    <button className="page-btn" disabled={filters.page === 1} onClick={() => setF('page', filters.page - 1)}>‹</button>
                    {[...Array(Math.min(PAGES, 7))].map((_, i) => {
                      const pg = i + 1;
                      return <button key={pg} className={`page-btn ${filters.page === pg ? 'active' : ''}`} onClick={() => setF('page', pg)}>{pg}</button>;
                    })}
                    <button className="page-btn" disabled={filters.page === PAGES} onClick={() => setF('page', filters.page + 1)}>›</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} onAdd={addItem} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════
function ProductPage() {
  const { id }          = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [tab, setTab]   = useState('description');
  const [qty, setQty]   = useState(1);
  const [loading, setLoading] = useState(true);
  const { addItem }     = useCart();
  const { wished, toggle } = useWish();
  const nav             = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getProducts({ limit: 1 }).then(() => {}).catch(() => {});
    // Fetch product by id
    fetch(`/api/products/${id}`).then(r => r.json()).then(r => {
      setProduct(r.data);
      if (r.data?.category_id) {
        api.getProducts({ limit: 4 }).then(rr => setRelated(rr.data.filter(p => p.id !== id).slice(0,4))).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{padding:'120px 0',textAlign:'center',color:'var(--text-muted)'}}>Loading…</div>;
  if (!product) return <div style={{padding:'120px 24px',textAlign:'center'}}><div className="empty-icon">😕</div><div className="empty-title">Product not found</div><button className="btn btn-primary" onClick={() => nav('/products')}>Back to Products</button></div>;

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : null;

  const SPECS = [
    ['SKU', `RS-${product.id?.slice(0,8).toUpperCase()}`],
    ['Category', product.category_name || '—'],
    ['In Stock', `${product.stock} units`],
    ['Brand', 'Reasonable Store'],
    ['Shipping', product.price >= 500 ? 'Free Shipping' : 'Rs 150 delivery'],
    ['Returns', '7-day easy return policy'],
  ];

  const REVIEWS_DATA = [
    { name:'Fatima A.', rating:5, date:'2 days ago', text:'Excellent quality! Exactly as described, very happy with my purchase.'},
    { name:'Omar R.',   rating:4, date:'1 week ago', text:'Good product overall. Delivery was fast and packaging was secure.'},
    { name:'Hina K.',   rating:5, date:'2 weeks ago', text:'Best purchase I made this month! Will definitely recommend to friends.'},
  ];

  return (
    <div className="product-page">
      <div className="container">
        <div className="product-layout">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="product-main-img">
              {product.image_url
                ? <img src={product.image_url} alt={product.name} />
                : <div className="product-main-emoji">{product.emoji || '📦'}</div>}
            </div>
            <div className="product-thumbs">
              {[product.emoji || '📦', product.emoji || '📦', product.emoji || '📦'].map((e, i) => (
                <div key={i} className={`product-thumb ${i === 0 ? 'active' : ''}`}>
                  {product.image_url ? <img src={product.image_url} alt="" /> : e}
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="product-info-section">
            <div className="product-cat-breadcrumb">
              <span onClick={() => nav('/')}>Home</span>
              <span className="sep">/</span>
              <span onClick={() => nav('/products')}>Products</span>
              {product.category_name && <><span className="sep">/</span><span>{product.category_name}</span></>}
            </div>
            <h1 className="product-title">{product.name}</h1>
            <div className="product-rating-row">
              <Stars rating={4.4} count={127} />
              <span className="product-reviews-link">127 reviews</span>
              {product.stock > 0 && <span className="in-stock-badge">✓ In Stock</span>}
            </div>
            <div className="product-price-wrap">
              <span className="product-price-current">Rs {Number(product.price).toLocaleString()}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="product-price-original">Rs {Number(product.original_price).toLocaleString()}</span>
              )}
              {discount && <span className="product-price-save">{discount}% OFF — Save Rs {(product.original_price - product.price).toLocaleString()}</span>}
            </div>
            <p className="product-desc">{product.description || 'Premium quality product from Reasonable Store. Authentic, tested and guaranteed.'}</p>
            <div className="product-qty-row">
              <div className="qty-label">Qty</div>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
                <span className="qty-num">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => q+1)}>+</button>
              </div>
            </div>
            <div className="product-actions">
              <button className="btn btn-primary" onClick={() => addItem(product.id, product.name, qty)}>🛒 Add to Cart</button>
              <button className="btn btn-buynow" onClick={() => { addItem(product.id, product.name, qty); nav('/checkout'); }}>Buy Now</button>
              <button className="btn btn-secondary" style={{padding:'.85rem'}} onClick={() => toggle(product.id)}>
                {wished.has(product.id) ? '❤️' : '🤍'}
              </button>
            </div>
            <div className="product-features">
              {[['🚚','Free shipping above Rs 500'],['🔄','7-day returns'],['✅','Authentic product'],['🔒','Secure checkout']].map(([i,t]) => (
                <div key={t} className="product-feature"><span>{i}</span>{t}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="product-tabs">
          <div className="tabs-header">
            {[['description','Description'],['specs','Specifications'],['reviews','Reviews (127)']].map(([id,label]) => (
              <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div className="tab-content">
            {tab === 'description' && (
              <div style={{maxWidth:720}}>
                <p style={{fontSize:'.95rem',color:'var(--text-secondary)',lineHeight:1.8}}>
                  {product.description || 'This premium product from Reasonable Store is carefully selected and quality-checked. We source directly from trusted suppliers to bring you authentic products at honest prices. Each item is inspected before shipping to ensure it meets our high quality standards.'}
                </p>
                <ul style={{marginTop:16,paddingLeft:20,color:'var(--text-secondary)',fontSize:'.9rem',lineHeight:2}}>
                  <li>✅ 100% authentic and genuine product</li>
                  <li>📦 Carefully packaged for safe delivery</li>
                  <li>🔄 Easy 7-day return policy</li>
                  <li>🌟 Trusted by 10,000+ happy customers</li>
                </ul>
              </div>
            )}
            {tab === 'specs' && (
              <table className="specs-table" style={{maxWidth:600}}>
                <tbody>
                  {SPECS.map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
                </tbody>
              </table>
            )}
            {tab === 'reviews' && (
              <div style={{maxWidth:720}}>
                <div className="reviews-header">
                  <div className="review-score">
                    <div className="review-big-num">4.4</div>
                    <div className="t-stars" style={{justifyContent:'center',margin:'4px 0'}}>★★★★☆</div>
                    <div className="review-count">127 reviews</div>
                  </div>
                  <div className="review-bars">
                    {[[5,68],[4,22],[3,7],[2,2],[1,1]].map(([stars,pct]) => (
                      <div key={stars} className="review-bar-row">
                        <span className="review-bar-label">{stars}★</span>
                        <div className="review-bar-track"><div className="review-bar-fill" style={{width:`${pct}%`}} /></div>
                        <span className="review-bar-pct">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {REVIEWS_DATA.map(r => (
                  <div key={r.name} className="review-card">
                    <div className="review-top">
                      <div className="review-avatar">{r.name[0]}</div>
                      <div>
                        <div className="review-name">{r.name}</div>
                        <div className="t-stars" style={{fontSize:'.78rem'}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                        <div className="review-date">{r.date}</div>
                      </div>
                    </div>
                    <div className="review-text">{r.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section style={{marginTop:60}}>
            <div className="section-header">
              <div><div className="section-label">More Like This</div><div className="section-title">Related Products</div></div>
            </div>
            <div className="products-grid">
              {related.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// WISHLIST PAGE
// ═══════════════════════════════════════════════
function WishlistPage() {
  const { wished, toggle } = useWish();
  const { addItem }        = useCart();
  const [products, setProducts] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (wished.size === 0) return;
    api.getProducts({ limit: 100 }).then(r => {
      setProducts(r.data.filter(p => wished.has(p.id)));
    }).catch(() => {});
  }, [wished]);

  return (
    <div style={{padding:'calc(var(--nav-h) + 24px) 0 72px'}}>
      <div className="container">
        <div className="section-header" style={{marginBottom:32}}>
          <div><div className="section-label">Your</div><div className="section-title">Wishlist ❤️</div></div>
        </div>
        {wished.size === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤍</div>
            <div className="empty-title">Your wishlist is empty</div>
            <div className="empty-desc">Save items you love to buy them later</div>
            <button className="btn btn-primary" onClick={() => nav('/products')}>Start Shopping</button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// CART PAGE — with free shipping progress bar
// ═══════════════════════════════════════════════
const FREE_SHIP_THRESHOLD = 500;

function CartPage() {
  const { items, total, removeItem, fetchCart, sessionId } = useCart();
  const nav = useNavigate();

  const deliveryFee = total >= FREE_SHIP_THRESHOLD ? 0 : 150;
  const grandTotal  = total + deliveryFee;
  const shipPct     = Math.min(100, (total / FREE_SHIP_THRESHOLD) * 100);
  const remaining   = Math.max(0, FREE_SHIP_THRESHOLD - total);

  const updateQty = async (item, delta) => {
    try {
      if (item.quantity + delta <= 0) { await api.removeFromCart(item.id); }
      else {
        await api.addToCart({ session_id: sessionId, product_id: item.product_id, quantity: delta });
      }
      await fetchCart();
    } catch (e) { toast.error(String(e)); }
  };

  if (items.length === 0) return (
    <div style={{padding:'calc(var(--nav-h) + 48px) 0',textAlign:'center'}}>
      <div className="container">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <div className="empty-title">Your cart is empty</div>
          <div className="empty-desc">Add items to your cart to checkout</div>
          <button className="btn btn-primary" onClick={() => nav('/products')}>Start Shopping</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cart-page">
      <div className="container">
        <div style={{marginBottom:28}}>
          <div className="section-label">Your</div>
          <div className="section-title">Shopping Cart</div>
        </div>
        <div className="cart-layout">
          <div>
            {/* Free shipping bar */}
            <div className="free-ship-bar" style={{marginBottom:14}}>
              <div className="free-ship-row">
                {remaining > 0
                  ? <span className="free-ship-text">Add <strong>Rs {remaining.toLocaleString()}</strong> more for free shipping 🚚</span>
                  : <span className="free-ship-text unlocked">🎉 You've unlocked Free Shipping!</span>}
                <span className="free-ship-amount">Rs {FREE_SHIP_THRESHOLD.toLocaleString()}</span>
              </div>
              <div className="free-ship-track"><div className="free-ship-fill" style={{width:`${shipPct}%`}} /></div>
            </div>

            <div className="cart-items-section">
              {items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} />
                      : item.emoji || '📦'}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-cat">{item.category_name || 'Product'}</div>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price-row">
                      <span className="cart-item-price">Rs {Number(item.price).toLocaleString()}</span>
                      {item.original_price && item.original_price > item.price && (
                        <span className="cart-item-original">Rs {Number(item.original_price).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="cart-qty">
                    <button className="cart-qty-btn" onClick={() => updateQty(item, -1)}>−</button>
                    <span className="cart-qty-num">{item.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => updateQty(item, 1)}>+</button>
                  </div>
                  <span className="cart-item-subtotal">Rs {(item.quantity * item.price).toLocaleString()}</span>
                  <button className="cart-remove" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="cart-summary-card">
            <div className="summary-title">Order Summary</div>
            <div className="summary-row"><span>Subtotal ({items.length} items)</span><span>Rs {Number(total).toLocaleString()}</span></div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? <span className="free-ship-chip">FREE</span> : `Rs ${deliveryFee}`}</span>
            </div>
            {items.some(i => i.original_price > i.price) && (
              <div className="summary-row" style={{color:'var(--success)',fontWeight:700}}>
                <span>You Save</span>
                <span>Rs {items.reduce((s,i) => s + Math.max(0,(i.original_price||i.price) - i.price)*i.quantity, 0).toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total"><span>Total</span><span>Rs {grandTotal.toLocaleString()}</span></div>
            <button className="checkout-btn" onClick={() => nav('/checkout')}>Proceed to Checkout →</button>
            <div className="secure-note">🔒 Secure & encrypted checkout</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// CHECKOUT PAGE
// ═══════════════════════════════════════════════
const UPI_ID   = process.env.REACT_APP_UPI_ID   || 'reasonablestore@upi';
const UPI_NAME = process.env.REACT_APP_UPI_NAME || 'Reasonable Store';

function CheckoutPage() {
  const { items, total, sessionId, fetchCart } = useCart();
  const { customer }  = useAuth();
  const nav           = useNavigate();
  const [method, setMethod]     = useState('cod');
  const [placing, setPlacing]   = useState(false);
  const [order, setOrder]       = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [form, setForm] = useState({
    delivery_name:    customer?.full_name || '',
    delivery_phone:   customer?.phone || '',
    delivery_address: customer?.address_line1 ? `${customer.address_line1}${customer.address_line2 ? ', '+customer.address_line2 : ''}` : '',
    delivery_city:    customer?.city || '',
    upi_txn_id:       '',
    notes:            '',
  });

  const deliveryFee = total >= FREE_SHIP_THRESHOLD ? 0 : 150;
  const grandTotal  = total + deliveryFee;

  useEffect(() => { if (items.length === 0 && !order) nav('/cart'); }, [items]);

  const change = e => setForm(f => ({...f,[e.target.name]:e.target.value}));

  const placeOrder = async () => {
    if (!form.delivery_name || !form.delivery_phone || !form.delivery_address || !form.delivery_city)
      return toast.error('Please fill all delivery details');
    if (method === 'upi' && !form.upi_txn_id)
      return toast.error('Please enter your UPI transaction ID');
    setPlacing(true);
    try {
      const fd = new FormData();
      fd.append('session_id', sessionId);
      if (customer?.id) fd.append('customer_id', customer.id);
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      fd.append('payment_method', method);
      if (screenshot) fd.append('upi_screenshot', screenshot);
      const r = await api.placeOrder(fd);
      setOrder(r.order);
      await fetchCart();
      toast.success('🎉 Order placed!');
    } catch(e) { toast.error(String(e)); }
    finally { setPlacing(false); }
  };

  if (order) return (
    <div className="order-success-page">
      <div className="container">
        <div className="order-success-card">
          <div className="success-anim">🎉</div>
          <div className="success-title">Order Placed!</div>
          <div className="order-id">Order ID: <span>#{order.order_number}</span></div>
          <div className="success-msg">
            {order.payment_method === 'cod'
              ? `Your order is confirmed. Pay Rs ${Number(order.total).toLocaleString()} in cash upon delivery.`
              : `We'll verify your UPI payment and confirm within 1–2 hours.`}
          </div>
          <div className="success-details">
            <div className="sd-row"><span>Subtotal</span><span>Rs {Number(order.subtotal).toLocaleString()}</span></div>
            <div className="sd-row"><span>Delivery</span><span>{order.delivery_fee > 0 ? `Rs ${order.delivery_fee}` : 'Free ✓'}</span></div>
            <div className="sd-row sd-total"><span>Total</span><span>Rs {Number(order.total).toLocaleString()}</span></div>
            <div className="sd-row"><span>Payment</span><span>{order.payment_method === 'cod' ? '💵 Cash on Delivery' : '📱 UPI Transfer'}</span></div>
            <div className="sd-row"><span>Delivering to</span><span>{order.delivery_city}</span></div>
          </div>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => nav('/orders')}>View My Orders</button>
            <button className="btn btn-secondary" onClick={() => nav('/products')}>Continue Shopping</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="checkout-page">
      <div className="container">
        <div style={{marginBottom:24}}><div className="section-label">Almost there</div><div className="section-title">Checkout</div></div>
        <div className="checkout-layout">
          <div className="checkout-form">
            {/* Delivery */}
            <div className="checkout-block">
              <div className="checkout-block-title">📍 Delivery Details</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="form-row">
                  <div className="form-group"><label>Full Name *</label><input name="delivery_name" value={form.delivery_name} onChange={change} placeholder="Recipient name" /></div>
                  <div className="form-group"><label>Phone *</label><input name="delivery_phone" value={form.delivery_phone} onChange={change} placeholder="+92 xxx xxxxxxx" /></div>
                </div>
                <div className="form-group"><label>Address *</label><input name="delivery_address" value={form.delivery_address} onChange={change} placeholder="House no., Street, Area" /></div>
                <div className="form-group"><label>City *</label><input name="delivery_city" value={form.delivery_city} onChange={change} placeholder="Lahore" /></div>
                <div className="form-group"><label>Notes <span className="optional-lbl">(optional)</span></label><input name="notes" value={form.notes} onChange={change} placeholder="Special instructions…" /></div>
              </div>
            </div>

            {/* Payment */}
            <div className="checkout-block">
              <div className="checkout-block-title">💳 Payment Method</div>
              <div className="payment-methods">
                <label className={`payment-option ${method==='cod'?'selected':''}`}>
                  <input type="radio" name="pm" value="cod" checked={method==='cod'} onChange={()=>setMethod('cod')} />
                  <span className="pm-icon">💵</span>
                  <div><div className="pm-title">Cash on Delivery</div><div className="pm-desc">Pay when your order arrives</div></div>
                </label>
                <label className={`payment-option ${method==='upi'?'selected':''}`}>
                  <input type="radio" name="pm" value="upi" checked={method==='upi'} onChange={()=>setMethod('upi')} />
                  <span className="pm-icon">📱</span>
                  <div><div className="pm-title">UPI Transfer</div><div className="pm-desc">Pay via GPay, PhonePe, Paytm</div></div>
                </label>
              </div>
              {method === 'upi' && (
                <div className="upi-block">
                  <div className="upi-step">
                    <div className="upi-num">1</div>
                    <div style={{flex:1}}>
                      <strong>Send Rs {grandTotal.toLocaleString()} to:</strong>
                      <div className="upi-id-box">
                        <span className="upi-id">{UPI_ID}</span>
                        <button className="copy-upi" onClick={() => { navigator.clipboard.writeText(UPI_ID); toast.success('Copied!'); }}>Copy</button>
                      </div>
                      <div style={{fontSize:'.8rem',color:'var(--text-muted)'}}>Account: <strong>{UPI_NAME}</strong></div>
                    </div>
                  </div>
                  <div className="upi-step">
                    <div className="upi-num">2</div>
                    <div style={{flex:1}}>
                      <strong>Enter Transaction ID *</strong>
                      <input className="upi-txn-input" name="upi_txn_id" value={form.upi_txn_id} onChange={change} placeholder="12-digit UTR / Transaction ID" />
                    </div>
                  </div>
                  <div className="upi-step">
                    <div className="upi-num">3</div>
                    <div style={{flex:1}}>
                      <strong>Upload Screenshot <span className="optional-lbl">(recommended)</span></strong>
                      <label className="screenshot-label">
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e => { const f=e.target.files[0]; setScreenshot(f); setScreenshotPreview(URL.createObjectURL(f)); }} />
                        {screenshotPreview ? <img src={screenshotPreview} alt="" className="screenshot-preview" /> : '📸 Click to upload payment screenshot'}
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="checkout-summary-card">
            <div className="summary-title">Order Summary</div>
            {items.map(i => (
              <div key={i.id} className="cs-item">
                <div className="cs-img">{i.image_url?<img src={i.image_url} alt="" />:i.emoji||'📦'}</div>
                <div className="cs-name">{i.name}<div className="cs-qty">×{i.quantity}</div></div>
                <div className="cs-price">Rs {(i.price*i.quantity).toLocaleString()}</div>
              </div>
            ))}
            <div className="cs-divider" />
            <div className="cs-row"><span>Subtotal</span><span>Rs {Number(total).toLocaleString()}</span></div>
            <div className="cs-row"><span>Delivery</span><span>{deliveryFee===0?<span style={{color:'var(--success)',fontWeight:700}}>FREE</span>:`Rs ${deliveryFee}`}</span></div>
            <div className="cs-row cs-total"><span>Total</span><span>Rs {grandTotal.toLocaleString()}</span></div>
            <button className="place-btn" onClick={placeOrder} disabled={placing}>
              {placing ? '⏳ Placing…' : `Place Order — Rs ${grandTotal.toLocaleString()}`}
            </button>
            <div className="secure-note" style={{marginTop:10,fontSize:'.76rem',color:'var(--text-muted)',textAlign:'center'}}>
              🔒 Secure checkout · {method==='cod'?'Pay on delivery':'UPI verified within 2hrs'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// AUTH PAGE
// ═══════════════════════════════════════════════
function AuthPage() {
  const [mode, setMode]   = useState('login');
  const [form, setForm]   = useState({ full_name:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, customer } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (customer) nav('/account'); }, [customer]);
  const change = e => setForm(f => ({...f,[e.target.name]:e.target.value}));
  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') { await signIn({email:form.email,password:form.password}); toast.success('👋 Welcome back!'); }
      else { await signUp(form); toast.success('🎉 Account created!'); }
      nav('/account');
    } catch(e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap"><div className="auth-logo-icon">🛍️</div><div className="auth-logo-text">ReasonableStore</div></div>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode==='login'?'active':''}`} onClick={()=>setMode('login')}>Login</button>
          <button className={`auth-tab ${mode==='register'?'active':''}`} onClick={()=>setMode('register')}>Register</button>
        </div>
        <div className="auth-form">
          {mode==='register' && <div className="form-group"><label>Full Name *</label><input name="full_name" value={form.full_name} onChange={change} placeholder="Your full name" /></div>}
          <div className="form-group"><label>Email *</label><input name="email" type="email" value={form.email} onChange={change} placeholder="you@email.com" /></div>
          <div className="form-group"><label>Password *</label><input name="password" type="password" value={form.password} onChange={change} placeholder="Min. 6 characters" /></div>
          {mode==='register' && <div className="form-group"><label>Phone <span className="optional-lbl">(optional)</span></label><input name="phone" value={form.phone} onChange={change} placeholder="+92 xxx xxxxxxx" /></div>}
          <button className="auth-submit" onClick={submit} disabled={loading}>{loading?'⏳ Please wait…':mode==='login'?'Login →':'Create Account →'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ACCOUNT PAGE
// ═══════════════════════════════════════════════
function AccountPage() {
  const { customer, signOut, refreshCustomer } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]     = useState('profile');
  const [profile, setProfile] = useState(null);
  const [saving, setSaving]   = useState(false);
  useEffect(() => { if (!customer) nav('/login'); }, [customer]);
  useEffect(() => { if (customer) setProfile({...customer}); }, [customer]);
  if (!customer || !profile) return null;
  const change = e => setProfile(p => ({...p,[e.target.name]:e.target.value}));
  const save = async () => { setSaving(true); try { await api.updateProfile(profile); await refreshCustomer(); toast.success('✅ Saved!'); } catch(e) { toast.error(String(e)); } finally { setSaving(false); } };
  const PROVS = ['Punjab','Sindh','KPK','Balochistan','Gilgit-Baltistan','AJK','Islamabad'];
  const NAV = [['profile','👤','Profile'],['address','📍','Address'],['password','🔒','Password'],['orders','📦','My Orders']];
  return (
    <div className="account-page">
      <div className="container">
        <div className="account-layout">
          <aside className="account-sidebar">
            <div className="account-hero">
              <div className="account-big-avatar">{customer.full_name[0].toUpperCase()}</div>
              <div className="account-name">{customer.full_name}</div>
              <div className="account-email">{customer.email}</div>
            </div>
            {NAV.map(([id,icon,label]) => (
              <button key={id} className={`account-nav-item ${tab===id?'active':''}`} onClick={()=>setTab(id)}>
                <span>{icon}</span>{label}
              </button>
            ))}
            <div style={{padding:'0 .5rem',marginTop:'.5rem'}}>
              <button className="account-nav-item" style={{color:'var(--danger)'}} onClick={signOut}><span>🚪</span>Logout</button>
            </div>
          </aside>

          <div className="account-content-area">
            {tab==='profile' && (
              <div className="account-block">
                <div className="account-block-title"><span>👤</span> Personal Information</div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="form-row">
                    <div className="form-group"><label>Full Name</label><input name="full_name" value={profile.full_name||''} onChange={change} /></div>
                    <div className="form-group"><label>Phone</label><input name="phone" value={profile.phone||''} onChange={change} placeholder="+92 xxx xxxxxxx" /></div>
                  </div>
                  <div className="form-group"><label>Email (cannot change)</label><input value={profile.email} disabled style={{opacity:.6}} /></div>
                  <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={save} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
                </div>
              </div>
            )}
            {tab==='address' && (
              <div className="account-block">
                <div className="account-block-title"><span>📍</span> Delivery Address</div>
                <div className="address-hint">💡 Save your address — it auto-fills at checkout</div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="form-group"><label>Address Line 1</label><input name="address_line1" value={profile.address_line1||''} onChange={change} placeholder="House/Flat no., Street name" /></div>
                  <div className="form-group"><label>Address Line 2 <span className="optional-lbl">(optional)</span></label><input name="address_line2" value={profile.address_line2||''} onChange={change} placeholder="Area, Landmark" /></div>
                  <div className="form-row">
                    <div className="form-group"><label>City</label><input name="city" value={profile.city||''} onChange={change} placeholder="Lahore" /></div>
                    <div className="form-group"><label>Province</label><select name="province" value={profile.province||''} onChange={change}><option value="">— Select —</option>{PROVS.map(p=><option key={p}>{p}</option>)}</select></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Postal Code <span className="optional-lbl">(opt)</span></label><input name="postal_code" value={profile.postal_code||''} onChange={change} /></div>
                    <div className="form-group"><label>Country</label><input name="country" value={profile.country||'Pakistan'} onChange={change} /></div>
                  </div>
                  <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={save} disabled={saving}>{saving?'Saving…':'Save Address'}</button>
                </div>
              </div>
            )}
            {tab==='password' && (
              <div className="account-block">
                <div className="account-block-title"><span>🔒</span> Change Password</div>
                <PasswordChange />
              </div>
            )}
            {tab==='orders' && (
              <div className="account-block">
                <div className="account-block-title"><span>📦</span> My Orders</div>
                <MyOrders />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordChange() {
  const [form,setForm]=useState({current_password:'',new_password:'',confirm:''});
  const [saving,setSaving]=useState(false);
  const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const save=async()=>{
    if(form.new_password!==form.confirm) return toast.error("Passwords don't match");
    setSaving(true);
    try{await api.updatePassword({current_password:form.current_password,new_password:form.new_password});toast.success('✅ Password changed');setForm({current_password:'',new_password:'',confirm:''});}
    catch(e){toast.error(String(e));}finally{setSaving(false);}
  };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:440}}>
      <div className="form-group"><label>Current Password</label><input name="current_password" type="password" value={form.current_password} onChange={change} /></div>
      <div className="form-group"><label>New Password</label><input name="new_password" type="password" value={form.new_password} onChange={change} /></div>
      <div className="form-group"><label>Confirm New Password</label><input name="confirm" type="password" value={form.confirm} onChange={change} /></div>
      <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={save} disabled={saving}>{saving?'Saving…':'Change Password'}</button>
    </div>
  );
}

function MyOrders() {
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{api.getMyOrders().then(r=>setOrders(r.data)).catch(()=>{}).finally(()=>setLoading(false));}, []);
  const stColor={placed:'#F59E0B',confirmed:'#22C55E',shipped:'#6C63FF',delivered:'#22C55E',cancelled:'#EF4444'};
  if(loading) return <div className="loading-state">Loading…</div>;
  if(!orders.length) return <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>No orders yet. <Link to="/products" style={{color:'var(--primary)',fontWeight:700}}>Shop now →</Link></div>;
  return(
    <div className="my-orders-list">
      {orders.map(o=>(
        <div key={o.id} className="my-order-card">
          <div className="moc-header">
            <div><div className="moc-num">#{o.order_number}</div><div className="moc-date">{new Date(o.created_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</div></div>
            <span className="moc-status" style={{background:stColor[o.status]+'20',color:stColor[o.status]}}>{o.status}</span>
          </div>
          <div className="moc-items">
            {(o.items||[]).filter(Boolean).map(item=>(
              <div key={item.id} className="moc-item-row"><span>{item.emoji||'📦'}</span><span>{item.product_name} ×{item.quantity}</span><span style={{marginLeft:'auto',fontWeight:700}}>Rs {(item.price*item.quantity).toLocaleString()}</span></div>
            ))}
          </div>
          <div className="moc-footer">
            <span>{o.payment_method==='cod'?'💵 Cash on Delivery':'📱 UPI'}</span>
            <span className="moc-total">Rs {Number(o.total).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Orders shortcut page
function OrdersPage() {
  const { customer } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!customer) nav('/login'); }, [customer]);
  if (!customer) return null;
  return (
    <div style={{padding:'calc(var(--nav-h) + 24px) 0 72px'}}>
      <div className="container">
        <div style={{marginBottom:28}}><div className="section-label">Your</div><div className="section-title">Orders 📦</div></div>
        <MyOrders />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo" style={{marginBottom:12}}>RS<span>.</span></div>
            <p>Your trusted one-stop shop for quality products at honest prices. Serving happy customers across Pakistan.</p>
            <div className="footer-social">
              {['📘','📸','🐦','▶️','💬'].map((i,idx) => <button key={idx} className="social-btn">{i}</button>)}
            </div>
          </div>
          <div className="footer-col">
            <h5>Shop</h5>
            <ul>
              {['All Products','Toiletries','Makeup & Beauty','Men\'s Clothing','Toys & Games'].map(c => (
                <li key={c}><Link to={`/products?search=${c}`}>{c}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h5>Account</h5>
            <ul>
              <li><Link to="/login">Login / Register</Link></li>
              <li><Link to="/orders">My Orders</Link></li>
              <li><Link to="/cart">My Cart</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
              <li><Link to="/account">Profile</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Help</h5>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Return Policy</a></li>
              <li><a href="#">Delivery Info</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Reasonable Store. All rights reserved.</span>
          <div className="footer-pay">
            {['COD','UPI','GPay','JazzCash'].map(p => <span key={p} className="pay-badge">{p}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <WishProvider>
              <Toaster position="bottom-right" toastOptions={{
                style: { fontFamily:"'Nunito',sans-serif", fontWeight:600, fontSize:'.88rem' },
                success: { iconTheme: { primary:'#6C63FF', secondary:'#fff' } },
              }} />
              <Navbar />
              <main>
                <Routes>
                  <Route path="/"          element={<Home />} />
                  <Route path="/products"  element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/cart"      element={<CartPage />} />
                  <Route path="/checkout"  element={<CheckoutPage />} />
                  <Route path="/login"     element={<AuthPage />} />
                  <Route path="/account"   element={<AccountPage />} />
                  <Route path="/orders"    element={<OrdersPage />} />
                  <Route path="/wishlist"  element={<WishlistPage />} />
                  <Route path="/admin"     element={<Admin />} />
                </Routes>
              </main>
              <Footer />
            </WishProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
