'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getListings } from '@/lib/api'
import ListingCard from '@/components/ListingCard'
import WalletConnect from '@/components/WalletConnect'
import { useAuth } from '@/context/AuthContext'

const FEATURES = [
  { icon: '🔒', title: 'Escrow Security', desc: 'Funds are held safely in escrow and only released after you confirm successful delivery.' },
  { icon: '⛓️', title: 'Blockchain Auth', desc: 'Sign in with your Ethereum wallet — no passwords, no accounts, no data held against you.' },
  { icon: '⚡', title: 'Instant Access', desc: 'Once payment is confirmed and delivery acknowledged, your digital asset is instantly available.' },
  { icon: '🌐', title: 'Decentralized', desc: 'Built on open standards. No platform fees, no intermediary, no censorship.' },
]

const HOW_IT_WORKS = [
  { n: '01', title: 'Connect Wallet', desc: 'Link your MetaMask wallet and sign a message to authenticate securely.' },
  { n: '02', title: 'Browse Assets', desc: 'Explore thousands of digital goods — software, art, music, templates, ebooks.' },
  { n: '03', title: 'Buy with Escrow', desc: 'Funds are locked in escrow. The seller only gets paid after you confirm delivery.' },
  { n: '04', title: 'Receive & Confirm', desc: 'Download your asset, confirm delivery, and release payment to the seller.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getListings()
      .then(data => setFeatured(data.slice(0, 6)))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* ── HERO ─────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span>⬡</span>
            <span>Trustless digital commerce, powered by Web3</span>
          </div>

          <h1 className="hero-title">
            The market for<br />
            <span className="gradient-text">digital assets</span><br />
            you can trust.
          </h1>

          <p className="hero-sub">
            Buy and sell software, art, music, and more with blockchain-secured escrow.
            No middlemen. No risk. Just seamless, trustless transactions.
          </p>

          <div className="hero-actions">
            <Link href="/marketplace" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Browse Marketplace
            </Link>
            {user ? (
              <Link href="/create" className="btn-secondary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
                List Your Asset
              </Link>
            ) : (
              <WalletConnect />
            )}
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">∞</div>
              <div className="stat-label">Digital Assets</div>
            </div>
            <div className="stat">
              <div className="stat-value">0%</div>
              <div className="stat-label">Platform Fees</div>
            </div>
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">Escrow Protected</div>
            </div>
            <div className="stat">
              <div className="stat-value">Web3</div>
              <div className="stat-label">Auth Standard</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED LISTINGS ────── */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ marginBottom: 40 }}>
            <p className="section-eyebrow">Featured</p>
            <h2 className="section-title">Latest on the marketplace</h2>
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading assets…</span></div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-title">No listings yet</div>
              <div className="empty-desc">Be the first to list a digital asset!</div>
              <div style={{ marginTop: 20 }}>
                <Link href="/create" className="btn-primary">Create Listing</Link>
              </div>
            </div>
          ) : (
            <div className="listings-grid">
              {featured.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}

          {featured.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link href="/marketplace" className="btn-secondary">View All Assets →</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────── */}
      <section className="how-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-eyebrow">Simple process</p>
            <h2 className="section-title">How Assetry works</h2>
            <p className="section-sub" style={{ margin: '16px auto 0' }}>
              Four steps from connecting your wallet to receiving your digital asset — all secured by escrow.
            </p>
          </div>
          <div className="steps-grid">
            {HOW_IT_WORKS.map(s => (
              <div key={s.n} className="step-card">
                <div className="step-number">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────── */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-eyebrow">Why choose us</p>
            <h2 className="section-title">Built for trust</h2>
          </div>
          <div className="steps-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="step-card">
                <div className="step-number" style={{ fontSize: '1.4rem' }}>{f.icon}</div>
                <div className="step-title">{f.title}</div>
                <div className="step-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────── */}
      {!user && (
        <section style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div className="glass-card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: 12 }}>
              Ready to get started?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
              Connect your wallet in seconds and start buying or selling digital goods today.
            </p>
            <WalletConnect />
          </div>
        </section>
      )}
    </>
  )
}
