import {
  BrowserProvider,
  Contract,
  parseUnits,
} from "ethers";

import {
  CONTRACT_ADDRESSES,
  NUMEN_NETWORK,
} from "../config/network";

// ========================================
// ABIs
// ========================================

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
];

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
];

// ========================================
// GAS LIMITS
// ========================================

const LIQUIDITY_APPROVE_GAS_LIMIT =
  250_000n;

/*
 * Mainnet tests showed that addLiquidity
 * uses roughly 1.9M gas.
 *
 * Numen RPC currently returns unrealistically
 * high estimateGas values for some EVM contract
 * interactions, so we intentionally use a
 * manual gas limit.
 *
 * 2.5M gives us a reasonable safety margin
 * without showing the previous 4M / 2 NUMN
 * maximum fee in MetaMask.
 */
const ADD_LIQUIDITY_GAS_LIMIT =
  2_500_000n;

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

// ========================================
// HELPERS
// ========================================

function getEthereum() {
  if (
    typeof window ===
      "undefined" ||
    !window.ethereum
  ) {
    throw new Error(
      "MetaMask is not available."
    );
  }

  return window.ethereum;
}

function normalizeAddress(
  address
) {
  return String(
    address || ""
  ).toLowerCase();
}

function sameAddress(
  first,
  second
) {
  return (
    normalizeAddress(
      first
    ) ===
    normalizeAddress(
      second
    )
  );
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

function normalizeSlippage(
  value
) {
  const slippage =
    Number(value);

  if (
    !Number.isFinite(
      slippage
    ) ||
    slippage < 0 ||
    slippage > 100
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
    !Number.isFinite(
      minutes
    ) ||
    minutes <= 0
  ) {
    throw new Error(
      "Invalid transaction deadline."
    );
  }

  return minutes;
}

function parseTokenAmount({
  amount,
  token,
}) {
  if (!token) {
    throw new Error(
      "Token is required."
    );
  }

  const normalizedAmount =
    String(
      amount ?? ""
    ).trim();

  if (
    !normalizedAmount ||
    Number(
      normalizedAmount
    ) <= 0
  ) {
    throw new Error(
      `Enter a valid ${
        token.symbol ||
        "token"
      } amount.`
    );
  }

  return parseUnits(
    normalizedAmount,
    normalizeDecimals(
      token.decimals
    )
  );
}

function applySlippage(
  amount,
  slippage
) {
  const normalizedSlippage =
    normalizeSlippage(
      slippage
    );

  const slippageBps =
    BigInt(
      Math.round(
        normalizedSlippage *
          100
      )
    );

  const denominator =
    10_000n;

  if (
    slippageBps >=
    denominator
  ) {
    return 0n;
  }

  return (
    amount *
    (
      denominator -
      slippageBps
    )
  ) /
    denominator;
}

// ========================================
// WALLET CONTEXT
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
    ethereum,
    provider,
    signer,
    account,
  };
}

// ========================================
// GET PAIR
// ========================================

export async function getLiquidityPair({
  tokenA,
  tokenB,
}) {
  if (
    !tokenA?.address ||
    !tokenB?.address
  ) {
    throw new Error(
      "Select two tokens."
    );
  }

  if (
    sameAddress(
      tokenA.address,
      tokenB.address
    )
  ) {
    throw new Error(
      "Select two different tokens."
    );
  }

  const {
    signer,
  } =
    await getWalletContext();

  const factory =
    new Contract(
      CONTRACT_ADDRESSES.FACTORY,
      FACTORY_ABI,
      signer
    );

  const pairAddress =
    await factory.getPair(
      tokenA.address,
      tokenB.address
    );

  if (
    sameAddress(
      pairAddress,
      ZERO_ADDRESS
    )
  ) {
    return {
      exists: false,

      pairAddress:
        ZERO_ADDRESS,

      token0: null,
      token1: null,

      reserveA: 0n,
      reserveB: 0n,

      reserve0: 0n,
      reserve1: 0n,

      blockTimestampLast:
        0,
    };
  }

  const pair =
    new Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  const [
    token0,
    token1,
    reserves,
  ] =
    await Promise.all([
      pair.token0(),
      pair.token1(),
      pair.getReserves(),
    ]);

  const reserve0 =
    BigInt(
      reserves[0]
    );

  const reserve1 =
    BigInt(
      reserves[1]
    );

  const blockTimestampLast =
    Number(
      reserves[2]
    );

  const tokenAIsToken0 =
    sameAddress(
      tokenA.address,
      token0
    );

  return {
    exists: true,

    pairAddress,

    token0,
    token1,

    reserve0,
    reserve1,

    reserveA:
      tokenAIsToken0
        ? reserve0
        : reserve1,

    reserveB:
      tokenAIsToken0
        ? reserve1
        : reserve0,

    blockTimestampLast,
  };
}

