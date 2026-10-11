const { ethers } = require("ethers");
const { provider } = require("./rpc.js");
const { fetchTokenDetails } = require("./tokenService.js");
const { fetchPoolDetails } = require("./poolService.js");
const Pool = require("../models/Pool.model");
const Token = require("../models/Token.model");
const IndexerState = require("../models/IndexerState.model");
const Swap = require("../models/Swap.model");

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || "0xE4C63d8eEAeC2B717c4e24d1Cfa4a57C0A1C7907").toLowerCase();
const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const PAIR_CREATED_TOPIC = ethers.id("PairCreated(address,address,address,uint256)");
const SWAP_TOPIC = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)");
const INDEXER_STATE_KEY = "lastProcessedBlock:v2-genesis";
const BATCH_SIZE = Math.max(50, Math.min(Number(process.env.INDEXER_BATCH_SIZE || 500), 2000));
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.INDEXER_POLL_INTERVAL_MS || 12000));

const FACTORY_ABI = [
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
  "event PairCreated(address indexed token0,address indexed token1,address pair,uint256)",
];
const PAIR_EVENT_ABI = [
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)",
];
const factoryInterface = new ethers.Interface(FACTORY_ABI);
const pairInterface = new ethers.Interface(PAIR_EVENT_ABI);
const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

async function getLastProcessedBlock() {
  const state = await IndexerState.findOne({ key: INDEXER_STATE_KEY }).lean();
  return state ? Number(state.blockNumber) : null;
}

async function saveLastProcessedBlock(blockNumber) {
  await IndexerState.findOneAndUpdate(
    { key: INDEXER_STATE_KEY },
    { $set: { blockNumber: Number(blockNumber) } },
    { upsert: true, new: true }
  );
}

