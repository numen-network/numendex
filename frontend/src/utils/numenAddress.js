import {
  addressToEvm,
  decodeAddress,
  encodeAddress,
  evmToAddress,
} from "@polkadot/util-crypto";

import {
  hexToU8a,
  u8aToHex,
} from "@polkadot/util";

export const NUMEN_SS58_PREFIX = 14240;

export const NUMEN_EXPLORER_URL =
  "https://explorer.numen-network.org";


/* =========================================================
   EVM ADDRESS VALIDATION
   ========================================================= */

export function isEvmAddress(address) {
  if (!address) {
    return false;
  }

  const value =
    String(address).trim();

  return /^0x[a-fA-F0-9]{40}$/.test(
    value
  );
}


/* =========================================================
   NUMEN SS58 ADDRESS VALIDATION
   ========================================================= */

export function isNumenAddress(address) {
  if (!address) {
    return false;
  }

  try {
    decodeAddress(
      String(address).trim(),
      false,
      NUMEN_SS58_PREFIX
    );

    return true;
  } catch {
    return false;
  }
}


/* =========================================================
   EVM -> NUMEN SS58
   ========================================================= */

export function evmToNumenAddress(
  evmAddress
) {
  if (!isEvmAddress(evmAddress)) {
    throw new Error(
      "Invalid EVM address."
    );
  }

  const normalized =
    String(evmAddress)
      .trim()
      .toLowerCase();

  const evmBytes =
    hexToU8a(normalized);

  return evmToAddress(
    evmBytes,
    NUMEN_SS58_PREFIX
  );
}


/* =========================================================
   NUMEN SS58 -> EVM
   ========================================================= */

export function numenToEvmAddress(
  numenAddress
) {
  if (!isNumenAddress(numenAddress)) {
    throw new Error(
      "Invalid Numen address."
    );
  }

  const evmBytes =
    addressToEvm(
      String(numenAddress).trim()
    );

  return u8aToHex(
    evmBytes
  );
}


/* =========================================================
   NORMALIZE TO NUMEN SS58
   ========================================================= */

export function normalizeNumenAddress(
  address
) {
  if (!address) {
    throw new Error(
      "Address is required."
    );
  }

  const value =
    String(address).trim();

  /*
   * MetaMask / EVM address
   */
  if (isEvmAddress(value)) {
    return evmToNumenAddress(
      value
    );
  }

  /*
   * Existing Substrate/SS58 address.
   *
   * Decode it and encode again using
   * Numen's SS58 prefix.
   */
  try {
    const decoded =
      decodeAddress(value);

    return encodeAddress(
      decoded,
      NUMEN_SS58_PREFIX
    );
  } catch {
    throw new Error(
      "Invalid EVM or Numen address."
    );
  }
}


/* =========================================================
   ACCOUNT EXPLORER URL
   ========================================================= */

export function getNumenAccountExplorerUrl(
  address
) {
  const numenAddress =
    normalizeNumenAddress(
      address
    );

  return (
    `${NUMEN_EXPLORER_URL}/account/` +
    encodeURIComponent(
      numenAddress
    )
  );
}


/* =========================================================
   TRANSACTION EXPLORER URL
   ========================================================= */

export function getNumenTransactionExplorerUrl(
  txHash
) {
  if (!txHash) {
    throw new Error(
      "Transaction hash is required."
    );
  }

  return (
    `${NUMEN_EXPLORER_URL}/tx/` +
    encodeURIComponent(
      String(txHash).trim()
    )
  );
}


/* =========================================================
   BLOCK EXPLORER URL
   ========================================================= */

export function getNumenBlockExplorerUrl(
  blockNumber
) {
  if (
    blockNumber === undefined ||
    blockNumber === null ||
    blockNumber === ""
  ) {
    throw new Error(
      "Block number is required."
    );
  }

  return (
    `${NUMEN_EXPLORER_URL}/block/` +
    encodeURIComponent(
      String(blockNumber)
    )
  );
}


/* =========================================================
   SHORT ADDRESS
   ========================================================= */

export function shortenNumenAddress(
  address,
  start = 6,
  end = 4
) {
  if (!address) {
    return "";
  }

  const value =
    String(address);

  if (
    value.length <=
    start + end + 3
  ) {
    return value;
  }

  return (
    `${value.slice(0, start)}` +
    "..." +
    `${value.slice(-end)}`
  );
}