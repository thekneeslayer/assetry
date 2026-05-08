'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createListing } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

const CATEGORIES = ['software', 'art', 'music', 'ebook', 'template', 'other']
const CATEGORY_ICONS = {
  software: '💻', art: '🎨', music: '🎵',
  ebook: '📚', template: '🖼️', other: '📦',
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CreateListingPage() {
  const router = useRouter()
  const { user, token } = useAuth()

  const [form, setForm] = useState({
    title: '', description: '', price: '',
    category: 'software', tags: '',
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="container">
        <div className="glass-card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 12 }}>
            Connect your wallet
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            You need to connect your wallet and sign in before creating a listing.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>Go to Home</Link>
        </div>
      </div>
    )
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFileChange(e) {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }

  function handlePreviewChange(e) {
    const selected = e.target.files[0]
    if (selected) {
      setPreview(selected)
      // Show local preview before upload
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
      setPreviewObjectUrl(URL.createObjectURL(selected))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.title.trim() || !form.description.trim() || !form.price) {
      return setError('Title, description, and price are required.')
    }
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      return setError('Price must be a positive number.')
    }
    if (!file) {
      return setError('Please upload a product file.')
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (preview) formData.append('preview', preview)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('price', parseFloat(form.price))
      formData.append('category', form.category)
      formData.append('tags', form.tags)

      const listing = await createListing(formData, token)
      router.push(`/marketplace/${listing.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create listing.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="page-header">
          <h1>Create a Listing</h1>
          <p>Fill in the details below to list your digital asset on the marketplace.</p>
        </div>

        <form className="glass-card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Category picker */}
          <div>
            <label className="form-label">Category</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat}
                  className={`filter-chip ${form.category === cat ? 'filter-chip-active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, category: cat }))}
                  id={`cat-${cat}`}
                >
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title">Title *</label>
            <input
              id="title" name="title" className="form-input"
              placeholder="e.g. Premium UI Kit - 200+ components"
              value={form.title} onChange={handleChange}
              maxLength={80}
            />
            <span className="form-hint">{form.title.length}/80 characters</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description *</label>
            <textarea
              id="description" name="description" className="form-textarea"
              placeholder="Describe what the buyer will receive, what's included, and why it's valuable..."
              value={form.description} onChange={handleChange}
              rows={5}
            />
          </div>

          {/* Price */}
          <div className="form-group">
            <label className="form-label" htmlFor="price">Price (ETH) *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="price" name="price" className="form-input"
                type="number" step="0.0001" min="0.0001"
                placeholder="0.05"
                value={form.price} onChange={handleChange}
                style={{ paddingRight: 56 }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                ETH
              </span>
            </div>
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label className="form-label">Product File *</label>
            <label
              htmlFor="file-upload"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '28px 20px',
                border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: file ? 'var(--accent-dim)' : 'var(--bg-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{file ? '✅' : '📁'}</span>
              {file ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatBytes(file.size)}</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Click to upload your product file</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    ZIP, PDF, MP3, MP4, PNG, and more - up to 100MB
                  </div>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".zip,.pdf,.epub,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.ogg,.mp4,.txt,.json"
              />
            </label>
            {file && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setFile(null)}
              >
                Remove file
              </button>
            )}
            <span className="form-hint">
              This file will be stored securely and only released to buyers after they confirm delivery.
            </span>
          </div>

          {/* Preview Image Upload */}
          <div className="form-group">
            <label className="form-label">Preview Image</label>
            <label
              htmlFor="preview-upload"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: preview ? 0 : '28px 20px',
                border: `2px dashed ${preview ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: preview ? 'transparent' : 'var(--bg-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
                overflow: 'hidden',
                minHeight: 120,
              }}
            >
              {previewObjectUrl ? (
                <img
                  src={previewObjectUrl}
                  alt="preview"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🖼️</span>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 8 }}>Click to upload a preview image</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    PNG, JPG, GIF, WebP - shown to buyers on the marketplace
                  </div>
                </div>
              )}
              <input
                id="preview-upload"
                type="file"
                style={{ display: 'none' }}
                onChange={handlePreviewChange}
                accept=".png,.jpg,.jpeg,.gif,.webp"
              />
            </label>
            {preview && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => { setPreview(null); setPreviewObjectUrl('') }}
              >
                Remove image
              </button>
            )}
            <span className="form-hint">Optional - helps buyers understand what they're purchasing.</span>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label" htmlFor="tags">Tags</label>
            <input
              id="tags" name="tags" className="form-input"
              placeholder="react, dashboard, dark-mode (comma-separated)"
              value={form.tags} onChange={handleChange}
            />
          </div>

          {/* Escrow notice */}
          <div className="escrow-note">
            <span className="escrow-icon">🔒</span>
            <span>
              By listing, you agree that payments will be held in escrow until the buyer confirms delivery.
              You receive funds only after buyer confirmation.
            </span>
          </div>

          {/* Error */}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="create-listing-btn"
              style={{ flex: 1, justifyContent: 'center', padding: 14, fontSize: '1rem' }}
            >
              {loading
                ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Uploading & Creating...</>
                : '🚀 Publish Listing'
              }
            </button>
            <Link href="/marketplace" className="btn-secondary" style={{ padding: '14px 24px' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