async function ensureToken(tokenAddress, source = "indexer") {
  try {
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) return null;
    const normalizedAddress = tokenAddress.toLowerCase();
    const existing = await Token.findOne({ address: normalizedAddress });
    if (existing) {
      if (source === "pool" && existing.source !== "pool") {
        existing.source = "pool";
        await existing.save();
      }
      return existing;
    }

    const details = await fetchTokenDetails(tokenAddress, { strict: true });
    if (!details?.success) return null;

    const token = await Token.findOneAndUpdate(
      { address: normalizedAddress },
      {
        $set: {
          name: details.name || "Unknown Token",
          symbol: details.symbol || "UNKNOWN",
          decimals: Number(details.decimals ?? 18),
          totalSupply: details.totalSupply || "0",
          source,
          verified: false,
        },
        $setOnInsert: { holders: 0, createdAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ [TOKEN] ${token.symbol} ${normalizedAddress}`);
    return token;
  } catch (error) {
    console.warn(`⚠️ Token discovery failed for ${tokenAddress}: ${error.message}`);
    return null;
  }
}

async function upsertPool(pairAddress, blockNumber = null) {
  try {
    if (!pairAddress || !ethers.isAddress(pairAddress)) throw new Error(`Invalid pair address: ${pairAddress}`);
    const checksumPair = ethers.getAddress(pairAddress);
    const normalizedPair = checksumPair.toLowerCase();
    if (normalizedPair === FACTORY_ADDRESS || normalizedPair === ZERO_ADDRESS) throw new Error("Invalid pair address.");

    const poolData = await fetchPoolDetails(checksumPair);
    if (!poolData?.success) throw new Error(poolData?.error || "Could not fetch pool details.");

    await Promise.all([
      ensureToken(poolData.token0, "pool"),
      ensureToken(poolData.token1, "pool"),
    ]);

    const existingPool = await Pool.findOne({ pairAddress: normalizedPair });
    const oldPrice = existingPool ? Number(existingPool.price) : 0;
    const currentPrice = Number(poolData.price || 0);
    const resolvedBlockNumber = blockNumber !== null
      ? Number(blockNumber)
      : Number(poolData.blockNumber || (await provider.getBlockNumber()));

    const pool = await Pool.findOneAndUpdate(
      { pairAddress: normalizedPair },
      {
        $set: {
          poolName: `${poolData.token0Symbol}/${poolData.token1Symbol}`,
          token0: poolData.token0.toLowerCase(),
          token1: poolData.token1.toLowerCase(),
          token0Symbol: poolData.token0Symbol,
          token1Symbol: poolData.token1Symbol,
          token0Decimals: Number(poolData.token0Decimals),
          token1Decimals: Number(poolData.token1Decimals),
          reserve0: poolData.reserve0,
          reserve1: poolData.reserve1,
          price: currentPrice,
          priceChange: oldPrice > 0 ? currentPrice - oldPrice : 0,
          blockNumber: resolvedBlockNumber,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ [POOL] ${pool.poolName} ${pool.pairAddress}`);
    return pool;
  } catch (error) {
    console.warn(`⚠️ Pool indexing failed for ${pairAddress}: ${error.message}`);
    return null;
  }
}

async function syncFactoryPools() {
  const pairCount = Number(await factoryContract.allPairsLength());
  console.log(`🏭 Factory contains ${pairCount} pair(s).`);
  for (let i = 0; i < pairCount; i += 1) {
    try {
      await upsertPool(await factoryContract.allPairs(i));
    } catch (error) {
      console.warn(`⚠️ Factory pair #${i} sync failed: ${error.message}`);
    }
  }
}

async function cleanupInvalidPools() {
  await Pool.deleteMany({
    $or: [
      { pairAddress: FACTORY_ADDRESS },
      { pairAddress: ZERO_ADDRESS },
      { token0: "" },
      { token1: "" },
    ],
  });
}

async function processPairCreatedLogs(fromBlock, toBlock) {
  const logs = await provider.getLogs({
    address: FACTORY_ADDRESS,
    fromBlock,
    toBlock,
    topics: [PAIR_CREATED_TOPIC],
  });
  for (const log of logs) {
    try {
      const parsed = factoryInterface.parseLog(log);
      if (parsed) await upsertPool(parsed.args.pair, log.blockNumber);
    } catch (error) {
      console.warn(`⚠️ PairCreated parse failed at ${log.blockNumber}: ${error.message}`);
    }
  }
}

async function processTransferLogs(fromBlock, toBlock) {
  const logs = await provider.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC] });
  if (!logs.length) return;

  const pairAddresses = new Set(await getIndexedPairAddresses());
  const candidates = new Set();
  for (const log of logs) {
    const address = String(log.address || "").toLowerCase();
    if (ethers.isAddress(address) && !pairAddresses.has(address)) candidates.add(address);
  }

  for (const address of candidates) {
    const exists = await Token.exists({ address });
    if (!exists) await ensureToken(address, "indexer");
  }
}

async function getIndexedPairAddresses() {
  const pools = await Pool.find({ isActive: true }).select({ pairAddress: 1, _id: 0 }).lean();
  return pools
    .map((pool) => pool.pairAddress)
    .filter((address) => address && ethers.isAddress(address))
    .map((address) => address.toLowerCase());
}

async function getBlockTimestampDate(blockNumber, cache) {
  const key = Number(blockNumber);
  if (cache.has(key)) return cache.get(key);
  const block = await provider.getBlock(key);
  if (!block) throw new Error(`Could not read block ${key}.`);
  const date = new Date(Number(block.timestamp) * 1000);
  cache.set(key, date);
  return date;
}

