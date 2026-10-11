const mongoose = require("mongoose");
const { ethers } = require("ethers");
require("../services/env");

const { provider } = require("../services/rpc.js");

const Swap = require("../models/Swap.model");

// ==========================================
// CONFIG
// ==========================================

const FACTORY_ADDRESS =
  (
    process.env.FACTORY_ADDRESS ||
    "0xE4C63d8eEAeC2B717c4e24d1Cfa4a57C0A1C7907"
  ).toLowerCase();

const MONGO_URI =
  process.env.MONGO_URI;

const BATCH_SIZE =
  Number(
    process.env.SWAP_BACKFILL_BATCH_SIZE ||
      1000
  );

const START_BLOCK_ENV =
  process.env.SWAP_BACKFILL_START_BLOCK;

const END_BLOCK_ENV =
  process.env.SWAP_BACKFILL_END_BLOCK;

// ==========================================
// VALIDATION
// ==========================================

if (!MONGO_URI) {
  console.error(
    "❌ MONGO_URI is missing from .env"
  );

  process.exit(1);
}

if (
  !Number.isInteger(BATCH_SIZE) ||
  BATCH_SIZE <= 0
) {
  console.error(
    "❌ SWAP_BACKFILL_BATCH_SIZE must be a positive integer."
  );

  process.exit(1);
}

// ==========================================
// ABIs
// ==========================================

const FACTORY_ABI = [
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
  "event PairCreated(address indexed token0,address indexed token1,address pair,uint256)"
];

const PAIR_EVENT_ABI = [
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)"
];

// ==========================================
// CONTRACTS / INTERFACES
// ==========================================

const factoryContract =
  new ethers.Contract(
    FACTORY_ADDRESS,
    FACTORY_ABI,
    provider
  );

const factoryInterface =
  new ethers.Interface(
    FACTORY_ABI
  );

const pairInterface =
  new ethers.Interface(
    PAIR_EVENT_ABI
  );

// ==========================================
// EVENT TOPICS
// ==========================================

const PAIR_CREATED_TOPIC =
  ethers.id(
    "PairCreated(address,address,address,uint256)"
  );

const SWAP_TOPIC =
  ethers.id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );

// ==========================================
// BLOCK TIMESTAMP CACHE
// ==========================================

const blockTimestampCache =
  new Map();

async function getBlockTimestampDate(
  blockNumber
) {
  const normalizedBlock =
    Number(blockNumber);

  if (
    blockTimestampCache.has(
      normalizedBlock
    )
  ) {
    return blockTimestampCache.get(
      normalizedBlock
    );
  }

  const block =
    await provider.getBlock(
      normalizedBlock
    );

  if (!block) {
    throw new Error(
      `Could not read block ${normalizedBlock}.`
    );
  }

  const timestamp =
    new Date(
      Number(block.timestamp) *
        1000
    );

  blockTimestampCache.set(
    normalizedBlock,
    timestamp
  );

  return timestamp;
}

// ==========================================
// FACTORY PAIRS
// ==========================================

async function getFactoryPairs() {
  const pairCountRaw =
    await factoryContract.allPairsLength();

  const pairCount =
    Number(pairCountRaw);

  console.log(
    `🏭 Factory contains ${pairCount} pair(s).`
  );

  const pairs = [];

  for (
    let i = 0;
    i < pairCount;
    i++
  ) {
    const pairAddress =
      await factoryContract.allPairs(
        i
      );

    if (
      !pairAddress ||
      !ethers.isAddress(
        pairAddress
      )
    ) {
      continue;
    }

    const normalizedPair =
      pairAddress.toLowerCase();

    pairs.push(
      normalizedPair
    );

    console.log(
      `   #${i}: ${normalizedPair}`
    );
  }

  return pairs;
}

// ==========================================
// FIND FIRST PAIR CREATED BLOCK
// ==========================================

