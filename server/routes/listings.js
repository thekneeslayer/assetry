const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')

const prisma = new PrismaClient()

// GET /api/listings — fetch all listings (optionally filter by category / search)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query

    const where = {}
    if (category && category !== 'all') {
      where.category = category
    }
    if (search) {
      const term = search.toLowerCase()
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ]
    }

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json(listings)
  } catch (err) {
    console.error('Get listings error:', err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// GET /api/listings/seller/:userId — all listings by a seller
router.get('/seller/:userId', async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(listings)
  } catch (err) {
    console.error('Get seller listings error:', err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// GET /api/listings/:id/download — download the product file (confirmed buyers only)
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } })
    if (!listing) return res.status(404).json({ error: 'Listing not found' })
    if (!listing.fileUrl) return res.status(404).json({ error: 'No file attached to this listing' })

    // Allow seller to download their own file
    const isSeller = listing.sellerId === req.user.userId

    // Allow buyers who have a confirmed purchase
    const confirmedPurchase = await prisma.purchase.findFirst({
      where: {
        listingId: req.params.id,
        buyerId: req.user.userId,
        status: 'confirmed',
      },
    })

    if (!isSeller && !confirmedPurchase) {
      return res.status(403).json({ error: 'Purchase and confirm delivery to download this file' })
    }

    const filePath = path.join(__dirname, '..', 'uploads', listing.fileUrl)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' })
    }

    res.download(filePath, listing.fileName || listing.fileUrl)
  } catch (err) {
    console.error('Download error:', err)
    res.status(500).json({ error: 'Failed to download file' })
  }
})

// GET /api/listings/:id — get a single listing
router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    })
    if (!listing) return res.status(404).json({ error: 'Listing not found' })
    res.json(listing)
  } catch (err) {
    console.error('Get listing error:', err)
    res.status(500).json({ error: 'Failed to fetch listing' })
  }
})

// POST /api/listings — create a new listing with file upload (auth required)
router.post('/', authMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'preview', maxCount: 1 },
]), async (req, res) => {
  try {
    const { title, description, price, category, tags } = req.body

    if (!title || !description || !price) {
      if (req.files?.file) fs.unlinkSync(req.files.file[0].path)
      if (req.files?.preview) fs.unlinkSync(req.files.preview[0].path)
      return res.status(400).json({ error: 'Title, description, and price are required' })
    }

    if (!req.files?.file) {
      if (req.files?.preview) fs.unlinkSync(req.files.preview[0].path)
      return res.status(400).json({ error: 'A product file is required' })
    }

    const seller = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!seller) {
      if (req.files?.file) fs.unlinkSync(req.files.file[0].path)
      if (req.files?.preview) fs.unlinkSync(req.files.preview[0].path)
      return res.status(404).json({ error: 'Seller not found' })
    }

    const parsedTags = tags
      ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags)
      : []

    const productFile = req.files.file[0]
    const previewFile = req.files?.preview?.[0]

    // Build preview URL — served as a static file from /uploads/
    const previewUrl = previewFile
      ? `/uploads/${previewFile.filename}`
      : ''

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        fileUrl: productFile.filename,
        fileName: productFile.originalname,
        fileSize: productFile.size,
        previewUrl,
        category: category || 'other',
        tags: parsedTags,
        sellerId: req.user.userId,
        sellerAddress: req.user.walletAddress,
        sellerUsername: seller.username || null,
        salesCount: 0,
      },
    })

    res.status(201).json(listing)
  } catch (err) {
    if (req.files?.file) {
      try { fs.unlinkSync(req.files.file[0].path) } catch (_) {}
    }
    if (req.files?.preview) {
      try { fs.unlinkSync(req.files.preview[0].path) } catch (_) {}
    }
    console.error('Create listing error:', err)
    res.status(500).json({ error: 'Failed to create listing' })
  }
})

// DELETE /api/listings/:id — delete listing and its file (seller only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } })
    if (!listing) return res.status(404).json({ error: 'Listing not found' })
    if (listing.sellerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Delete the file from disk
    if (listing.fileUrl) {
      const filePath = path.join(__dirname, '..', 'uploads', listing.fileUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    await prisma.listing.delete({ where: { id: req.params.id } })
    res.json({ message: 'Listing deleted' })
  } catch (err) {
    console.error('Delete listing error:', err)
    res.status(500).json({ error: 'Failed to delete listing' })
  }
})

module.exports = router
