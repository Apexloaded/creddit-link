export enum Stock {
  AAPL = "AAPL",
  AMZN = "AMZN",
  TSLA = "TSLA",
  SPCX = "SPCX",
  NVDA = "NVDA",
  NFLX = "NFLX",
  GOOGL = "GOOGL",
  IBM = "IBM",
}

export const STOCKS = {
  [Stock.AAPL]: {
    symbol: "AAPL",
    name: "Robinhood AAPL",
    rhAddress: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
  },
  [Stock.AMZN]: {
    symbol: "AMZN",
    name: "Robinhood AMZN",
    rhAddress: "0x12f190a9F9d7D37a250758b26824B97CE941bF54",
  },
  [Stock.TSLA]: {
    symbol: "TSLA",
    name: "Robinhood TSLA",
    rhAddress: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
  },
  [Stock.SPCX]: {
    symbol: "SPCX",
    name: "Robinhood SPCX",
    rhAddress: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
  },
  [Stock.NVDA]: {
    symbol: "NVDA",
    name: "Robinhood NVDA",
    rhAddress: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  },
  [Stock.NFLX]: {
    symbol: "NFLX",
    name: "Robinhood NFLX",
    rhAddress: "0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8",
  },
  [Stock.GOOGL]: {
    symbol: "GOOGL",
    name: "Robinhood GOOGL",
    rhAddress: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
  },
  [Stock.IBM]: {
    symbol: "IBM",
    name: "Robinhood IBM",
    rhAddress: "0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619",
  },
};

export const toRhLogo = (symbol: Stock) => {
  const address = STOCKS[symbol].rhAddress.toLowerCase();
  const url = `https://cdn.robinhood.com/ncw_assets/logos/${address}.png`;
  console.log(url);
  return url;
};
