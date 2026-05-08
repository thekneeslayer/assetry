const express = require('express')
const router = express.Router()
const { SiweMessage } = require('siwe')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Step 1 - Frontend requests a nonce for the wallet address
router.get('/nonce', (req, res) => {
  const nonce = Math.random().toString(36).substring(2, 15)
  res.json({ nonce })
})

// Step 2 - Frontend sends back the signed message
router.post('/verify', async (req, res) => {
  try {
    const { message, signature } = req.body

    // Verify the signed message
    const siweMessage = new SiweMessage(message)
    const { data } = await siweMessage.verify({ signature })
    const walletAddress = data.address

    // Find or create the user
    let user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user) {
      user = await prisma.user.create({ data: { walletAddress } })
    }

    // Issue a JWT
    const token = jwt.sign(
      { userId: user.id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user })
  } catch (err) {
    res.status(400).json({ error: 'Verification failed' })
  }
})

module.exports = router