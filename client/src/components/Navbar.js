'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import WalletConnect from './WalletConnect'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/create', label: 'Sell' },
    { href: '/dashboard', label: 'Dashboard' },
  ]

  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">Assetry</span>
        </Link>

        {/* Desktop nav */}
        <div className="navbar-links">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'nav-link-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <div className="user-menu">
              <Link href="/dashboard" className="user-pill">
                <span className="user-avatar">
                  {(user.username || user.walletAddress || '?')[0].toUpperCase()}
                </span>
                <span className="user-name">
                  {user.username || shortAddress(user.walletAddress)}
                </span>
              </Link>
              <button onClick={logout} className="btn-ghost btn-sm">Logout</button>
            </div>
          ) : (
            <WalletConnect />
          )}

          {/* Mobile menu toggle */}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {!user && <WalletConnect />}
        </div>
      )}
    </nav>
  )
}
