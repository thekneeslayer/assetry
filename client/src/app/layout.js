'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/config/wagmi'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import './globals.css'

const queryClient = new QueryClient()

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Assetry — Decentralized Digital Goods Marketplace</title>
        <meta name="description" content="Buy and sell digital goods with blockchain-secured escrow. No intermediaries, no compromise." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <div className="page-wrapper">
                <Navbar />
                <main className="page-content">
                  {children}
                </main>
                <footer className="footer">
                  <div className="footer-inner">
                    <div className="footer-logo">
                      <span style={{ color: 'var(--accent-light)' }}>⬡</span>
                      <span>Assetry</span>
                    </div>
                    <p className="footer-text">© 2025 Assetry. Trustless digital commerce.</p>
                    <div className="footer-links">
                      <a href="/marketplace" className="footer-link">Marketplace</a>
                      <a href="/create" className="footer-link">Sell</a>
                      <a href="/dashboard" className="footer-link">Dashboard</a>
                    </div>
                  </div>
                </footer>
              </div>
            </AuthProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
