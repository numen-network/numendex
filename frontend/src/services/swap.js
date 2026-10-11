import {
  BrowserProvider,
  Contract,
} from "ethers";

import {
  CONTRACT_ADDRESSES,
  NUMEN_NETWORK,
} from "../config/network";

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
];

/*
 * Numen RPC currently returns unrealistically
 * high gas estimates for some contract calls.
 *
 * Because of that, NumenDEX does not rely on
 * automatic estimateGas for swap execution.
 *
 * Observed single-hop swaps have used roughly
 * 408k-409k gas.
 *
 * We therefore use explicit limits with a
 * reasonable safety margin.
 */
export const APPROVE_GAS_LIMIT =
  250_000n;

export const SINGLE_HOP_SWAP_GAS_LIMIT =
  650_000n;

export const MULTI_HOP_SWAP_GAS_LIMIT =
  900_000n;

function getEthereum() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return (
    window.ethereum ||
    null
  );
}

function normalizeAddress(
  address
) {
  return String(
    address || ""
  ).trim();
}

function normalizeRawAmount(
  value,
  label
) {
  try {
    const amount =
      BigInt(
        String(value)
      );

    if (amount <= 0n) {
      throw new Error();
    }

    return amount;
  } catch {
    throw new Error(
      `${label} is invalid.`
    );
  }
}

function normalizePath(
  path
) {
  if (
    !Array.isArray(path) ||
    path.length < 2
  ) {
    throw new Error(
      "Swap route is invalid."
    );
  }

  const normalized =
    path.map(
      normalizeAddress
    );

  if (
    normalized.some(
      (address) =>
        !address
    )
  ) {
    throw new Error(
      "Swap route contains an invalid token address."
    );
  }

  return normalized;
}

function getSwapGasLimit(
  path
) {
  /*
   * 2 tokens:
   *
   * TOKEN A -> TOKEN B
   *
   * One liquidity pool / one hop.
   */
  if (
    path.length === 2
  ) {
    return (
      SINGLE_HOP_SWAP_GAS_LIMIT
    );
  }

  /*
   * 3+ tokens:
   *
   * Example:
   *
   * NDEX -> TEST -> NUMN
   *
   * Multiple liquidity pools require
   * additional gas.
   */
  return (
    MULTI_HOP_SWAP_GAS_LIMIT
  );
}

async function getWalletContext() {
  const ethereum =
    getEthereum();

  if (!ethereum) {
    throw new Error(
      "MetaMask was not detected."
    );
  }

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
    NUMEN_NETWORK.chainId
  ) {
    throw new Error(
      "Please switch to Numen Network."
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

export async function getTokenAllowance({
  tokenAddress,
  owner,
}) {
  const normalizedToken =
    normalizeAddress(
      tokenAddress
    );

  const normalizedOwner =
    normalizeAddress(
      owner
    );

  if (!normalizedToken) {
    throw new Error(
      "Token address is required."
    );
  }

  if (!normalizedOwner) {
    throw new Error(
      "Wallet address is required."
    );
  }

  const {
    signer,
  } =
    await getWalletContext();

  const token =
    new Contract(
      normalizedToken,
      ERC20_ABI,
      signer
    );

  const allowance =
    await token.allowance(
      normalizedOwner,
      CONTRACT_ADDRESSES.ROUTER
    );

  return BigInt(
    allowance.toString()
  );
}

export async function approveRouter({
  tokenAddress,
  amountRaw,
}) {
  const normalizedToken =
    normalizeAddress(
      tokenAddress
    );

  if (!normalizedToken) {
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
      normalizedToken,
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
          APPROVE_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  if (
    !receipt ||
    Number(
      receipt.status
    ) !== 1
  ) {
    throw new Error(
      "Token approval failed."
    );
  }

  return {
    hash:
      transaction.hash,

    receipt,
  };
}

export async function executeTokenSwap({
  amountInRaw,
  amountOutMinRaw,
  path,
  recipient,
  deadlineMinutes = 30,
}) {
  const amountIn =
    normalizeRawAmount(
      amountInRaw,
      "Input amount"
    );

  const amountOutMin =
    normalizeRawAmount(
      amountOutMinRaw,
      "Minimum output amount"
    );

  const normalizedPath =
    normalizePath(
      path
    );

  const {
    signer,
    account,
  } =
    await getWalletContext();

  const destination =
    normalizeAddress(
      recipient
    ) ||
    account;

  const parsedDeadline =
    Number(
      deadlineMinutes
    );

  const safeDeadlineMinutes =
    Number.isFinite(
      parsedDeadline
    ) &&
    parsedDeadline > 0
      ? Math.min(
          parsedDeadline,
          1440
        )
      : 30;

  const deadline =
    Math.floor(
      Date.now() /
        1000
    ) +
    Math.floor(
      safeDeadlineMinutes *
        60
    );

  const gasLimit =
    getSwapGasLimit(
      normalizedPath
    );

  const router =
    new Contract(
      CONTRACT_ADDRESSES.ROUTER,
      ROUTER_ABI,
      signer
    );

  const transaction =
    await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      normalizedPath,
      destination,
      deadline,
      {
        gasLimit,
      }
    );

  const receipt =
    await transaction.wait();

  if (
    !receipt ||
    Number(
      receipt.status
    ) !== 1
  ) {
    throw new Error(
      "Swap transaction failed."
    );
  }

  return {
    hash:
      transaction.hash,

    receipt,

    gasUsed:
      receipt.gasUsed
        ?.toString() ||
      null,

    gasLimit:
      gasLimit.toString(),
  };
}