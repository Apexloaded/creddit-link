export const credditLensAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "credditLine",
        type: "address",
      },
      {
        internalType: "address",
        name: "liquidityPool",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "cl",
    outputs: [
      {
        internalType: "contract ICredditCreditLine",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
    ],
    name: "getLiquidatablePositions",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "positionId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "debtWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "collateralValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "creditLimitUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "liquidationValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "healthFactorWad",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isLiquidatable",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isClosed",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isStale",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isValid",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isLiquidated",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "cumulativeBorrowed",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "cumulativeRepaid",
            type: "uint256",
          },
          {
            internalType: "uint64",
            name: "liquidatedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "openedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "closedAt",
            type: "uint64",
          },
          {
            components: [
              {
                internalType: "string",
                name: "symbol",
                type: "string",
              },
              {
                internalType: "address",
                name: "asset",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "priceInUsd",
                type: "uint256",
              },
            ],
            internalType: "struct CredditLens.CollateralDetail[]",
            name: "collaterals",
            type: "tuple[]",
          },
        ],
        internalType: "struct CredditLens.PositionSummary[]",
        name: "liquidatableSummaries",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
    ],
    name: "getPositionsBatch",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "positionId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "debtWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "collateralValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "creditLimitUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "liquidationValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "healthFactorWad",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isLiquidatable",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isClosed",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isStale",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isValid",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isLiquidated",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "cumulativeBorrowed",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "cumulativeRepaid",
            type: "uint256",
          },
          {
            internalType: "uint64",
            name: "liquidatedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "openedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "closedAt",
            type: "uint64",
          },
          {
            components: [
              {
                internalType: "string",
                name: "symbol",
                type: "string",
              },
              {
                internalType: "address",
                name: "asset",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "priceInUsd",
                type: "uint256",
              },
            ],
            internalType: "struct CredditLens.CollateralDetail[]",
            name: "collaterals",
            type: "tuple[]",
          },
        ],
        internalType: "struct CredditLens.PositionSummary[]",
        name: "summaries",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserPortfolioSummary",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "totalPositionsCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalRawCollateralUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalDebtUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "liquidityBalance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalCreditLimitUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalLiquidationValueUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "netBorrowingPowerUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalHealthFactorWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "weightedLtvBps",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "hasAtRiskPosition",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isStale",
            type: "bool",
          },
        ],
        internalType: "struct CredditLens.PortfolioSummary",
        name: "summary",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserPositions",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "positionId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "debtWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "collateralValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "creditLimitUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "liquidationValueWad",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "healthFactorWad",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isLiquidatable",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isClosed",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isStale",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isValid",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isLiquidated",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "cumulativeBorrowed",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "cumulativeRepaid",
            type: "uint256",
          },
          {
            internalType: "uint64",
            name: "liquidatedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "openedAt",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "closedAt",
            type: "uint64",
          },
          {
            components: [
              {
                internalType: "string",
                name: "symbol",
                type: "string",
              },
              {
                internalType: "address",
                name: "asset",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "priceInUsd",
                type: "uint256",
              },
            ],
            internalType: "struct CredditLens.CollateralDetail[]",
            name: "collaterals",
            type: "tuple[]",
          },
        ],
        internalType: "struct CredditLens.PositionSummary[]",
        name: "userPositions",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lp",
    outputs: [
      {
        internalType: "contract CredditLiquidityPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
