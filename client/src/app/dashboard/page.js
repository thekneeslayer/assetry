'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  getMe, updateMe, getMyPurchases, getMySales,
  getSellerListings, deleteListing, confirmPurchase, disputePurchase, downloadFile
} from '@/lib/api'
import { useWalletClient, usePublicClient } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { ESCROW_ABI } from '@/lib/escrowAbi'
import ListingCard from '@/components/ListingCard'

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS

function shortAddress(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function StatusBadge({ status }) {
  return <span className={`badge badge-${status || 'pending'}`}>{status || 'pending'}</span>
}

export default function DashboardPage() {
  const { user, token, updateUser, logout } = useAuth()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [tab, setTab] = useState('profile')

  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])

  const [profileForm, setProfileForm] = useState({ username: '', bio: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  const [actionLoading, setActionLoading] = useState({})
  const [actionMsg, setActionMsg] = useState({})

  useEffect(() => {
    if (!user || !token) return
    getMe(token).then(data => {
      setProfile(data)
      setProfileForm({ username: data.username || '', bio: data.bio || '' })
    }).catch(() => {})
    getSellerListings(user.id).then(setListings).catch(() => {})
    getMyPurchases(token).then(setPurchases).catch(() => {})
    getMySales(token).then(setSales).catch(() => {})
  }, [user, token])

  if (!user) {
    return (
      <div className="container">
        <div className="glass-card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>👤</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 12 }}>
            Sign in required
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Connect your wallet to view your dashboard.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>Go to Home</Link>
        </div>
      </div>
    )
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const updated = await updateMe(profileForm, token)
      updateUser(updated)
      setProfile(updated)
      setProfileMsg({ type: 'success', text: 'Profile updated!' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Update failed.' })
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleDeleteListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setActionLoading(p => ({ ...p, [id]: true }))
    try {
      await deleteListing(id, token)
      setListings(p => p.filter(l => l.id !== id))
    } catch (err) {
      alert(err.message || 'Delete failed.')
    } finally {
      setActionLoading(p => ({ ...p, [id]: false }))
    }
  }

  async function handleConfirm(purchaseId) {
    setActionLoading(p => ({ ...p, [purchaseId]: true }))
    try {
      // 1. Call confirmDelivery on the smart contract
      if (ESCROW_ADDRESS && walletClient) {
        const purchaseIdBytes32 = keccak256(toBytes(purchaseId))
        const txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'confirmDelivery',
          args: [purchaseIdBytes32],
        })
        setActionMsg(m => ({ ...m, [purchaseId]: `⏳ Transaction submitted (${txHash.slice(0,10)}...). Confirming on Sepolia...` }))
      }
      // 2. Update DB status
      await confirmPurchase(purchaseId, token)
      setPurchases(p => p.map(x => x.id === purchaseId ? { ...x, status: 'confirmed' } : x))
      setActionMsg(m => ({ ...m, [purchaseId]: '✅ Delivery confirmed! ETH released to seller.' }))
    } catch (err) {
      setActionMsg(m => ({ ...m, [purchaseId]: err.message?.includes('User rejected') ? 'Transaction cancelled.' : err.message }))
    } finally {
      setActionLoading(p => ({ ...p, [purchaseId]: false }))
    }
  }

  async function handleDispute(purchaseId) {
    setActionLoading(p => ({ ...p, [purchaseId]: true }))
    try {
      // 1. Call refund on the smart contract
      if (ESCROW_ADDRESS && walletClient) {
        const purchaseIdBytes32 = keccak256(toBytes(purchaseId))
        const txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'refund',
          args: [purchaseIdBytes32],
        })
        setActionMsg(m => ({ ...m, [purchaseId]: `⏳ Transaction submitted (${txHash.slice(0,10)}...). Processing refund...` }))
      }
      // 2. Update DB status
      await disputePurchase(purchaseId, token)
      setPurchases(p => p.map(x => x.id === purchaseId ? { ...x, status: 'disputed' } : x))
      setActionMsg(m => ({ ...m, [purchaseId]: '⚠️ Refund processed. ETH returned to your wallet.' }))
    } catch (err) {
      setActionMsg(m => ({ ...m, [purchaseId]: err.message?.includes('User rejected') ? 'Transaction cancelled.' : err.message }))
    } finally {
      setActionLoading(p => ({ ...p, [purchaseId]: false }))
    }
  }

  async function handleDownload(purchase) {
    try {
      await downloadFile(purchase.listingId, token, purchase.fileName)
    } catch (err) {
      alert(err.message || 'Download failed.')
    }
  }

  return (
    <div className="container">
      {/* Profile header */}
      <div className="profile-header">
        <div className="profile-avatar-lg">
          {(profile?.username || user?.walletAddress || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div className="profile-name">{profile?.username || 'Anonymous'}</div>
          <div className="profile-address">{user?.walletAddress}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{listings.length}</strong> listings
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{purchases.length}</strong> purchases
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{sales.length}</strong> sales
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={logout} className="btn-ghost">Sign Out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {[
          { id: 'profile', label: '👤 Profile' },
          { id: 'listings', label: `📦 My Listings (${listings.length})` },
          { id: 'purchases', label: `🛒 My Purchases (${purchases.length})` },
          { id: 'sales', label: `💰 My Sales (${sales.length})` },
        ].map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}
            onClick={() => setTab(t.id)}
            id={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 520 }}>
          <form className="profile-edit-form glass-card-sm" onSubmit={handleProfileSave}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>Edit Profile</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username" className="form-input"
                placeholder="yourname"
                value={profileForm.username}
                onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bio">Bio</label>
              <textarea
                id="bio" className="form-textarea"
                placeholder="Tell buyers about yourself…"
                rows={3}
                value={profileForm.bio}
                onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
              />
            </div>
            {profileMsg.text && (
              <div className={`alert alert-${profileMsg.type === 'success' ? 'success' : 'error'}`}>
                {profileMsg.text}
              </div>
            )}
            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={profileLoading} id="save-profile-btn">
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LISTINGS TAB ── */}
      {tab === 'listings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <Link href="/create" className="btn-primary">+ New Listing</Link>
          </div>
          {listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No listings yet</div>
              <div className="empty-desc">Start selling by creating your first listing.</div>
              <div style={{ marginTop: 20 }}>
                <Link href="/create" className="btn-primary">Create Listing</Link>
              </div>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map(l => (
                <div key={l.id} style={{ position: 'relative' }}>
                  <ListingCard listing={l} />
                  <button
                    className="btn-danger btn-sm"
                    style={{ position: 'absolute', top: 12, right: 12, borderRadius: 'var(--radius-sm)' }}
                    onClick={() => handleDeleteListing(l.id)}
                    disabled={actionLoading[l.id]}
                    id={`delete-${l.id}`}
                  >
                    {actionLoading[l.id] ? '…' : '🗑'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PURCHASES TAB ── */}
      {tab === 'purchases' && (
        <div>
          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <div className="empty-title">No purchases yet</div>
              <div className="empty-desc">Browse the marketplace and buy your first digital asset.</div>
              <div style={{ marginTop: 20 }}>
                <Link href="/marketplace" className="btn-primary">Browse Marketplace</Link>
              </div>
            </div>
          ) : (
            <div className="purchase-list">
              {purchases.map(p => (
                <div key={p.id} className="purchase-item">
                  <div className="purchase-info">
                    <div className="purchase-title">{p.listingTitle}</div>
                    <div className="purchase-date">Purchased {formatDate(p.createdAt)} · {p.listingPrice} ETH</div>
                    {actionMsg[p.id] && <div style={{ fontSize: '0.8rem', color: 'var(--green)', marginTop: 6 }}>{actionMsg[p.id]}</div>}
                  </div>
                  <div className="purchase-actions">
                    <StatusBadge status={p.status} />
                    {p.status === 'pending' && (
                      <>
                        <button
                          className="btn-success btn-sm"
                          onClick={() => handleConfirm(p.id)}
                          disabled={actionLoading[p.id]}
                          id={`confirm-${p.id}`}
                        >
                          {actionLoading[p.id] ? '…' : '✅ Confirm'}
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDispute(p.id)}
                          disabled={actionLoading[p.id]}
                          id={`dispute-${p.id}`}
                        >
                          ⚠️ Dispute
                        </button>
                      </>
                    )}
                    {p.status === 'confirmed' && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleDownload(p)}
                        id={`download-${p.id}`}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <Link href={`/marketplace/${p.listingId}`} className="btn-ghost btn-sm">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SALES TAB ── */}
      {tab === 'sales' && (
        <div>
          {sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div className="empty-title">No sales yet</div>
              <div className="empty-desc">Once buyers purchase your listings, they'll appear here.</div>
            </div>
          ) : (
            <div className="purchase-list">
              {sales.map(s => (
                <div key={s.id} className="purchase-item">
                  <div className="purchase-info">
                    <div className="purchase-title">{s.listingTitle}</div>
                    <div className="purchase-date">
                      Buyer: {shortAddress(s.buyerAddress)} · {formatDate(s.createdAt)} · {s.listingPrice} ETH
                    </div>
                  </div>
                  <div className="purchase-actions">
                    <StatusBadge status={s.status} />
                    <Link href={`/marketplace/${s.listingId}`} className="btn-ghost btn-sm">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
