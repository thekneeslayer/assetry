const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/users/me — get own profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// PATCH /api/users/me — update username, bio, or avatarUrl
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { username, bio, avatarUrl } = req.body
    const updates = {}

    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' })
      }
      // Check uniqueness (exclude current user)
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing && existing.id !== req.user.userId) {
        return res.status(409).json({ error: 'Username already taken' })
      }
      updates.username = username
    }

    if (bio !== undefined) updates.bio = bio
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: updates,
    })

    res.json(updated)
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /api/users/:id — get public profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Return only public fields
    const { id, walletAddress, username, bio, avatarUrl, createdAt } = user
    res.json({ id, walletAddress, username, bio, avatarUrl, createdAt })
  } catch (err) {
    console.error('Get public user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

module.exports = router
