// src/api.js – Axios client
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data?.error || err.message)
);

export const getCategories  = ()            => api.get('/categories');
export const getProducts    = (params = {}) => api.get('/products', { params });
export const getProduct     = (id)          => api.get(`/products/${id}`);
export const submitQuery    = (data)        => api.post('/queries', data);
export const getGallery     = ()            => api.get('/gallery');
export const uploadPhotos   = (formData)    => api.post('/gallery/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getCart        = (sid)         => api.get(`/cart/${sid}`);
export const addToCart      = (data)        => api.post('/cart', data);
export const removeFromCart = (id)          => api.delete(`/cart/${id}`);
export const clearCart      = (sid)         => api.delete(`/cart/session/${sid}`);

export default api;

// ── Admin API ─────────────────────────────────────────────────
export const createProduct  = (data)        => api.post('/products', data);
export const updateProduct  = (id, data)    => api.put(`/products/${id}`, data);
export const deleteProduct  = (id)          => api.delete(`/products/${id}`);
export const getQueries     = (params = {}) => api.get('/queries', { params });
export const updateQueryStatus = (id, status) => api.patch(`/queries/${id}/status`, { status });
export const deleteGalleryPhoto = (id)      => api.delete(`/gallery/${id}`);
