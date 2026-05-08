const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')

const prisma = new PrismaClient()

// POST /api/purchases — initiate a purchase (escrow: pending)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, txHash } = req.body
    if (!listingId) return res.status(400).json({ error: 'listingId is required' })

    const listing = await prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) return res.status(404).json({ error: 'Listing not found' })

    // Prevent self-purchase
    if (listing.sellerId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot purchase your own listing' })
    }

    const purchase = await prisma.purchase.create({
      data: {
        listingId,
        listingTitle: listing.title,
        listingPrice: listing.price,
        sellerId: listing.sellerId,
        sellerAddress: listing.sellerAddress,
        buyerId: req.user.userId,
        buyerAddress: req.user.walletAddress,
        status: 'pending',
        txHash: txHash || null,
      },
    })

    // Increment listing sales count
    await prisma.listing.update({
      where: { id: listingId },
      data: { salesCount: { increment: 1 } },
    })

    res.status(201).json(purchase)
  } catch (err) {
    console.error('Create purchase error:', err)
    res.status(500).json({ error: 'Failed to create purchase' })
  }
})

// GET /api/purchases/my — all purchases by the logged-in buyer
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { buyerId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(purchases)
  } catch (err) {
    console.error('Get purchases error:', err)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

// GET /api/purchases/sales — all sales by the logged-in seller
router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const sales = await prisma.purchase.findMany({
      where: { sellerId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(sales)
  } catch (err) {
    console.error('Get sales error:', err)
    res.status(500).json({ error: 'Failed to fetch sales' })
  }
})

// PATCH /api/purchases/:id/tx — save txHash after on-chain deposit
router.patch('/:id/tx', authMiddleware, async (req, res) => {
  try {
    const { txHash } = req.body
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } })
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
    if (purchase.buyerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    await prisma.purchase.update({
      where: { id: req.params.id },
      data: { txHash },
    })
    res.json({ message: 'Transaction hash saved' })
  } catch (err) {
    console.error('Save txHash error:', err)
    res.status(500).json({ error: 'Failed to save transaction hash' })
  }
})

// PATCH /api/purchases/:id/confirm — buyer confirms delivery, releases escrow
router.patch('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } })
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })

    if (purchase.buyerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the buyer can confirm delivery' })
    }
    if (purchase.status !== 'pending') {
      return res.status(400).json({ error: `Cannot confirm a purchase with status: ${purchase.status}` })
    }

    await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    })

    res.json({ message: 'Delivery confirmed — escrow released to seller' })
  } catch (err) {
    console.error('Confirm purchase error:', err)
    res.status(500).json({ error: 'Failed to confirm purchase' })
  }
})

// PATCH /api/purchases/:id/dispute — buyer raises a dispute
router.patch('/:id/dispute', authMiddleware, async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } })
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })

    if (purchase.buyerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the buyer can raise a dispute' })
    }
    if (purchase.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot dispute this purchase' })
    }

    await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: 'disputed', disputedAt: new Date() },
    })

    res.json({ message: 'Dispute raised — admin will review' })
  } catch (err) {
    console.error('Dispute purchase error:', err)
    res.status(500).json({ error: 'Failed to raise dispute' })
  }
})

module.exports = router
