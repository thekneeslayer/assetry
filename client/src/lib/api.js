const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

async function request(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// Auth
export const getNonce = () => request('/api/auth/nonce')
export const verifySignature = (message, signature) =>
  request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ message, signature }) })

// Listings
export const getListings = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/api/listings${qs ? '?' + qs : ''}`)
}
export const getListing = (id) => request(`/api/listings/${id}`)
export const createListing = (formData, token) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  return fetch(`${BASE_URL}/api/listings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    // No Content-Type header — browser sets it automatically with boundary for multipart
    body: formData,
  }).then(async res => {
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  })
}
export const deleteListing = (id, token) =>
  request(`/api/listings/${id}`, { method: 'DELETE' }, token)
export const getSellerListings = (userId) => request(`/api/listings/seller/${userId}`)

export const downloadFile = async (listingId, token, fileName) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  const res = await fetch(`${BASE_URL}/api/listings/${listingId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Download failed')
  }
  // Trigger browser download
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'download'
  a.click()
  URL.revokeObjectURL(url)
}

// Purchases
export const createPurchase = (data, token) =>
  request('/api/purchases', { method: 'POST', body: JSON.stringify(data) }, token)
export const getMyPurchases = (token) => request('/api/purchases/my', {}, token)
export const getMySales = (token) => request('/api/purchases/sales', {}, token)
export const confirmPurchase = (id, token) =>
  request(`/api/purchases/${id}/confirm`, { method: 'PATCH' }, token)
export const disputePurchase = (id, token) =>
  request(`/api/purchases/${id}/dispute`, { method: 'PATCH' }, token)

// Users
export const getMe = (token) => request('/api/users/me', {}, token)
export const updateMe = (data, token) =>
  request('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }, token)
export const getUser = (id) => request(`/api/users/${id}`)
