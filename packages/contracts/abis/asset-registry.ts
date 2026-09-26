export const AssetRegistryAbi = [
  {
    inputs: [],
    name: "assetCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "getAsset",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "token",
            type: "address",
          },
          {
            internalType: "uint16",
            name: "collateralFactorBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationThresholdBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationPenaltyBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationBonusBps",
            type: "uint16",
          },
          {
            internalType: "uint256",
            name: "maxExposure",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "decimals",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "isEnabled",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isListed",
            type: "bool",
          },
        ],
        internalType: "struct CredditAssetRegistry.AssetConfig",
        name: "",
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
        name: "token",
        type: "address",
      },
    ],
    name: "isEnabled",
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
        name: "token",
        type: "address",
      },
    ],
    name: "isListed",
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
        internalType: "bool",
        name: "onlyEnabled",
        type: "bool",
      },
    ],
    name: "listAssets",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "token",
            type: "address",
          },
          {
            internalType: "uint16",
            name: "collateralFactorBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationThresholdBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationPenaltyBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "liquidationBonusBps",
            type: "uint16",
          },
          {
            internalType: "uint256",
            name: "maxExposure",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "decimals",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "isEnabled",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isListed",
            type: "bool",
          },
        ],
        internalType: "struct CredditAssetRegistry.AssetConfig[]",
        name: "",
        type: "tuple[]",
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
] as const;
