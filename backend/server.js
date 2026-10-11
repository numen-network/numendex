
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { ethers } = require("ethers");

require("./services/env");

const { startIndexer, ensureToken } = require("./services/indexer");
const { fetchPoolDetails } = require("./services/poolService");
const { getQuote } = require("./services/quoteService");
const {
  getPoolSwapStats,
  getAllPoolSwapStats,
} = require("./services/poolStatsService");
const { getPoolSwaps } = require("./services/poolSwapService");
const {
  getTokenMarketData,
  getTokenPriceHistory,
} = require("./services/marketDataService");
const { fetchTokenDetails } = require("./services/tokenService");
const { list } = require("./services/env");

const Token = require("./models/Token.model");
const Pool = require("./models/Pool.model");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// ======================================================
// 1. SECURITY HEADERS
// ======================================================

app.disable("x-powered-by");

// Only enable proxy trust when configured for deployment.
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// ======================================================
// 2. CORS CONFIGURATION
// ======================================================

const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value).trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

const configuredOrigins = list("CORS_ORIGINS", []);

const allowedOrigins = new Set(
  [
    ...configuredOrigins,
    ...(isProduction ? [] : developmentOrigins),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

console.log(
  "[CORS] Allowed origins:",
  Array.from(allowedOrigins)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS BLOCKED] ${origin}`);

      return callback(null, false);
    },
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 86400,
  })
);

// ======================================================
// 3. BODY PARSING
// ======================================================

app.use(express.json({ limit: "32kb" }));

// ======================================================
// 4. RATE LIMITING
// ======================================================

const requestBuckets = new Map();

app.use("/api", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, {
      count: 1,
      resetAt: now + 60_000,
    });

    return next();
  }

  current.count += 1;

  if (current.count > 180) {
    res.setHeader(
      "Retry-After",
      Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    );

    return res.status(429).json({
      success: false,
      error: "Too many requests.",
    });
  }

  next();
});

setInterval(() => {
  const now = Date.now();

  for (const [key, value] of requestBuckets.entries()) {
    if (value.resetAt <= now) {
      requestBuckets.delete(key);
    }
  }
}, 60_000).unref();

// ======================================================
// 5. HELPERS
// ======================================================

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: message,
  });
}

function internalError(res, error, context) {
  console.error(`[${context}]`, error);

  return sendError(
    res,
    500,
    "Internal server error."
  );
}

function parseAddress(value) {
  const address = String(value || "")
    .replace(/['"]+/g, "")
    .trim();

  if (!ethers.isAddress(address)) {
    return null;
  }

  return ethers.getAddress(address);
}

function parsePagination(value, fallback, maximum) {
  if (value === undefined) {
    return fallback;
  }

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < 0
  ) {
    return null;
  }

  return Math.min(number, maximum);
}

// ======================================================
// 6. MONGODB + GENESIS INDEXER
// ======================================================

async function connectDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      "Connected to MongoDB Atlas successfully"
    );

    try {
      await startIndexer();
    } catch (error) {
      console.error(
        "Indexer startup error:",
        error
      );
    }
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error
    );
  }
}

connectDatabase();

// ======================================================
// 7. HEALTH
// GET /api/health
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    network: "Numen Mainnet",
    chainId: 32026,
  });
});

// ======================================================
// 8. TOKEN LIST
// GET /api/tokens
// ======================================================

app.get("/api/tokens", async (req, res) => {
  try {
    const tokens = await getTokenMarketData();

    tokens.sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    );

    return res.json({
      success: true,
      count: tokens.length,
      data: tokens,
    });
  } catch (error) {
    return internalError(res, error, "TOKEN LIST");
  }
});

// ======================================================
// 9. POOL LIST
// GET /api/pools
// ======================================================

app.get("/api/pools", async (req, res) => {
  try {
    const pools = await Pool.find({
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    return internalError(res, error, "POOL LIST");
  }
});

// ======================================================
// 10. TOKEN RESOLVE / IMPORT
// GET /api/token/resolve/:address
// ======================================================

app.get(
  "/api/token/resolve/:address",
  async (req, res) => {
    try {
      const checksumAddress = parseAddress(
        req.params.address
      );

      if (!checksumAddress) {
        return sendError(
          res,
          400,
          "Invalid token address"
        );
      }

      const address = checksumAddress.toLowerCase();

      let token = await Token.findOne({
        address,
      }).lean();

      if (!token) {
        const details = await fetchTokenDetails(
          checksumAddress,
          { strict: true }
        );

        if (!details?.success) {
          return sendError(
            res,
            404,
            "Address is not a supported ERC-20 token."
          );
        }

        const saved = await ensureToken(
          checksumAddress,
          "imported"
        );

        if (!saved) {
          return sendError(
            res,
            404,
            "Could not import token."
          );
        }

        token =
          typeof saved.toObject === "function"
            ? saved.toObject()
            : saved;
      }

      return res.json({
        success: true,
        data: {
          ...token,
          address,
          verified: Boolean(token.verified),
          imported: token.source === "imported",
        },
      });
    } catch (error) {
      return internalError(
        res,
        error,
        "TOKEN RESOLVE"
      );
    }
  }
);

// ======================================================
// 11. TOKEN PRICE HISTORY
// GET /api/token/:address/history
// ======================================================

app.get(
  "/api/token/:address/history",
  async (req, res) => {
    try {
      const address = parseAddress(
        req.params.address
      );

      const period = String(
        req.query.period || "1d"
      ).toLowerCase();

      if (!address) {
        return sendError(
          res,
          400,
          "Invalid token address"
        );
      }

      const validPeriods = [
        "1h",
        "1d",
        "1w",
        "1m",
        "1y",
        "all",
      ];

      if (!validPeriods.includes(period)) {
        return sendError(
          res,
          400,
          "Invalid history period"
        );
      }

      const data = await getTokenPriceHistory(
        address.toLowerCase(),
        period
      );

      return res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      return internalError(
        res,
        error,
        "TOKEN HISTORY"
      );
    }
  }
);

// ======================================================
// 12. INDIVIDUAL TOKEN
// GET /api/token/:address
// ======================================================

app.get(
  "/api/token/:address",
  async (req, res) => {
    try {
      const checksumAddress = parseAddress(
        req.params.address
      );

      if (!checksumAddress) {
        return sendError(
          res,
          400,
          "Invalid token address"
        );
      }

      const address = checksumAddress.toLowerCase();

      const tokens = await getTokenMarketData();

      const token = tokens.find(
        item =>
          String(item.address).toLowerCase() ===
          address
      );

      if (!token) {
        return sendError(
          res,
          404,
          "Token not found in indexer database"
        );
      }

      return res.json({
        success: true,
        data: token,
      });
    } catch (error) {
      return internalError(
        res,
        error,
        "INDIVIDUAL TOKEN"
      );
    }
  }
);

// ======================================================
// 13. INDIVIDUAL POOL
// GET /api/pool/:address
// ======================================================

app.get(
  "/api/pool/:address",
  async (req, res) => {
    try {
      const checksumAddress = parseAddress(
        req.params.address
      );

      if (!checksumAddress) {
        return sendError(
          res,
          400,
          "Invalid pool address"
        );
      }

      const address = checksumAddress.toLowerCase();

      const existingPool = await Pool.findOne({
        pairAddress: address,
      });

      const oldPrice = existingPool
        ? Number(existingPool.price)
        : 0;

      const poolData = await fetchPoolDetails(
        checksumAddress
      );

      if (!poolData.success) {
        return sendError(
          res,
          400,
          poolData.error || "Pool data unavailable"
        );
      }

      const currentPrice = Number(
        poolData.price
      );

      if (!Number.isFinite(currentPrice)) {
        return sendError(
          res,
          502,
          "Invalid pool price data"
        );
      }

      const priceChange =
        oldPrice > 0
          ? currentPrice - oldPrice
          : 0;

      const priceChangePercent =
        oldPrice > 0
          ? ((currentPrice - oldPrice) / oldPrice) * 100
          : 0;

      const poolName =
        `${poolData.token0Symbol}/${poolData.token1Symbol}`;

      const updatedPool =
        await Pool.findOneAndUpdate(
          { pairAddress: address },
          {
            $set: {
              poolName,
              token0: poolData.token0.toLowerCase(),
              token1: poolData.token1.toLowerCase(),
              token0Symbol: poolData.token0Symbol,
              token1Symbol: poolData.token1Symbol,
              token0Decimals: poolData.token0Decimals,
              token1Decimals: poolData.token1Decimals,
              reserve0: poolData.reserve0,
              reserve1: poolData.reserve1,
              price: currentPrice,
              priceChange,
              blockNumber: poolData.blockNumber,
              isActive: true,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      return res.json({
        success: true,
        data: {
          poolAddress: updatedPool.pairAddress,
          poolName: updatedPool.poolName,

          token0: {
            address: updatedPool.token0,
            symbol: updatedPool.token0Symbol,
            decimals: updatedPool.token0Decimals,
            reserveRaw: updatedPool.reserve0,
            reserveFormatted:
              poolData.reserve0Formatted,
          },

          token1: {
            address: updatedPool.token1,
            symbol: updatedPool.token1Symbol,
            decimals: updatedPool.token1Decimals,
            reserveRaw: updatedPool.reserve1,
            reserveFormatted:
              poolData.reserve1Formatted,
          },

          price: currentPrice,
          previousPrice: oldPrice,
          priceChange,
          priceChangePercent:
            `${priceChangePercent.toFixed(2)}%`,
          blockNumber: updatedPool.blockNumber,
          timestamp: updatedPool.updatedAt,
        },
      });
    } catch (error) {
      return internalError(
        res,
        error,
        "POOL DETAILS"
      );
    }
  }
);

// ======================================================
// 14. SWAP QUOTE
// GET /api/quote
// ======================================================

app.get("/api/quote", async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amount,
      slippage,
    } = req.query;

    if (!tokenIn) {
      return sendError(
        res,
        400,
        "tokenIn parameter is required"
      );
    }

    if (!tokenOut) {
      return sendError(
        res,
        400,
        "tokenOut parameter is required"
      );
    }

    if (!amount) {
      return sendError(
        res,
        400,
        "amount parameter is required"
      );
    }

    const inputAddress = parseAddress(tokenIn);
    const outputAddress = parseAddress(tokenOut);

    if (!inputAddress) {
      return sendError(
        res,
        400,
        "Invalid tokenIn address"
      );
    }

    if (!outputAddress) {
      return sendError(
        res,
        400,
        "Invalid tokenOut address"
      );
    }

    if (
      inputAddress.toLowerCase() ===
      outputAddress.toLowerCase()
    ) {
      return sendError(
        res,
        400,
        "Input and output tokens must differ"
      );
    }

    const parsedSlippage =
      slippage === undefined
        ? 0.5
        : Number(slippage);

    if (
      !Number.isFinite(parsedSlippage) ||
      parsedSlippage < 0 ||
      parsedSlippage > 50
    ) {
      return sendError(
        res,
        400,
        "Invalid slippage value"
      );
    }

    const amountString = String(amount);

    if (
      !/^\d+(\.\d+)?$/.test(amountString) ||
      !/[1-9]/.test(amountString)
    ) {
      return sendError(
        res,
        400,
        "Invalid amount"
      );
    }

    const quote = await getQuote({
      tokenIn: inputAddress,
      tokenOut: outputAddress,
      amountIn: amountString,
      slippage: parsedSlippage,
    });

    if (!quote.success) {
      return sendError(
        res,
        400,
        quote.error || "Quote unavailable"
      );
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    return internalError(
      res,
      error,
      "SWAP QUOTE"
    );
  }
});

// ======================================================
// 15. ALL POOL STATS
// GET /api/pool-stats
// ======================================================

app.get("/api/pool-stats", async (req, res) => {
  try {
    const stats = await getAllPoolSwapStats();

    return res.json({
      success: true,
      count: stats.length,
      data: stats,
    });
  } catch (error) {
    return internalError(
      res,
      error,
      "ALL POOL STATS"
    );
  }
});

// ======================================================
// 16. INDIVIDUAL POOL STATS
// GET /api/pool-stats/:address
// ======================================================

app.get(
  "/api/pool-stats/:address",
  async (req, res) => {
    try {
      const address = parseAddress(
        req.params.address
      );

      if (!address) {
        return sendError(
          res,
          400,
          "Invalid pool address"
        );
      }

      const stats = await getPoolSwapStats(
        address
      );

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      if (error.message === "Pool not found.") {
        return sendError(
          res,
          404,
          "Pool not found."
        );
      }

      return internalError(
        res,
        error,
        "INDIVIDUAL POOL STATS"
      );
    }
  }
);

// ======================================================
// 17. POOL SWAP HISTORY
// GET /api/pool-swaps/:address
// ======================================================

app.get(
  "/api/pool-swaps/:address",
  async (req, res) => {
    try {
      const address = parseAddress(
        req.params.address
      );

      if (!address) {
        return sendError(
          res,
          400,
          "Invalid pool address"
        );
      }

      const limit = parsePagination(
        req.query.limit,
        50,
        200
      );

      const skip = parsePagination(
        req.query.skip,
        0,
        1_000_000
      );

      if (limit === null || limit < 1) {
        return sendError(
          res,
          400,
          "Invalid limit parameter"
        );
      }

      if (skip === null) {
        return sendError(
          res,
          400,
          "Invalid skip parameter"
        );
      }

      const result = await getPoolSwaps({
        pairAddress: address,
        limit,
        skip,
      });

      return res.json({
        success: true,
        count: result.swaps.length,
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.hasMore,

        pool: {
          pairAddress: result.pairAddress,
          poolName: result.poolName,
          token0: result.token0,
          token1: result.token1,
        },

        data: result.swaps,
      });
    } catch (error) {
      if (error.message === "Pool not found.") {
        return sendError(
          res,
          404,
          "Pool not found."
        );
      }

      return internalError(
        res,
        error,
        "POOL SWAP HISTORY"
      );
    }
  }
);

// ======================================================
// 18. 404 HANDLER
// ======================================================

app.use((req, res) => {
  return sendError(
    res,
    404,
    "Endpoint not found"
  );
});

// ======================================================
// 19. GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
  console.error("[SERVER ERROR]", error);

  if (res.headersSent) {
    return next(error);
  }

  return sendError(
    res,
    500,
    "Internal server error."
  );
});

// ======================================================
// 20. START SERVER
// ======================================================

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log("====================================");
  console.log("NumenDEX Backend");
  console.log(`Port: ${PORT}`);
  console.log("Network: Numen Mainnet");
  console.log("Chain ID: 32026");
  console.log(
    `Environment: ${process.env.NODE_ENV || "development"}`
  );
  console.log("====================================");
});
