import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// Attach auth token to every request automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rs_auth_token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  if (!(cfg.data instanceof FormData)) cfg.headers['Content-Type'] = 'application/json';
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data?.error || err.message)
);

// ── Public ────────────────────────────────────────────────────
export const getCategories = ()            => api.get('/categories');
export const getProducts   = (p={})        => api.get('/products', { params: p });
export const submitQuery   = (data)        => api.post('/queries', data);
export const getGallery    = ()            => api.get('/gallery');
export const uploadPhotos  = (fd)          => api.post('/gallery/upload', fd);
export const getCart       = (sid)         => api.get(`/cart/${sid}`);
export const addToCart     = (data)        => api.post('/cart', data);
export const removeFromCart= (id)          => api.delete(`/cart/${id}`);
export const clearCart     = (sid)         => api.delete(`/cart/session/${sid}`);
export const trackOrder    = (num)         => api.get(`/orders/track/${num}`);

// ── Auth ──────────────────────────────────────────────────────
export const register      = (data)        => api.post('/auth/register', data);
export const login         = (data)        => api.post('/auth/login', data);
export const logout        = ()            => api.post('/auth/logout');
export const getMe         = ()            => api.get('/auth/me');
export const updateProfile = (data)        => api.put('/auth/profile', data);
export const updatePassword= (data)        => api.put('/auth/password', data);
export const getMyOrders   = ()            => api.get('/auth/orders');

// ── Orders ────────────────────────────────────────────────────
export const placeOrder    = (fd)          => api.post('/orders', fd);  // FormData (may include screenshot)

// ── Admin: Products ───────────────────────────────────────────
export const createProduct = (fd)          => api.post('/products', fd);    // FormData
export const updateProduct = (id, fd)      => api.put(`/products/${id}`, fd); // FormData
export const deleteProduct = (id)          => api.delete(`/products/${id}`);

// ── Admin: Categories ─────────────────────────────────────────
export const createCategory= (data)        => api.post('/categories', data);
export const updateCategory= (id, data)    => api.put(`/categories/${id}`, data);
export const deleteCategory= (id)          => api.delete(`/categories/${id}`);

// ── Admin: Queries ────────────────────────────────────────────
export const getQueries         = (p={})   => api.get('/queries', { params: p });
export const updateQueryStatus  = (id, s)  => api.patch(`/queries/${id}/status`, { status: s });
export const deleteGalleryPhoto = (id)     => api.delete(`/gallery/${id}`);

// ── Admin: Orders ─────────────────────────────────────────────
export const getAllOrders        = (p={})   => api.get('/orders', { params: p });
export const updateOrderStatus   = (num, data) => api.patch(`/orders/${num}/status`, data);

export default api;
