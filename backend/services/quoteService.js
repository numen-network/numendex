const { ethers } = require("ethers");
const { provider } = require("./rpc.js");

// ==========================================
// NUMENDEX CONTRACT ADDRESSES
// ==========================================

const ROUTER_ADDRESS =
  process.env.ROUTER_ADDRESS ||
  "0x546Bb0eB20fca50a9f9c7DFcb9b983dc96045d10";

const FACTORY_ADDRESS =
  process.env.FACTORY_ADDRESS ||
  "0xE4C63d8eEAeC2B717c4e24d1Cfa4a57C0A1C7907";

// ==========================================
// ROUTING TOKENS
// ==========================================
//
// TEST is currently the bridge token between
// the existing NumenDEX liquidity pools.
//
// NDEX <-> TEST <-> NUMN
//
// Later we can move routing tokens to
// configuration/database automatically.
// ==========================================

const TEST_ADDRESS =
  process.env.TEST_ADDRESS ||
  "0xa417b372ed6d6076fcce02f531f709b261fc2845";

// ==========================================
// ABIs
// ==========================================

const ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)"
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

// ==========================================
// CONTRACTS
// ==========================================

const router =
  new ethers.Contract(
    ROUTER_ADDRESS,
    ROUTER_ABI,
    provider
  );

const factory =
  new ethers.Contract(
    FACTORY_ADDRESS,
    FACTORY_ABI,
    provider
  );

// ==========================================
// TOKEN METADATA
// ==========================================

async function getTokenMetadata(
  tokenAddress
) {
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(
      `Invalid token address: ${tokenAddress}`
    );
  }

  const address =
    ethers.getAddress(tokenAddress);

  const token =
    new ethers.Contract(
      address,
      ERC20_ABI,
      provider
    );

  const [
    symbolResult,
    decimalsResult
  ] =
    await Promise.all([
      token
        .symbol()
        .catch(() => "UNKNOWN"),

      token
        .decimals()
        .catch(() => 18n)
    ]);

  return {
    address,

    symbol:
      typeof symbolResult === "string"
        ? symbolResult
        : "UNKNOWN",

    decimals:
      Number(decimalsResult)
  };
}

// ==========================================
// GET PAIR
// ==========================================

async function getPair(
  tokenA,
  tokenB
) {
  const pairAddress =
    await factory.getPair(
      tokenA,
      tokenB
    );

  if (
    pairAddress.toLowerCase() ===
    ethers.ZeroAddress.toLowerCase()
  ) {
    return null;
  }

  return ethers.getAddress(
    pairAddress
  );
}

// ==========================================
// CHECK PATH
// ==========================================
//
// Every hop must have a real liquidity pair.
//
// Example:
//
// NDEX -> TEST -> NUMN
//
// requires:
//
// NDEX/TEST pair
// TEST/NUMN pair
//
// ==========================================

async function validatePath(path) {
  const pairs = [];

  for (
    let i = 0;
    i < path.length - 1;
    i++
  ) {
    const pair =
      await getPair(
        path[i],
        path[i + 1]
      );

    if (!pair) {
      return {
        valid: false,
        pairs: []
      };
    }

    pairs.push(pair);
  }

  return {
    valid: true,
    pairs
  };
}

// ==========================================
// FIND ROUTE
// ==========================================
//
// Priority:
//
// 1. Direct pair
// 2. Route through TEST
//
// ==========================================

async function findRoute(
  tokenIn,
  tokenOut
) {
  // ========================================
  // 1. DIRECT ROUTE
  // ========================================

  const directPath = [
    tokenIn,
    tokenOut
  ];

  const directCheck =
    await validatePath(
      directPath
    );

  if (directCheck.valid) {
    return {
      routeType: "direct",
      path: directPath,
      pairs: directCheck.pairs
    };
  }

  // ========================================
  // 2. TEST BRIDGE ROUTE
  // ========================================

  const testAddress =
    ethers.getAddress(
      TEST_ADDRESS
    );

  // Avoid:
  //
  // TEST -> TEST -> TOKEN
  // TOKEN -> TEST -> TEST
  //
  if (
    tokenIn.toLowerCase() !==
      testAddress.toLowerCase() &&
    tokenOut.toLowerCase() !==
      testAddress.toLowerCase()
  ) {
    const testPath = [
      tokenIn,
      testAddress,
      tokenOut
    ];

    const testCheck =
      await validatePath(
        testPath
      );

    if (testCheck.valid) {
      return {
        routeType:
          "multi-hop",

        bridgeToken:
          testAddress,

        path:
          testPath,

        pairs:
          testCheck.pairs
      };
    }
  }

  // ========================================
  // NO ROUTE
  // ========================================

  return null;
}

