const { ethers } = require("ethers");
const { provider } = require("./rpc.js");

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

function cleanText(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

async function fetchTokenDetails(tokenAddress, { strict = false } = {}) {
  try {
    if (!ethers.isAddress(tokenAddress)) throw new Error(`Invalid token address: ${tokenAddress}`);
    const checksumAddress = ethers.getAddress(tokenAddress);
    const code = await provider.getCode(checksumAddress);
    if (!code || code === "0x") throw new Error("Address has no contract bytecode.");

    const contract = new ethers.Contract(checksumAddress, ERC20_ABI, provider);
    let decimalsResult;
    let totalSupplyResult;
    try {
      [decimalsResult, totalSupplyResult] = await Promise.all([
        contract.decimals(),
        contract.totalSupply(),
      ]);
    } catch (error) {
      if (strict) throw new Error("Contract does not expose required ERC-20 metadata.");
      decimalsResult = 18n;
      totalSupplyResult = 0n;
    }

    const [nameResult, symbolResult] = await Promise.all([
      contract.name().catch(() => "Unknown Token"),
      contract.symbol().catch(() => "UNKNOWN"),
    ]);

    const decimals = Number(decimalsResult);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Invalid ERC-20 decimals.");

    return {
      success: true,
      address: checksumAddress,
      name: cleanText(nameResult, "Unknown Token", 128),
      symbol: cleanText(symbolResult, "UNKNOWN", 32),
      decimals,
      totalSupply: BigInt(totalSupplyResult).toString(),
    };
  } catch (error) {
    return { success: false, address: tokenAddress, error: error.message };
  }
}

async function calculateTokenHolders(tokenAddress) {
  try {
    if (!ethers.isAddress(tokenAddress)) throw new Error(`Invalid token address: ${tokenAddress}`);
    const checksumAddress = ethers.getAddress(tokenAddress);
    const latestBlock = await provider.getBlockNumber();
    const candidates = new Set();
    const batchSize = 1000;

    for (let fromBlock = 0; fromBlock <= latestBlock; fromBlock += batchSize) {
      const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);
      const logs = await provider.getLogs({ address: checksumAddress, fromBlock, toBlock, topics: [TRANSFER_TOPIC] });
      for (const log of logs) {
        for (const topicIndex of [1, 2]) {
          if (!log.topics[topicIndex]) continue;
          const address = ethers.getAddress(`0x${log.topics[topicIndex].slice(26)}`).toLowerCase();
          if (address !== ZERO_ADDRESS) candidates.add(address);
        }
      }
    }

    const contract = new ethers.Contract(checksumAddress, ERC20_ABI, provider);
    let count = 0;
    const addresses = [...candidates];
    for (let i = 0; i < addresses.length; i += 20) {
      const balances = await Promise.all(addresses.slice(i, i + 20).map((address) => contract.balanceOf(address).catch(() => 0n)));
      count += balances.filter((balance) => balance > 0n).length;
    }
    return count;
  } catch {
    return 0;
  }
}

module.exports = { fetchTokenDetails, calculateTokenHolders };