// ========================================
// CALCULATE COUNTERPART AMOUNT
// ========================================

export function calculateCounterpartAmountRaw({
  amountRaw,
  reserveInput,
  reserveOutput,
}) {
  const amount =
    BigInt(
      amountRaw
    );

  const inputReserve =
    BigInt(
      reserveInput
    );

  const outputReserve =
    BigInt(
      reserveOutput
    );

  if (
    amount <= 0n ||
    inputReserve <= 0n ||
    outputReserve <= 0n
  ) {
    return 0n;
  }

  return (
    amount *
    outputReserve
  ) /
    inputReserve;
}

// ========================================
// ALLOWANCE
// ========================================

export async function getLiquidityAllowance({
  tokenAddress,
  owner,
}) {
  if (
    !tokenAddress ||
    !owner
  ) {
    return 0n;
  }

  const {
    signer,
  } =
    await getWalletContext();

  const token =
    new Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

  const allowance =
    await token.allowance(
      owner,
      CONTRACT_ADDRESSES.ROUTER
    );

  return BigInt(
    allowance
  );
}

// ========================================
// APPROVE TOKEN
// ========================================

export async function approveLiquidityToken({
  tokenAddress,
  amountRaw,
}) {
  if (!tokenAddress) {
    throw new Error(
      "Token address is required."
    );
  }

  const {
    signer,
  } =
    await getWalletContext();

  const token =
    new Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

  const approvalAmount = BigInt(String(amountRaw));
  if (approvalAmount <= 0n) throw new Error("Invalid approval amount");

  const transaction =
    await token.approve(
      CONTRACT_ADDRESSES.ROUTER,
      approvalAmount,
      {
        gasLimit:
          LIQUIDITY_APPROVE_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  return {
    hash:
      transaction.hash,

    receipt,

    gasLimit:
      LIQUIDITY_APPROVE_GAS_LIMIT,
  };
}

// ========================================
// ADD LIQUIDITY
// ========================================

export async function addLiquidity({
  tokenA,
  tokenB,

  amountA,
  amountB,

  slippage = 0.5,

  recipient,

  deadlineMinutes = 30,
}) {
  if (
    !tokenA?.address ||
    !tokenB?.address
  ) {
    throw new Error(
      "Select two tokens."
    );
  }

  if (
    sameAddress(
      tokenA.address,
      tokenB.address
    )
  ) {
    throw new Error(
      "Select two different tokens."
    );
  }

  const amountADesired =
    parseTokenAmount({
      amount:
        amountA,
      token:
        tokenA,
    });

  const amountBDesired =
    parseTokenAmount({
      amount:
        amountB,
      token:
        tokenB,
    });

  if (
    amountADesired <= 0n ||
    amountBDesired <= 0n
  ) {
    throw new Error(
      "Liquidity amounts must be greater than zero."
    );
  }

  const amountAMin =
    applySlippage(
      amountADesired,
      slippage
    );

  const amountBMin =
    applySlippage(
      amountBDesired,
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

  const router =
    new Contract(
      CONTRACT_ADDRESSES.ROUTER,
      ROUTER_ABI,
      signer
    );

  const transaction =
    await router.addLiquidity(
      tokenA.address,
      tokenB.address,

      amountADesired,
      amountBDesired,

      amountAMin,
      amountBMin,

      liquidityRecipient,

      deadline,

      {
        gasLimit:
          ADD_LIQUIDITY_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  return {
    hash:
      transaction.hash,

    receipt,

    tokenA:
      tokenA.address,

    tokenB:
      tokenB.address,

    amountADesired:
      amountADesired.toString(),

    amountBDesired:
      amountBDesired.toString(),

    amountAMin:
      amountAMin.toString(),

    amountBMin:
      amountBMin.toString(),

    recipient:
      liquidityRecipient,

    deadline,

    gasLimit:
      ADD_LIQUIDITY_GAS_LIMIT,
  };
}

// ========================================
// PARSE AMOUNT FOR UI
// ========================================

export function parseLiquidityAmount({
  amount,
  token,
}) {
  return parseTokenAmount({
    amount,
    token,
  });
}