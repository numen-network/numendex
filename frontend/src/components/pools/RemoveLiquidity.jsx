import {
  BrowserProvider,
  Contract,
} from "ethers";

import {
  CONTRACT_ADDRESSES,
  NUMEN_NETWORK,
} from "../config/network";

// ========================================
// ABIs
// ========================================

const PAIR_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

const ROUTER_ABI = [
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)",
];

// ========================================
// GAS LIMITS
// ========================================

const LP_APPROVE_GAS_LIMIT =
  250_000n;

/*
 * Previous Numen mainnet remove-liquidity
 * testing consumed roughly 421k gas.
 *
 * Numen RPC can return unrealistic
 * estimateGas values for EVM calls.
 *
 * 750k gives us a generous safety margin
 * without using the RPC estimate directly.
 */
const REMOVE_LIQUIDITY_GAS_LIMIT =
  750_000n;

// ========================================
// HELPERS
// ========================================

function getEthereum() {
  if (
    typeof window === "undefined" ||
    !window.ethereum
  ) {
    throw new Error(
      "MetaMask is not available."
    );
  }

  return window.ethereum;
}

function normalizeAddress(address) {
  return String(
    address || ""
  ).toLowerCase();
}

function sameAddress(
  first,
  second
) {
  return (
    normalizeAddress(first) ===
    normalizeAddress(second)
  );
}

function normalizePercentage(
  value
) {
  const percentage =
    Number(value);

  if (
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage > 100
  ) {
    throw new Error(
      "Percentage must be greater than 0 and no more than 100."
    );
  }

  return percentage;
}

function normalizeSlippage(
  value
) {
  const slippage =
    Number(value);

  if (
    !Number.isFinite(slippage) ||
    slippage < 0 ||
    slippage >= 100
  ) {
    throw new Error(
      "Invalid slippage value."
    );
  }

  return slippage;
}

function normalizeDeadlineMinutes(
  value
) {
  const minutes =
    Number(value);

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw new Error(
      "Invalid transaction deadline."
    );
  }

  return minutes;
}

function calculateMinimumAmount(
  amount,
  slippage
) {
  const normalizedSlippage =
    normalizeSlippage(
      slippage
    );

  /*
   * 0.5% => 50 basis points.
   */
  const slippageBps =
    BigInt(
      Math.round(
        normalizedSlippage *
          100
      )
    );

  const denominator =
    10_000n;

  return (
    BigInt(amount) *
    (
      denominator -
      slippageBps
    )
  ) /
    denominator;
}

function calculateLiquidityFromPercentage(
  lpBalance,
  percentage
) {
  const balance =
    BigInt(
      lpBalance
    );

  const normalizedPercentage =
    normalizePercentage(
      percentage
    );

  /*
   * Support percentages with up to
   * four decimal places.
   *
   * 100% = 1,000,000 units
   */
  const scaledPercentage =
    BigInt(
      Math.round(
        normalizedPercentage *
          10_000
      )
    );

  const denominator =
    1_000_000n;

  let liquidity =
    (
      balance *
      scaledPercentage
    ) /
    denominator;

  /*
   * Make 100% exactly equal to the
   * wallet's complete LP balance.
   */
  if (
    normalizedPercentage === 100
  ) {
    liquidity =
      balance;
  }

  return liquidity;
}

// ========================================
// WALLET
// ========================================

async function getWalletContext() {
  const ethereum =
    getEthereum();

  const provider =
    new BrowserProvider(
      ethereum
    );

  const network =
    await provider.getNetwork();

  if (
    Number(
      network.chainId
    ) !==
    Number(
      NUMEN_NETWORK.chainId
    )
  ) {
    throw new Error(
      "Switch to Numen Network first."
    );
  }

  const signer =
    await provider.getSigner();

  const account =
    await signer.getAddress();

  return {
    provider,
    signer,
    account,
  };
}

// ========================================
// POSITION INFO
// ========================================

