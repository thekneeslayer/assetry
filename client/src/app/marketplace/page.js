'use client'
import { useState, useEffect, useCallback } from 'react'
import { getListings } from '@/lib/api'
import ListingCard from '@/components/ListingCard'

const CATEGORIES = ['all', 'software', 'art', 'music', 'ebook', 'template', 'other']

export default function MarketplacePage() {
  const [listings, setListings] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (category !== 'all') params.category = category
      if (search.trim()) params.search = search.trim()
      const data = await getListings(params)
      setListings(data)
      setFiltered(data)
    } catch (err) {
      setError('Failed to load listings. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    const t = setTimeout(fetchListings, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchListings])

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <h1>Marketplace</h1>
        <p>Discover and acquire premium digital goods — secured by escrow.</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="marketplace-search"
          />
        </div>

        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-chip ${category === cat ? 'filter-chip-active' : ''}`}
            onClick={() => setCategory(cat)}
            id={`filter-${cat}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
          {listings.length === 0 ? 'No assets found' : `${listings.length} asset${listings.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Content */}
      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading marketplace…</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">No assets found</div>
          <div className="empty-desc">
            {search || category !== 'all'
              ? 'Try a different search term or category.'
              : 'Be the first to list a digital asset on Assetry!'}
          </div>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
