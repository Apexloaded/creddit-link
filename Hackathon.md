# Creddit Link: Hackathon Progress

## Project Description
**Creddit Link** is a decentralized lending protocol designed to bridge Real World Assets (RWAs) with DeFi. It enables users to unlock the value of their tokenized stock portfolios (e.g., AAPL, NVDA) by using them as collateral to draw a unified, programmable USDG stablecoin credit line. 

Instead of fragmented lending markets for every single asset, Creddit Link consolidates a user's entire portfolio into a single risk-adjusted financial position. This allows users to retain their equity exposure while accessing instant, liquid capital.

## What We Built During the Hackathon

Over the course of the hackathon, we built out an extensive, production-ready smart contract architecture and integrated it into a modern frontend stack to ensure the protocol is both robust and easy to interact with.

### 1. Comprehensive Smart Contract Architecture (Solidity)
We engineered a full suite of core smart contracts to handle multi-asset credit, dynamic risk, and protocol safety:

- **`CredditCreditLine.sol`**: The flagship contract of the protocol. It acts as the central hub managing user positions, allowing multi-asset collateral deposits, borrowing, repayments, and liquidations using a scalable WAD-math based global debt index.
- **`CredditRiskEngine.sol`**: A dynamic risk processor that calculates real-time credit limits, health factors, and liquidatability by evaluating portfolio concentration, dynamic close factors, and collateral-specific risk weights.
- **`CredditAssetRegistry.sol`**: A rigid configuration registry that whitelists eligible RWA collateral assets, defining strict parameters like Loan-to-Value (LTV) ratios, liquidation penalties, and maximum exposure caps to protect against idiosyncratic asset failures.
- **`CredditLendingRouter.sol`**: The USDG gateway that handles the actual minting, burning, and routing of the stablecoin, seamlessly interfacing with the credit line to track total borrows.
- **`CredditInterestRateModel.sol`**: A mathematical model determining the dynamic borrowing interest rates based on current market utilization.
- **`CredditLiquidityPool.sol`**: The underlying stablecoin liquidity layer that facilitates seamless borrowing and repayment flows for the USDG token.
- **`CredditOracle.sol`**: The pricing aggregator designed to interface with decentralized price feeds, ensuring tokenized equities and USDG are priced accurately in real-time.
- **`CredditTreasury.sol`**: A secure vault for collecting and managing protocol fees generated from borrowing interest and liquidation events.
- **`CredditLens.sol`**: A specialized read-only helper contract that aggregates complex on-chain state into single, efficient RPC calls, drastically simplifying data fetching for the frontend.

### 2. Frontend Integration for Seamless Interaction
To make this complex financial architecture highly accessible, we built a modern frontend ecosystem utilizing a Turborepo monorepo:
- **Next.js Web App (`apps/web`)**: A fully responsive, user-friendly interface built with Next.js, allowing users to effortlessly open credit lines, manage their collateral portfolio, and borrow/repay USDG with just a few clicks.
- **Wallet Connection & Web3 Integration**: Integrated standard Web3 tooling (like wagmi and viem) to connect user wallets securely, bridging the gap between the on-chain smart contracts and the frontend UI.
- **Data Aggregation via Lens**: Leveraged the `CredditLens` contract in the frontend to instantly display a user's health factor, available credit, and total debt without making dozens of individual RPC calls, ensuring a snappy, lag-free experience.
- **Shared UI Library (`@repo/ui`)**: Developed a reusable React component library to ensure a consistent, premium design aesthetic across the entire application ecosystem.

## Next Steps Post-Hackathon
- **Testnet Deployment**: Deploy the core protocol to a public testnet (e.g., Sepolia or Base Sepolia) for community beta testing.
- **Security Audits**: Conduct comprehensive testing and independent security reviews of the risk engine and WAD math accounting.
- **RWA Partnerships**: Finalize integration paths with tokenized stock issuers to officially whitelist the first batch of collateral assets.
