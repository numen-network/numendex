export const NUMEN_NETWORK = {
  chainId: 32026,
  chainIdHex: "0x7D1A",
  chainName: "Numen Network",

  nativeCurrency: {
    name: "Numen",
    symbol: "NUMN",
    decimals: 18,
  },

  rpcUrls: [
    "https://rpc.numen-network.org",
  ],

  blockExplorerUrls: [
    "https://explorer.numen-network.org",
  ],
};

export const CONTRACT_ADDRESSES = {
  FACTORY:
    "0xE4C63d8eEAeC2B717c4e24d1Cfa4a57C0A1C7907",

  ROUTER:
    "0x546Bb0eB20fca50a9f9c7DFcb9b983dc96045d10",
};

export const TOKEN_ADDRESSES = {
  NUMN:
    "0x0000000000000000000000000000000000000802",

  NDEX:
    "0x2456f756084bc884f59bf1aa92845dee142cdb56",

  TEST:
    "0xa417b372ed6d6076fcce02f531f709b261fc2845",
};

export const DEFAULT_TOKEN = {
  address:
    TOKEN_ADDRESSES.NUMN,

  name: "Numen",
  symbol: "NUMN",
  decimals: 18,

  /*
   * NUMN is the native Numen asset,
   * but it is also available through
   * the system ERC-20 address above.
   *
   * NumenDEX swaps use that ERC-20
   * compatible system address.
   */
  isNative: true,
};

export default NUMEN_NETWORK;