async function findFirstPairCreatedBlock(
  latestBlock
) {
  /*
   * If the user explicitly defines a start
   * block in .env, use it.
   */
  if (
    START_BLOCK_ENV !== undefined &&
    START_BLOCK_ENV !== null &&
    String(
      START_BLOCK_ENV
    ).trim() !== ""
  ) {
    const configuredStart =
      Number(
        START_BLOCK_ENV
      );

    if (
      !Number.isInteger(
        configuredStart
      ) ||
      configuredStart < 0
    ) {
      throw new Error(
        "SWAP_BACKFILL_START_BLOCK is invalid."
      );
    }

    console.log(
      `📍 Using configured start block: ${configuredStart}`
    );

    return configuredStart;
  }

  /*
   * No deployment block is stored in the
   * current database model.
   *
   * We therefore search Factory PairCreated
   * events from block 0 in safe chunks.
   *
   * As soon as the first PairCreated event is
   * found, that block is the earliest block
   * from which any NumenDEX swap can exist.
   */
  console.log(
    "🔎 Searching for the first NumenDEX PairCreated event..."
  );

  for (
    let fromBlock = 0;
    fromBlock <= latestBlock;
    fromBlock += BATCH_SIZE
  ) {
    const toBlock =
      Math.min(
        fromBlock +
          BATCH_SIZE -
          1,
        latestBlock
      );

    const logs =
      await provider.getLogs({
        address:
          FACTORY_ADDRESS,

        fromBlock,
        toBlock,

        topics: [
          PAIR_CREATED_TOPIC,
        ],
      });

    if (
      logs.length === 0
    ) {
      if (
        fromBlock % 10000 === 0
      ) {
        console.log(
          `   Scanned ${fromBlock} -> ${toBlock}`
        );
      }

      continue;
    }

    let earliestBlock =
      null;

    for (
      const log of logs
    ) {
      try {
        const parsed =
          factoryInterface.parseLog(
            log
          );

        if (!parsed) {
          continue;
        }

        const pairAddress =
          parsed.args.pair;

        console.log(
          `✨ PairCreated found: ${pairAddress} at block ${log.blockNumber}`
        );

        if (
          earliestBlock === null ||
          Number(
            log.blockNumber
          ) < earliestBlock
        ) {
          earliestBlock =
            Number(
              log.blockNumber
            );
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not parse PairCreated log at block ${log.blockNumber}:`,
          error.message
        );
      }
    }

    if (
      earliestBlock !== null
    ) {
      console.log(
        `📍 First NumenDEX pair block: ${earliestBlock}`
      );

      return earliestBlock;
    }
  }

  throw new Error(
    "No PairCreated event was found for the NumenDEX Factory."
  );
}

// ==========================================
// SAVE SWAP
// ==========================================

async function saveSwapLog(
  log
) {
  const parsed =
    pairInterface.parseLog(
      log
    );

  if (!parsed) {
    return {
      inserted: false,
      updated: false,
    };
  }

  const transactionHash =
    String(
      log.transactionHash ||
        ""
    ).toLowerCase();

  const rawLogIndex =
    log.index ??
    log.logIndex;

  const logIndex =
    Number(
      rawLogIndex
    );

  if (
    !transactionHash ||
    !Number.isInteger(
      logIndex
    )
  ) {
    throw new Error(
      "Swap log is missing transaction hash or log index."
    );
  }

  const pairAddress =
    log.address.toLowerCase();

  const blockTimestamp =
    await getBlockTimestampDate(
      log.blockNumber
    );

  const sender =
    String(
      parsed.args.sender
    ).toLowerCase();

  const to =
    String(
      parsed.args.to
    ).toLowerCase();

  const amount0In =
    parsed.args.amount0In.toString();

  const amount1In =
    parsed.args.amount1In.toString();

  const amount0Out =
    parsed.args.amount0Out.toString();

  const amount1Out =
    parsed.args.amount1Out.toString();

  const existing =
    await Swap.exists({
      transactionHash,
      logIndex,
    });

  await Swap.findOneAndUpdate(
    {
      transactionHash,
      logIndex,
    },
    {
      $set: {
        pairAddress,
        transactionHash,
        logIndex,

        blockNumber:
          Number(
            log.blockNumber
          ),

        blockTimestamp,
        sender,
        to,
        amount0In,
        amount1In,
        amount0Out,
        amount1Out,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert:
        true,
    }
  );

  return {
    inserted:
      !existing,

    updated:
      Boolean(existing),
  };
}

// ==========================================
// PROCESS BLOCK RANGE
// ==========================================

async function processBlockRange(
  pairAddresses,
  fromBlock,
  toBlock
) {
  const logs =
    await provider.getLogs({
      address:
        pairAddresses,

      fromBlock,
      toBlock,

      topics: [
        SWAP_TOPIC,
      ],
    });

  let inserted = 0;
  let existing = 0;
  let failed = 0;

  for (
    const log of logs
  ) {
    try {
      const result =
        await saveSwapLog(
          log
        );

      if (
        result.inserted
      ) {
        inserted += 1;
      } else {
        existing += 1;
      }
    } catch (error) {
      failed += 1;

      console.warn(
        `⚠️ Swap failed at block ${log.blockNumber}:`,
        error.message
      );
    }
  }

  return {
    found:
      logs.length,

    inserted,
    existing,
    failed,
  };
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log(
    "=================================================="
  );

  console.log(
    "🚀 NumenDEX Swap Backfill"
  );

  console.log(
    `🏭 Factory: ${FACTORY_ADDRESS}`
  );

  console.log(
    `📦 Batch size: ${BATCH_SIZE}`
  );

  console.log(
    "=================================================="
  );

  // ========================================
  // CONNECT DATABASE
  // ========================================

  console.log(
    "🔌 Connecting to MongoDB..."
  );

  await mongoose.connect(
    MONGO_URI
  );

  console.log(
    "✅ Connected to MongoDB."
  );

  // ========================================
  // VERIFY FACTORY / GET PAIRS
  // ========================================

  const pairAddresses =
    await getFactoryPairs();

  if (
    pairAddresses.length === 0
  ) {
    throw new Error(
      "Factory does not contain any pairs."
    );
  }

  // ========================================
  // CURRENT CHAIN TIP
  // ========================================

  const latestBlock =
    await provider.getBlockNumber();

  let endBlock =
    latestBlock;

  if (
    END_BLOCK_ENV !== undefined &&
    END_BLOCK_ENV !== null &&
    String(
      END_BLOCK_ENV
    ).trim() !== ""
  ) {
    const configuredEnd =
      Number(
        END_BLOCK_ENV
      );

    if (
      !Number.isInteger(
        configuredEnd
      ) ||
      configuredEnd < 0
    ) {
      throw new Error(
        "SWAP_BACKFILL_END_BLOCK is invalid."
      );
    }

    endBlock =
      Math.min(
        configuredEnd,
        latestBlock
      );
  }

  console.log(
    `📦 Latest chain block: ${latestBlock}`
  );

  console.log(
    `📦 Backfill end block: ${endBlock}`
  );

  // ========================================
  // FIND START
  // ========================================

  const startBlock =
    await findFirstPairCreatedBlock(
      endBlock
    );

  if (
    startBlock >
    endBlock
  ) {
    throw new Error(
      "Backfill start block is greater than end block."
    );
  }

  console.log(
    "=================================================="
  );

  console.log(
    `📚 Backfill range: ${startBlock} -> ${endBlock}`
  );

  console.log(
    "=================================================="
  );

  // ========================================
  // BACKFILL
  // ========================================

  let totalFound = 0;
  let totalInserted = 0;
  let totalExisting = 0;
  let totalFailed = 0;

  for (
    let fromBlock =
      startBlock;
    fromBlock <= endBlock;
    fromBlock += BATCH_SIZE
  ) {
    const toBlock =
      Math.min(
        fromBlock +
          BATCH_SIZE -
          1,
        endBlock
      );

    console.log(
      `🔍 ${fromBlock} -> ${toBlock}`
    );

    try {
      const result =
        await processBlockRange(
          pairAddresses,
          fromBlock,
          toBlock
        );

      totalFound +=
        result.found;

      totalInserted +=
        result.inserted;

      totalExisting +=
        result.existing;

      totalFailed +=
        result.failed;

      if (
        result.found > 0
      ) {
        console.log(
          `   🔁 Found: ${result.found}`
        );

        console.log(
          `   ✅ New: ${result.inserted}`
        );

        console.log(
          `   ♻️ Existing: ${result.existing}`
        );

        if (
          result.failed > 0
        ) {
          console.log(
            `   ⚠️ Failed: ${result.failed}`
          );
        }
      }
    } catch (error) {
      /*
       * Do not silently skip an RPC batch.
       *
       * If one range cannot be retrieved,
       * stop the backfill so we don't end up
       * believing that the historical dataset
       * is complete when it isn't.
       */
      throw new Error(
        `Backfill failed for block range ${fromBlock}-${toBlock}: ${error.message}`
      );
    }
  }

  // ========================================
  // SUMMARY
  // ========================================

  const databaseSwapCount =
    await Swap.countDocuments({
      pairAddress: {
        $in:
          pairAddresses,
      },
    });

  console.log(
    ""
  );

  console.log(
    "=================================================="
  );

  console.log(
    "✅ NumenDEX Swap Backfill Completed"
  );

  console.log(
    "=================================================="
  );

  console.log(
    `🔁 Swap events found: ${totalFound}`
  );

  console.log(
    `✅ Newly inserted: ${totalInserted}`
  );

  console.log(
    `♻️ Already existing: ${totalExisting}`
  );

  console.log(
    `⚠️ Failed events: ${totalFailed}`
  );

  console.log(
    `🗄️ Total NumenDEX swaps in MongoDB: ${databaseSwapCount}`
  );

  console.log(
    `📚 Scanned blocks: ${startBlock} -> ${endBlock}`
  );

  console.log(
    "=================================================="
  );
}

// ==========================================
// RUN
// ==========================================

main()
  .catch(
    (error) => {
      console.error(
        ""
      );

      console.error(
        "❌ Swap backfill failed:"
      );

      console.error(
        error
      );

      process.exitCode = 1;
    }
  )
  .finally(
    async () => {
      try {
        await mongoose.disconnect();

        console.log(
          "🔌 MongoDB disconnected."
        );
      } catch (error) {
        console.warn(
          "⚠️ MongoDB disconnect error:",
          error.message
        );
      }
    }
  );