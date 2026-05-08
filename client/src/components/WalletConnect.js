'use client'
import { useState } from 'react'
import { useAccount, useConnect, useSignMessage, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { SiweMessage } from 'siwe'
import { getNonce, verifySignature } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export default function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectAsync } = useConnect()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    setError('')
    setLoading(true)
    try {
      let connectedAddress = address
      if (!isConnected) {
        const result = await connectAsync({ connector: metaMask() })
        connectedAddress = result.accounts[0]
      }

      // 1. Get nonce from backend
      const { nonce } = await getNonce()

      // 2. Build and sign SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: connectedAddress,
        statement: 'Sign in to Assetry - the decentralized digital goods marketplace.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      })

      const messageStr = message.prepareMessage()
      const signature = await signMessageAsync({ message: messageStr })

      // 3. Verify with backend → get JWT
      const { token, user } = await verifySignature(messageStr, signature)
      login(token, user)
    } catch (err) {
      console.error('Connect error:', err)
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wallet-connect">
      {error && <span className="wallet-error">{error}</span>}
      <button
        className="btn-primary"
        onClick={handleConnect}
        disabled={loading}
        id="wallet-connect-btn"
      >
        {loading ? (
          <span className="btn-spinner">Connecting…</span>
        ) : (
          <>
            <span className="metamask-icon">🦊</span>
            Connect Wallet
          </>
        )}
      </button>
    </div>
  )
}
