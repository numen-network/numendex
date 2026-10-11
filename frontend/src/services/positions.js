import {
  Contract,
  JsonRpcProvider,
  formatUnits,
} from "ethers";

import {
  NUMEN_NETWORK,
} from "../config/network";

const PAIR_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

const provider =
  new JsonRpcProvider(
    NUMEN_NETWORK.rpcUrls[0],
    {
      name: "numen",
      chainId:
        NUMEN_NETWORK.chainId,
    },
    {
      staticNetwork: true,
    }
  );

function normalizeAddress(
  address
) {
  return String(
    address || ""
  ).toLowerCase();
}

function normalizeDecimals(
  value
) {
  const decimals =
    Number(value);

  if (
    !Number.isInteger(
      decimals
    ) ||
    decimals < 0 ||
    decimals > 255
  ) {
    return 18;
  }

  return decimals;
}

async function getTokenMetadata(
  address,
  fallback = {}
) {
  const token =
    new Contract(
      address,
      ERC20_ABI,
      provider
    );

  let symbol =
    fallback.symbol ||
    "TOKEN";

  let name =
    fallback.name ||
    symbol;

  let decimals =
    normalizeDecimals(
      fallback.decimals ??
        18
    );

  try {
    const [
      chainSymbol,
      chainName,
      chainDecimals,
    ] =
      await Promise.all([
        token.symbol(),
        token.name(),
        token.decimals(),
      ]);

    symbol =
      chainSymbol ||
      symbol;

    name =
      chainName ||
      name;

    decimals =
      normalizeDecimals(
        chainDecimals
      );
  } catch (
    error
  ) {
    console.warn(
      `Could not load token metadata for ${address}:`,
      error
    );
  }

  return {
    address,
    symbol,
    name,
    decimals,
  };
}

function calculateUnderlyingAmount(
  reserve,
  lpBalance,
  totalSupply
) {
  if (
    reserve <= 0n ||
    lpBalance <= 0n ||
    totalSupply <= 0n
  ) {
    return 0n;
  }

  return (
    reserve *
    lpBalance
  ) /
    totalSupply;
}

function calculateSharePercent(
  lpBalance,
  totalSupply
) {
  if (
    lpBalance <= 0n ||
    totalSupply <= 0n
  ) {
    return 0;
  }

  /*
   * Keep six decimal places internally
   * before converting to Number.
   *
   * percentage =
   * LP balance / total supply * 100
   */
  const scaled =
    (
      lpBalance *
      100_000_000n
    ) /
    totalSupply;

  return (
    Number(scaled) /
    1_000_000
  );
}

function formatPositionAmount(
  rawAmount,
  decimals
) {
  try {
    return formatUnits(
      rawAmount,
      decimals
    );
  } catch {
    return "0";
  }
}

function getPoolPairAddress(
  pool
) {
  return (
    pool?.pairAddress ||
    pool?.poolAddress ||
    pool?.address ||
    null
  );
}

function getPoolTokenFallback(
  pool,
  side
) {
  const prefix =
    side === 0
      ? "token0"
      : "token1";

  const value =
    pool?.[prefix];

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return {
      address:
        value.address,

      symbol:
        value.symbol,

      name:
        value.name,

      decimals:
        value.decimals,
    };
  }

  return {
    address:
      typeof value ===
      "string"
        ? value
        : pool?.[
            `${prefix}Address`
          ],

    symbol:
      pool?.[
        `${prefix}Symbol`
      ],

    name:
      pool?.[
        `${prefix}Name`
      ],

    decimals:
      pool?.[
        `${prefix}Decimals`
      ],
  };
}

