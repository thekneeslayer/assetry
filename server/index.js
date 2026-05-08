const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// Serve uploaded files (preview images accessible publicly, product files gated by auth route)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
const authRoutes = require('./routes/auth')
const listingRoutes = require('./routes/listings')
const purchaseRoutes = require('./routes/purchases')
const userRoutes = require('./routes/users')

app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/purchases', purchaseRoutes)
app.use('/api/users', userRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Assetry API running 🚀', version: '1.0.0' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`✅ Assetry API running on port ${PORT}`))