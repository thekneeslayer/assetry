const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)


app.get('/', (req, res) => {
  res.json({ message: 'Assetry API running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))