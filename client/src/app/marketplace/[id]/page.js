'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getListing, createPurchase, downloadFile } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWalletClient, useChainId, useSwitchChain } from 'wagmi'
import { parseEther, keccak256, toBytes } from 'viem'
import { ESCROW_ABI } from '@/lib/escrowAbi'

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
const SEPOLIA_CHAIN_ID = 11155111

const CATEGORY_ICONS = {
  software: '💻', art: '🎨', music: '🎵',
  ebook: '📚', template: '🖼️', other: '📦',
}

function shortAddress(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'Unknown'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState('') // shows progress to user

  useEffect(() => {
    getListing(id)
      .then(setListing)
      .catch(() => setError('Listing not found.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleBuy() {
    if (!user) return setError('Connect your wallet first.')
    if (!token) return setError('Please sign in to purchase.')
    if (!ESCROW_ADDRESS) return setError('Escrow contract not configured.')
    if (!walletClient) return setError('Wallet not connected.')

    setBuying(true)
    setError('')

    try {
      // 1. Switch to Sepolia if needed
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setStep('Switching to Sepolia testnet...')
        await switchChain({ chainId: SEPOLIA_CHAIN_ID })
      }

      // 2. Create purchase record in DB first to get the purchase ID
      setStep('Creating purchase record...')
      const purchase = await createPurchase({ listingId: id }, token)

      // 3. Encode purchaseId as bytes32 (keccak256 of the UUID string)
      const purchaseIdBytes32 = keccak256(toBytes(purchase.id))

      // 4. Send ETH to escrow contract
      setStep('Waiting for MetaMask confirmation...')
      const txHash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [purchaseIdBytes32, listing.sellerAddress],
        value: parseEther(listing.price.toString()),
        chain: { id: SEPOLIA_CHAIN_ID },
      })

      // 5. Save txHash to DB immediately — don't wait for mining
      setStep('Finalizing...')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/purchases/${purchase.id}/tx`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ txHash }),
      })

      setSuccess(`🎉 Payment sent! Transaction hash: ${txHash.slice(0, 10)}... Your ${listing.price} Sepolia ETH is being locked in escrow. Go to your dashboard to confirm delivery once the transaction confirms and you receive the asset.`)
      setStep('')
    } catch (err) {
      console.error('Buy error:', err)
      // User rejected MetaMask popup
      if (err.message?.includes('User rejected') || err.code === 4001) {
        setError('Transaction cancelled.')
      } else {
        setError(err.message || 'Purchase failed. Please try again.')
      }
      setStep('')
    } finally {
      setBuying(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      await downloadFile(id, token, listing.fileName || listing.fileUrl)
    } catch (err) {
      setError(err.message || 'Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="container">
      <div className="loading-state"><div className="spinner" /><span>Loading listing…</span></div>
    </div>
  )

  if (error && !listing) return (
    <div className="container">
      <div className="alert alert-error" style={{ marginTop: 40 }}>{error}</div>
    </div>
  )

  if (!listing) return null

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const isOwner = user?.id === listing.sellerId || user?.walletAddress?.toLowerCase() === listing.sellerAddress?.toLowerCase()

  // Build full preview URL if it's a relative server path
  const previewSrc = listing.previewUrl
    ? (listing.previewUrl.startsWith('http') ? listing.previewUrl : `${BASE_URL}${listing.previewUrl}`)
    : null

  return (
    <div className="container">
      <div className="detail-layout">
        {/* ── LEFT: listing info ── */}
        <div>
          <div className="detail-preview" style={{ marginBottom: 32 }}>
            {previewSrc
              ? <img src={previewSrc} alt={listing.title} />
              : <span className="detail-big-icon">{CATEGORY_ICONS[listing.category] || '📦'}</span>
            }
          </div>

          <div className="detail-meta">
            <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', border: '1px solid var(--border-accent)' }}>
              {CATEGORY_ICONS[listing.category] || '📦'} {listing.category || 'Other'}
            </span>
            {listing.createdAt && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Listed {formatDate(listing.createdAt)}
              </span>
            )}
            {listing.salesCount > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {listing.salesCount} sale{listing.salesCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <h1 className="detail-title">{listing.title}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              {(listing.sellerUsername || listing.sellerAddress || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seller</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {listing.sellerUsername || shortAddress(listing.sellerAddress)}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>About this asset</h2>
          <p className="detail-desc">{listing.description}</p>

          {listing.tags?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Tags</h3>
              <div className="detail-tags">
                {listing.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: buy panel ── */}
        <div className="buy-panel">
          <div className="glass-card">
            <div className="buy-price">{listing.price} ETH</div>
            <div className="buy-label">Sepolia testnet · escrow protected</div>

            <div className="escrow-note">
              <span className="escrow-icon">🔒</span>
              <span>
                Your Sepolia ETH is locked in a <strong>smart contract</strong> until you confirm delivery.
                The seller only receives funds after you verify the asset.
              </span>
            </div>

            {success ? (
              <div>
                <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>
              </div>
            ) : error ? (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
            ) : null}

            {step && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                {step}
              </div>
            )}

            {isOwner ? (
              <div>
                <div className="alert alert-info" style={{ marginBottom: 12 }}>
                  This is your listing. You cannot purchase your own asset.
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading…' : '⬇️ Download Your File'}
                </button>
              </div>
            ) : !user ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Connect your wallet to purchase this asset.
                </p>
                <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                  Connect Wallet
                </a>
              </div>
            ) : !success && (
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
                onClick={handleBuy}
                disabled={buying}
                id="buy-btn"
              >
                {buying
                  ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Processing…</>
                  : `Buy for ${listing.price} ETH`
                }
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              {[['✅', 'Smart contract escrow'], ['⛓️', 'Sepolia testnet'], ['🔐', 'Wallet-based auth'], ['🆘', 'Dispute & refund']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
