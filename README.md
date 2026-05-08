# Assetry – Escrow-Based Digital Goods Marketplace

Assetry is a decentralized marketplace for buying and selling digital goods such as software, digital art, and downloadable assets. Payments are secured using blockchain-based escrow, where funds are held in a smart contract and only released to the seller after the buyer confirms successful delivery. This ensures trustless, transparent, and secure transactions without relying on intermediaries.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 + React 19 |
| Backend | Node.js + Express 5 |
| Blockchain | Solidity + Hardhat |
| Wallet Library | Wagmi v2 + Viem |
| Database | PostgreSQL + Prisma |
| Auth | SIWE (Sign-In with Ethereum) |
| File Uploads | Multer |
| Smart Contract Network | Ethereum Sepolia Testnet |

## Project Structure

```
assetry/
├── client/                  # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js              # Home / landing page
│   │   │   ├── marketplace/
│   │   │   │   ├── page.js          # Browse listings
│   │   │   │   └── [id]/page.js     # Listing detail + buy
│   │   │   ├── create/page.js       # Create a listing
│   │   │   └── dashboard/page.js    # User dashboard
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── WalletConnect.js
│   │   │   └── ListingCard.js
│   │   ├── context/
│   │   │   └── AuthContext.js       # JWT + user session
│   │   ├── lib/
│   │   │   ├── api.js               # API call helpers
│   │   │   └── escrowAbi.js         # Smart contract ABI
│   │   └── config/
│   │       └── wagmi.js             # Wagmi + MetaMask config
│
├── server/                  # Node.js + Express backend
│   ├── routes/
│   │   ├── auth.js          # SIWE nonce + JWT verify
│   │   ├── listings.js      # CRUD + file upload + download
│   │   ├── purchases.js     # Escrow purchase lifecycle
│   │   └── users.js         # Profile management
│   ├── middleware/
│   │   ├── auth.js          # JWT auth middleware
│   │   └── upload.js        # Multer file upload config
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── uploads/             # Stored product files (gitignored)
│   └── index.js             # Express app entry point
│
├── contracts/
│   └── Escrow.sol           # Solidity escrow smart contract
│
└── scripts/
    └── deploy.js            # Hardhat deployment script
```

## How It Works

1. **Seller** connects MetaMask → signs in via SIWE → creates a listing with a product file and preview image
2. **Buyer** browses the marketplace → clicks Buy → MetaMask sends Sepolia ETH to the escrow smart contract
3. ETH is locked in the contract until the buyer confirms delivery
4. **Buyer** confirms delivery → MetaMask calls `confirmDelivery()` on the contract → ETH is released to the seller
5. Buyer can now download the product file
6. If there's an issue, the buyer can call `refund()` to get their ETH back

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- MetaMask with Sepolia ETH

### 1. Install dependencies

```bash
# Client
cd client && npm install

# Server
cd server && npm install
```

### 2. Configure environment

**`server/.env`**
```
DATABASE_URL=postgresql://user:password@localhost:5432/assetry
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
PORT=5000
```

**`client/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ESCROW_ADDRESS=0xYourDeployedContractAddress
```

### 3. Run database migrations

```bash
cd server && npx prisma migrate dev
```

### 4. Deploy the smart contract (one-time)

Create `contracts/.env`:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey
```

Then deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the printed contract address into `client/.env.local`.

### 5. Run the app

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