// ==========================================
// GET PATH TOKEN METADATA
// ==========================================

async function getPathMetadata(
  path
) {
  return Promise.all(
    path.map(
      async (address) => {
        return getTokenMetadata(
          address
        );
      }
    )
  );
}

// ==========================================
// GET QUOTE
// ==========================================

async function getQuote({
  tokenIn,
  tokenOut,
  amountIn,
  slippage = 0.5
}) {
  try {
    // ======================================
    // ADDRESS VALIDATION
    // ======================================

    if (
      !ethers.isAddress(tokenIn)
    ) {
      throw new Error(
        "Invalid tokenIn address"
      );
    }

    if (
      !ethers.isAddress(tokenOut)
    ) {
      throw new Error(
        "Invalid tokenOut address"
      );
    }

    const tokenInAddress =
      ethers.getAddress(
        tokenIn
      );

    const tokenOutAddress =
      ethers.getAddress(
        tokenOut
      );

    if (
      tokenInAddress.toLowerCase() ===
      tokenOutAddress.toLowerCase()
    ) {
      throw new Error(
        "tokenIn and tokenOut cannot be the same"
      );
    }

    // ======================================
    // AMOUNT VALIDATION
    // ======================================

    const amountString =
      String(amountIn || "").trim();

    if (!amountString) {
      throw new Error(
        "amountIn is required"
      );
    }

    // Do not use Number(amountIn) to parse
    // blockchain token amounts.
    //
    // parseUnits below will perform the final
    // exact decimal validation.
    //
    if (
      !/^(?:\d+|\d*\.\d+)$/.test(
        amountString
      )
    ) {
      throw new Error(
        "Invalid amountIn"
      );
    }

    // ======================================
    // SLIPPAGE VALIDATION
    // ======================================

    const numericSlippage =
      Number(slippage);

    if (
      !Number.isFinite(
        numericSlippage
      ) ||
      numericSlippage < 0 ||
      numericSlippage > 100
    ) {
      throw new Error(
        "Invalid slippage percentage"
      );
    }

    // ======================================
    // TOKEN METADATA
    // ======================================

    const [
      tokenInData,
      tokenOutData
    ] =
      await Promise.all([
        getTokenMetadata(
          tokenInAddress
        ),

        getTokenMetadata(
          tokenOutAddress
        )
      ]);

    // ======================================
    // PARSE INPUT
    // ======================================

    let amountInRaw;

    try {
      amountInRaw =
        ethers.parseUnits(
          amountString,
          tokenInData.decimals
        );
    } catch (error) {
      throw new Error(
        `Invalid amount for ${tokenInData.symbol}`
      );
    }

    if (amountInRaw <= 0n) {
      throw new Error(
        "amountIn must be greater than zero"
      );
    }

    // ======================================
    // FIND ROUTE
    // ======================================

    const route =
      await findRoute(
        tokenInAddress,
        tokenOutAddress
      );

    if (!route) {
      throw new Error(
        "No liquidity route exists for this token pair"
      );
    }

    // ======================================
    // ROUTER QUOTE
    // ======================================

    let amounts;

    try {
      amounts =
        await router.getAmountsOut(
          amountInRaw,
          route.path
        );
    } catch (error) {
      throw new Error(
        "Unable to calculate quote. The route may have insufficient liquidity."
      );
    }

    if (
      !amounts ||
      amounts.length !==
        route.path.length
    ) {
      throw new Error(
        "Router returned an invalid quote"
      );
    }

    const amountOutRaw =
      amounts[
        amounts.length - 1
      ];

    if (amountOutRaw <= 0n) {
      throw new Error(
        "Quote output is zero"
      );
    }

    // ======================================
    // SLIPPAGE
    // ======================================

    const slippageBps =
      Math.round(
        numericSlippage * 100
      );

    const amountOutMin =
      (
        amountOutRaw *
        BigInt(
          10000 -
            slippageBps
        )
      ) /
      10000n;

    // ======================================
    // FORMAT VALUES
    // ======================================

    const amountInFormatted =
      ethers.formatUnits(
        amountInRaw,
        tokenInData.decimals
      );

    const amountOutFormatted =
      ethers.formatUnits(
        amountOutRaw,
        tokenOutData.decimals
      );

    const amountOutMinFormatted =
      ethers.formatUnits(
        amountOutMin,
        tokenOutData.decimals
      );

    // ======================================
    // PATH METADATA
    // ======================================

    const pathMetadata =
      await getPathMetadata(
        route.path
      );

    // ======================================
    // HOP DETAILS
    // ======================================

    const hops = [];

    for (
      let i = 0;
      i < route.pairs.length;
      i++
    ) {
      const hopAmountInRaw =
        amounts[i];

      const hopAmountOutRaw =
        amounts[i + 1];

      const hopTokenIn =
        pathMetadata[i];

      const hopTokenOut =
        pathMetadata[i + 1];

      hops.push({
        pairAddress:
          route.pairs[i],

        tokenIn: {
          address:
            hopTokenIn.address,

          symbol:
            hopTokenIn.symbol,

          decimals:
            hopTokenIn.decimals
        },

        tokenOut: {
          address:
            hopTokenOut.address,

          symbol:
            hopTokenOut.symbol,

          decimals:
            hopTokenOut.decimals
        },

        amountIn: {
          raw:
            hopAmountInRaw.toString(),

          formatted:
            ethers.formatUnits(
              hopAmountInRaw,
              hopTokenIn.decimals
            )
        },

        amountOut: {
          raw:
            hopAmountOutRaw.toString(),

          formatted:
            ethers.formatUnits(
              hopAmountOutRaw,
              hopTokenOut.decimals
            )
        }
      });
    }

    // ======================================
    // RATE
    // ======================================

    let rate = 0;

    const inputFloat =
      Number(
        amountInFormatted
      );

    const outputFloat =
      Number(
        amountOutFormatted
      );

    if (
      Number.isFinite(
        inputFloat
      ) &&
      Number.isFinite(
        outputFloat
      ) &&
      inputFloat > 0
    ) {
      rate =
        outputFloat /
        inputFloat;
    }

    // ======================================
    // RESULT
    // ======================================

    return {
      success: true,

      routeType:
        route.routeType,

      pairAddress:
        route.pairs.length === 1
          ? route.pairs[0]
          : null,

      pairs:
        route.pairs,

      path:
        route.path,

      pathSymbols:
        pathMetadata.map(
          (token) =>
            token.symbol
        ),

      bridgeToken:
        route.bridgeToken || null,

      tokenIn: {
        address:
          tokenInData.address,

        symbol:
          tokenInData.symbol,

        decimals:
          tokenInData.decimals
      },

      tokenOut: {
        address:
          tokenOutData.address,

        symbol:
          tokenOutData.symbol,

        decimals:
          tokenOutData.decimals
      },

      amountIn: {
        raw:
          amountInRaw.toString(),

        formatted:
          amountInFormatted
      },

      amountOut: {
        raw:
          amountOutRaw.toString(),

        formatted:
          amountOutFormatted
      },

      minimumAmountOut: {
        raw:
          amountOutMin.toString(),

        formatted:
          amountOutMinFormatted
      },

      slippage:
        numericSlippage,

      slippageBps,

      rate,

      hops
    };
  } catch (error) {
    console.error(
      "Quote service error:",
      error.message
    );

    return {
      success: false,
      error:
        error.message
    };
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getQuote,
  findRoute
};