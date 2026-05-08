import { network } from 'hardhat'

const { ethers, networkName } = await network.create()

console.log(`Deploying AssetryEscrow to ${networkName}...`)

const escrow = await ethers.deployContract('AssetryEscrow')
console.log('Waiting for deployment transaction to confirm...')
await escrow.waitForDeployment()

const address = await escrow.getAddress()
console.log('✅ AssetryEscrow deployed to:', address)
console.log('')
console.log('Add this to your client/.env.local:')
console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${address}`)
