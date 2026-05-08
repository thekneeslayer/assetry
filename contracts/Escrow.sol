// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AssetryEscrow
 * @notice Single-contract escrow for Assetry marketplace.
 *         Each purchase creates an escrow entry inside this contract.
 *         The buyer deposits ETH, which is held until:
 *           - Buyer calls confirmDelivery() → ETH released to seller
 *           - Buyer calls refund()          → ETH returned to buyer
 */
contract AssetryEscrow {

    enum State { AWAITING_PAYMENT, PENDING, CONFIRMED, REFUNDED }

    struct EscrowEntry {
        address payable buyer;
        address payable seller;
        uint256 amount;
        State   state;
    }

    // purchaseId (bytes32 hash of off-chain DB id) → escrow entry
    mapping(bytes32 => EscrowEntry) public escrows;

    // ── Events ──────────────────────────────────────────────────
    event Deposited(bytes32 indexed purchaseId, address buyer, address seller, uint256 amount);
    event Confirmed(bytes32 indexed purchaseId, address seller, uint256 amount);
    event Refunded (bytes32 indexed purchaseId, address buyer,  uint256 amount);

    // ── Deposit ─────────────────────────────────────────────────
    /**
     * @notice Buyer calls this with msg.value = listing price.
     * @param purchaseId  keccak256 of the off-chain purchase UUID
     * @param seller      seller's wallet address
     */
    function deposit(bytes32 purchaseId, address payable seller) external payable {
        require(msg.value > 0, "Must send ETH");
        require(escrows[purchaseId].buyer == address(0), "Escrow already exists");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Buyer and seller cannot be the same");

        escrows[purchaseId] = EscrowEntry({
            buyer:  payable(msg.sender),
            seller: seller,
            amount: msg.value,
            state:  State.PENDING
        });

        emit Deposited(purchaseId, msg.sender, seller, msg.value);
    }

    // ── Confirm delivery ─────────────────────────────────────────
    /**
     * @notice Buyer confirms they received the asset.
     *         Releases ETH to the seller.
     */
    function confirmDelivery(bytes32 purchaseId) external {
        EscrowEntry storage e = escrows[purchaseId];
        require(e.buyer == msg.sender, "Only buyer can confirm");
        require(e.state == State.PENDING, "Invalid state");

        e.state = State.CONFIRMED;
        uint256 amount = e.amount;

        (bool sent, ) = e.seller.call{value: amount}("");
        require(sent, "ETH transfer to seller failed");

        emit Confirmed(purchaseId, e.seller, amount);
    }

    // ── Refund ───────────────────────────────────────────────────
    /**
     * @notice Buyer requests a refund (dispute).
     *         Returns ETH to the buyer.
     *         In a production system this would require admin approval.
     */
    function refund(bytes32 purchaseId) external {
        EscrowEntry storage e = escrows[purchaseId];
        require(e.buyer == msg.sender, "Only buyer can refund");
        require(e.state == State.PENDING, "Invalid state");

        e.state = State.REFUNDED;
        uint256 amount = e.amount;

        (bool sent, ) = e.buyer.call{value: amount}("");
        require(sent, "ETH refund failed");

        emit Refunded(purchaseId, e.buyer, amount);
    }

    // ── View ─────────────────────────────────────────────────────
    function getEscrow(bytes32 purchaseId) external view returns (
        address buyer,
        address seller,
        uint256 amount,
        State   state
    ) {
        EscrowEntry storage e = escrows[purchaseId];
        return (e.buyer, e.seller, e.amount, e.state);
    }
}