async function processSwapLogs(fromBlock, toBlock) {
  const pairAddresses = await getIndexedPairAddresses();
  if (!pairAddresses.length) return;

  const logs = await provider.getLogs({
    address: pairAddresses,
    fromBlock,
    toBlock,
    topics: [SWAP_TOPIC],
  });
  if (!logs.length) return;

  const timestampCache = new Map();
  for (const log of logs) {
    try {
      const parsed = pairInterface.parseLog(log);
      if (!parsed) continue;
      const transactionHash = String(log.transactionHash || "").toLowerCase();
      const logIndex = Number(log.index ?? log.logIndex);
      if (!transactionHash || !Number.isInteger(logIndex)) continue;

      await Swap.findOneAndUpdate(
        { transactionHash, logIndex },
        {
          $set: {
            pairAddress: log.address.toLowerCase(),
            transactionHash,
            logIndex,
            blockNumber: Number(log.blockNumber),
            blockTimestamp: await getBlockTimestampDate(log.blockNumber, timestampCache),
            sender: String(parsed.args.sender).toLowerCase(),
            to: String(parsed.args.to).toLowerCase(),
            amount0In: parsed.args.amount0In.toString(),
            amount1In: parsed.args.amount1In.toString(),
            amount0Out: parsed.args.amount0Out.toString(),
            amount1Out: parsed.args.amount1Out.toString(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      console.warn(`⚠️ Swap processing failed at ${log.blockNumber}: ${error.message}`);
    }
  }
}

async function refreshAllPools(blockNumber = null) {
  const pools = await Pool.find({ isActive: true }).select({ pairAddress: 1 }).lean();
  for (const pool of pools) await upsertPool(pool.pairAddress, blockNumber);
}

async function scanBlockRange(fromBlock, toBlock) {
  await processPairCreatedLogs(fromBlock, toBlock);
  await processTransferLogs(fromBlock, toBlock);
  await processSwapLogs(fromBlock, toBlock);
}

async function scanUntil(currentBlock, targetBlock, label) {
  let cursor = currentBlock;
  while (cursor < targetBlock) {
    const fromBlock = cursor + 1;
    const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, targetBlock);
    console.log(`🔍 [${label}] ${fromBlock} -> ${toBlock}`);
    await scanBlockRange(fromBlock, toBlock);
    cursor = toBlock;
    await saveLastProcessedBlock(cursor);
  }
  return cursor;
}

async function startIndexer() {
  console.log("==================================================");
  console.log("🚀 Starting NumenDEX genesis indexer...");
  console.log(`🏭 Factory: ${FACTORY_ADDRESS}`);
  console.log("==================================================");

  try {
    const pairCount = await factoryContract.allPairsLength();
    console.log(`✅ Factory reachable. Pair count: ${pairCount.toString()}`);
    await cleanupInvalidPools();

    const latestBlock = await provider.getBlockNumber();
    const savedBlock = await getLastProcessedBlock();
    let currentBlock;

    if (savedBlock === null) {
      // -1 makes the first scanned range start at genesis block 0.
      currentBlock = -1;
      console.log(`📦 First v2 run. Scanning genesis block 0 -> ${latestBlock}.`);
    } else {
      currentBlock = savedBlock;
      console.log(`📦 Resuming from block ${currentBlock + 1}. Latest: ${latestBlock}.`);
    }

    currentBlock = await scanUntil(currentBlock, latestBlock, savedBlock === null ? "GENESIS" : "CATCH-UP");

    // Factory enumeration is a second source of truth in case an RPC log batch was missed.
    await syncFactoryPools();
    await refreshAllPools(latestBlock);

    console.log("==================================================");
    console.log("✅ Indexer synchronized. Live polling started.");
    console.log("==================================================");

    let polling = false;
    setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const newLatestBlock = await provider.getBlockNumber();
        if (newLatestBlock > currentBlock) {
          currentBlock = await scanUntil(currentBlock, newLatestBlock, "LIVE");
          await refreshAllPools(currentBlock);
        }
      } catch (error) {
        console.error("❌ [LIVE INDEXER]:", error.message);
      } finally {
        polling = false;
      }
    }, POLL_INTERVAL_MS);
  } catch (error) {
    console.error("❌ [FATAL INDEXER]:", error.message);
  }
}

module.exports = {
  startIndexer,
  syncFactoryPools,
  refreshAllPools,
  upsertPool,
  processSwapLogs,
  ensureToken,
};
