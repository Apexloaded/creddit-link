export const credditLensAbi = [
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "neededRole",
        type: "bytes32",
      },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "AddressEmptyCode",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "ERC1967InvalidImplementation",
    type: "error",
  },
  {
    inputs: [],
    name: "ERC1967NonPayable",
    type: "error",
  },
  {
    inputs: [],
    name: "EnforcedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "ExpectedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "FailedCall",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidInitialization",
    type: "error",
  },
  {
    inputs: [],
    name: "NotInitializing",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [],
    name: "UUPSUnauthorizedCallContext",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "slot",
        type: "bytes32",
      },
    ],
    name: "UUPSUnsupportedProxiableUUID",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddressProvided",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "SystemPaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "unpauser",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "SystemUnpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "Upgraded",
    type: "event",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UPGRADE_INTERFACE_VERSION",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
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
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
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
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "admin",
        type: "address",
      },
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
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
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
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;