export async function getRemoveLiquidityInfo({
  pairAddress,
  account,
}) {
  if (
    !pairAddress
  ) {
    throw new Error(
      "Pair address is required."
    );
  }

  if (
    !account
  ) {
    throw new Error(
      "Wallet account is required."
    );
  }

  const {
    signer,
  } =
    await getWalletContext();

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  const [
    token0,
    token1,
    lpBalanceResult,
    totalSupplyResult,
    reserves,
    allowanceResult,
  ] =
    await Promise.all([
      pair.token0(),
      pair.token1(),

      pair.balanceOf(
        account
      ),

      pair.totalSupply(),

      pair.getReserves(),

      pair.allowance(
        account,
        CONTRACT_ADDRESSES.ROUTER
      ),
    ]);

  const lpBalance =
    BigInt(
      lpBalanceResult
    );

  const totalSupply =
    BigInt(
      totalSupplyResult
    );

  const reserve0 =
    BigInt(
      reserves[0]
    );

  const reserve1 =
    BigInt(
      reserves[1]
    );

  const allowance =
    BigInt(
      allowanceResult
    );

  const amount0 =
    totalSupply > 0n
      ? (
          reserve0 *
          lpBalance
        ) /
        totalSupply
      : 0n;

  const amount1 =
    totalSupply > 0n
      ? (
          reserve1 *
          lpBalance
        ) /
        totalSupply
      : 0n;

  return {
    pairAddress,

    token0,
    token1,

    lpBalance,
    totalSupply,

    reserve0,
    reserve1,

    amount0,
    amount1,

    allowance,

    blockTimestampLast:
      Number(
        reserves[2]
      ),
  };
}

// ========================================
// CALCULATE REMOVE PREVIEW
// ========================================

export function calculateRemovePreview({
  lpBalance,
  totalSupply,
  reserve0,
  reserve1,
  percentage,
}) {
  const liquidity =
    calculateLiquidityFromPercentage(
      lpBalance,
      percentage
    );

  const supply =
    BigInt(
      totalSupply
    );

  if (
    liquidity <= 0n ||
    supply <= 0n
  ) {
    return {
      liquidity: 0n,
      amount0: 0n,
      amount1: 0n,
    };
  }

  const amount0 =
    (
      BigInt(
        reserve0
      ) *
      liquidity
    ) /
    supply;

  const amount1 =
    (
      BigInt(
        reserve1
      ) *
      liquidity
    ) /
    supply;

  return {
    liquidity,
    amount0,
    amount1,
  };
}

// ========================================
// LP ALLOWANCE
// ========================================

export async function getLpAllowance({
  pairAddress,
  owner,
}) {
  if (
    !pairAddress ||
    !owner
  ) {
    return 0n;
  }

  const {
    signer,
  } =
    await getWalletContext();

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  const allowance =
    await pair.allowance(
      owner,
      CONTRACT_ADDRESSES.ROUTER
    );

  return BigInt(
    allowance
  );
}

// ========================================
// APPROVE LP TOKEN
// ========================================