export async function getWalletPoolPosition({
  account,
  pool,
}) {
  if (!account) {
    return null;
  }

  const pairAddress =
    getPoolPairAddress(
      pool
    );

  if (!pairAddress) {
    return null;
  }

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      provider
    );

  const [
    lpBalanceResult,
    totalSupplyResult,
    token0Address,
    token1Address,
    reserves,
  ] =
    await Promise.all([
      pair.balanceOf(
        account
      ),

      pair.totalSupply(),

      pair.token0(),

      pair.token1(),

      pair.getReserves(),
    ]);

  const lpBalance =
    BigInt(
      lpBalanceResult
    );

  /*
   * No LP balance means the wallet
   * has no position in this pool.
   */
  if (
    lpBalance <= 0n
  ) {
    return null;
  }

  const totalSupply =
    BigInt(
      totalSupplyResult
    );

  if (
    totalSupply <= 0n
  ) {
    return null;
  }

  const reserve0 =
    BigInt(
      reserves[0]
    );

  const reserve1 =
    BigInt(
      reserves[1]
    );

  const fallback0 =
    getPoolTokenFallback(
      pool,
      0
    );

  const fallback1 =
    getPoolTokenFallback(
      pool,
      1
    );

  const [
    token0,
    token1,
  ] =
    await Promise.all([
      getTokenMetadata(
        token0Address,
        normalizeAddress(
          fallback0.address
        ) ===
        normalizeAddress(
          token0Address
        )
          ? fallback0
          : {}
      ),

      getTokenMetadata(
        token1Address,
        normalizeAddress(
          fallback1.address
        ) ===
        normalizeAddress(
          token1Address
        )
          ? fallback1
          : {}
      ),
    ]);

  const amount0Raw =
    calculateUnderlyingAmount(
      reserve0,
      lpBalance,
      totalSupply
    );

  const amount1Raw =
    calculateUnderlyingAmount(
      reserve1,
      lpBalance,
      totalSupply
    );

  const poolShare =
    calculateSharePercent(
      lpBalance,
      totalSupply
    );

  return {
    id:
      `${normalizeAddress(
        pairAddress
      )}-${normalizeAddress(
        account
      )}`,

    pairAddress,

    account,

    pool,

    token0,
    token1,

    lpBalanceRaw:
      lpBalance.toString(),

    lpBalance:
      formatPositionAmount(
        lpBalance,
        18
      ),

    totalSupplyRaw:
      totalSupply.toString(),

    totalSupply:
      formatPositionAmount(
        totalSupply,
        18
      ),

    reserve0Raw:
      reserve0.toString(),

    reserve1Raw:
      reserve1.toString(),

    reserve0:
      formatPositionAmount(
        reserve0,
        token0.decimals
      ),

    reserve1:
      formatPositionAmount(
        reserve1,
        token1.decimals
      ),

    amount0Raw:
      amount0Raw.toString(),

    amount1Raw:
      amount1Raw.toString(),

    amount0:
      formatPositionAmount(
        amount0Raw,
        token0.decimals
      ),

    amount1:
      formatPositionAmount(
        amount1Raw,
        token1.decimals
      ),

    poolShare,

    blockTimestampLast:
      Number(
        reserves[2]
      ),
  };
}

export async function getWalletPoolPositions({
  account,
  pools,
}) {
  if (
    !account ||
    !Array.isArray(
      pools
    ) ||
    pools.length === 0
  ) {
    return [];
  }

  /*
   * Read every known DEX pool.
   *
   * One failed pool should not prevent
   * the remaining positions from loading.
   */
  const results =
    await Promise.allSettled(
      pools.map(
        (pool) =>
          getWalletPoolPosition({
            account,
            pool,
          })
      )
    );

  const positions =
    [];

  for (
    let index = 0;
    index <
    results.length;
    index += 1
  ) {
    const result =
      results[index];

    if (
      result.status ===
      "fulfilled"
    ) {
      if (
        result.value
      ) {
        positions.push(
          result.value
        );
      }

      continue;
    }

    console.error(
      "Could not load LP position:",
      pools[index]
        ?.pairAddress ||
        pools[index]
          ?.poolAddress ||
        pools[index]
          ?.address,
      result.reason
    );
  }

  return positions;
}

export default getWalletPoolPositions;