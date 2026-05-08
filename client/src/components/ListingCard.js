import Link from 'next/link'

const CATEGORY_ICONS = {
  software: '💻',
  art: '🎨',
  music: '🎵',
  ebook: '📚',
  template: '🖼️',
  other: '📦',
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function ListingCard({ listing, compact = false }) {
  const {
    id, title, description, price, category,
    previewUrl, sellerUsername, sellerAddress, salesCount
  } = listing

  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'Unknown'

  // Handle both server-hosted paths (/uploads/...) and external URLs
  const previewSrc = previewUrl
    ? (previewUrl.startsWith('http') ? previewUrl : `${BASE_URL}${previewUrl}`)
    : null

  return (
    <Link href={`/marketplace/${id}`} className="listing-card" id={`listing-${id}`}>
      {/* Preview / thumbnail */}
      <div className="card-preview">
        {previewSrc ? (
          <img src={previewSrc} alt={title} className="card-img" />
        ) : (
          <div className="card-placeholder">
            <span className="card-icon">{CATEGORY_ICONS[category] || '📦'}</span>
          </div>
        )}
        <span className="card-category">{category || 'other'}</span>
      </div>

      {/* Content */}
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        {!compact && (
          <p className="card-desc">{description?.slice(0, 100)}{description?.length > 100 ? '…' : ''}</p>
        )}

        <div className="card-footer">
          <div className="card-seller">
            <span className="seller-avatar">
              {(sellerUsername || sellerAddress || '?')[0].toUpperCase()}
            </span>
            <span className="seller-name">
              {sellerUsername || shortAddress(sellerAddress)}
            </span>
          </div>

          <div className="card-meta">
            {salesCount > 0 && (
              <span className="card-sales">{salesCount} sold</span>
            )}
            <span className="card-price">{price} ETH</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