export async function approveLpToken({
  pairAddress,
  amountRaw,
}) {
  if (
    !pairAddress
  ) {
    throw new Error(
      "Pair address is required."
    );
  }

  const {
    signer,
  } =
    await getWalletContext();

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  const approvalAmount = BigInt(String(amountRaw));
  if (approvalAmount <= 0n) throw new Error("Invalid approval amount");

  const transaction =
    await pair.approve(
      CONTRACT_ADDRESSES.ROUTER,
      approvalAmount,
      {
        gasLimit:
          LP_APPROVE_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  return {
    hash:
      transaction.hash,

    receipt,

    gasLimit:
      LP_APPROVE_GAS_LIMIT,
  };
}

// ========================================
// REMOVE LIQUIDITY
// ========================================

export async function removeLiquidity({
  pairAddress,

  tokenA,
  tokenB,

  liquidity,

  expectedAmountA,
  expectedAmountB,

  slippage = 0.5,

  recipient,

  deadlineMinutes = 30,
}) {
  if (
    !pairAddress
  ) {
    throw new Error(
      "Pair address is required."
    );
  }

  if (
    !tokenA ||
    !tokenB
  ) {
    throw new Error(
      "Token addresses are required."
    );
  }

  if (
    sameAddress(
      tokenA,
      tokenB
    )
  ) {
    throw new Error(
      "Token addresses must be different."
    );
  }

  const liquidityRaw =
    BigInt(
      liquidity
    );

  const amountARaw =
    BigInt(
      expectedAmountA
    );

  const amountBRaw =
    BigInt(
      expectedAmountB
    );

  if (
    liquidityRaw <= 0n
  ) {
    throw new Error(
      "Liquidity amount must be greater than zero."
    );
  }

  if (
    amountARaw <= 0n ||
    amountBRaw <= 0n
  ) {
    throw new Error(
      "Expected token amounts must be greater than zero."
    );
  }

  const amountAMin =
    calculateMinimumAmount(
      amountARaw,
      slippage
    );

  const amountBMin =
    calculateMinimumAmount(
      amountBRaw,
      slippage
    );

  const normalizedDeadline =
    normalizeDeadlineMinutes(
      deadlineMinutes
    );

  const deadline =
    Math.floor(
      Date.now() /
        1000
    ) +
    Math.floor(
      normalizedDeadline *
        60
    );

  const {
    signer,
    account,
  } =
    await getWalletContext();

  const liquidityRecipient =
    recipient ||
    account;

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  /*
   * Verify that the supplied token
   * addresses really belong to this pair.
   */
  const [
    pairToken0,
    pairToken1,
  ] =
    await Promise.all([
      pair.token0(),
      pair.token1(),
    ]);

  const validPair =
    (
      sameAddress(
        tokenA,
        pairToken0
      ) &&
      sameAddress(
        tokenB,
        pairToken1
      )
    ) ||
    (
      sameAddress(
        tokenA,
        pairToken1
      ) &&
      sameAddress(
        tokenB,
        pairToken0
      )
    );

  if (
    !validPair
  ) {
    throw new Error(
      "Selected tokens do not match this liquidity pair."
    );
  }

  /*
   * Router returns amounts according to
   * tokenA/tokenB ordering.
   *
   * Preview values are calculated using
   * pair token0/token1 ordering, so map
   * them if tokenA is token1.
   */
  const tokenAIsToken0 =
    sameAddress(
      tokenA,
      pairToken0
    );

  const expectedRouterAmountA =
    tokenAIsToken0
      ? amountARaw
      : amountBRaw;

  const expectedRouterAmountB =
    tokenAIsToken0
      ? amountBRaw
      : amountARaw;

  const routerAmountAMin =
    calculateMinimumAmount(
      expectedRouterAmountA,
      slippage
    );

  const routerAmountBMin =
    calculateMinimumAmount(
      expectedRouterAmountB,
      slippage
    );

  const router =
    new Contract(
      CONTRACT_ADDRESSES.ROUTER,
      ROUTER_ABI,
      signer
    );

  const transaction =
    await router.removeLiquidity(
      tokenA,
      tokenB,

      liquidityRaw,

      routerAmountAMin,
      routerAmountBMin,

      liquidityRecipient,

      deadline,

      {
        gasLimit:
          REMOVE_LIQUIDITY_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  return {
    hash:
      transaction.hash,

    receipt,

    pairAddress,

    tokenA,
    tokenB,

    liquidity:
      liquidityRaw.toString(),

    amountAMin:
      routerAmountAMin.toString(),

    amountBMin:
      routerAmountBMin.toString(),

    recipient:
      liquidityRecipient,

    deadline,

    gasLimit:
      REMOVE_LIQUIDITY_GAS_LIMIT,
  };
}

// ========================================
// EXPORT HELPERS
// ========================================

export {
  calculateLiquidityFromPercentage,
};