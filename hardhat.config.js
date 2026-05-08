import { defineConfig } from 'hardhat/config'
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import dotenv from 'dotenv'
dotenv.config({ path: './contracts/.env' })

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: '0.8.24',
  networks: {
    ...(SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY ? {
      sepolia: {
        type: 'http',
        url: SEPOLIA_RPC_URL,
        accounts: [DEPLOYER_PRIVATE_KEY],
      },
    } : {}),
  },
})
