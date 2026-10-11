import {
  TOKEN_ADDRESSES,
} from "../config/network";

const BALANCE_OF_SELECTOR = "70a08231";

function getEthereum() {
  if (
    typeof window === "undefined" ||
    !window.ethereum
  ) {
    return null;
  }

  return window.ethereum;
}

function normalizeAddress(address) {
  return String(address || "")
    .toLowerCase();
}

function encodeBalanceOf(account) {
  const cleanAddress = String(account)
    .toLowerCase()
    .replace(/^0x/, "");

  return (
    "0x" +
    BALANCE_OF_SELECTOR +
    cleanAddress.padStart(64, "0")
  );
}

/*
 * Exact token-unit formatting.
 *
 * IMPORTANT:
 * This function does NOT round or truncate
 * blockchain values.
 *
 * It is used for calculations and input values.
 */
export function formatTokenUnits(
  rawValue,
  decimals = 18
) {
  const value =
    typeof rawValue === "bigint"
      ? rawValue
      : BigInt(rawValue || 0);

  const safeDecimals =
    Number(decimals);

  if (safeDecimals === 0) {
    return value.toString();
  }

  const negative =
    value < 0n;

  const absoluteValue =
    negative
      ? -value
      : value;

  const base =
    10n ** BigInt(
      safeDecimals
    );

  const integerPart =
    absoluteValue / base;

  const fractionPart =
    absoluteValue % base;

  const fraction =
    fractionPart
      .toString()
      .padStart(
        safeDecimals,
        "0"
      )
      .replace(/0+$/, "");

  const result =
    fraction.length > 0
      ? `${integerPart}.${fraction}`
      : integerPart.toString();

  return negative
    ? `-${result}`
    : result;
}

/*
 * UI-only balance formatter.
 *
 * - Maximum 5 decimal places
 * - Removes unnecessary trailing zeros
 * - Uses the user's locale
 * - Does NOT affect actual blockchain precision
 */
export function formatDisplayBalance(
  rawValue,
  decimals = 18,
  maximumFractionDigits = 5
) {
  try {
    const value =
      typeof rawValue === "bigint"
        ? rawValue
        : BigInt(rawValue || 0);

    const safeDecimals =
      Math.max(
        0,
        Number(decimals) || 0
      );

    const displayDecimals =
      Math.min(
        safeDecimals,
        Math.max(
          0,
          Number(
            maximumFractionDigits
          ) || 0
        )
      );

    const negative =
      value < 0n;

    const absoluteValue =
      negative
        ? -value
        : value;

    const base =
      10n ** BigInt(
        safeDecimals
      );

    const integerPart =
      absoluteValue / base;

    const fractionPart =
      absoluteValue % base;

    let fractionString =
      "";

    if (
      displayDecimals > 0 &&
      safeDecimals > 0
    ) {
      const fullFraction =
        fractionPart
          .toString()
          .padStart(
            safeDecimals,
            "0"
          );

      fractionString =
        fullFraction
          .slice(
            0,
            displayDecimals
          )
          .replace(
            /0+$/,
            ""
          );
    }

    const integerString =
      integerPart.toLocaleString(
        undefined
      );

    const decimalSeparator =
      (
        1.1
      )
        .toLocaleString(
          undefined
        )
        .replace(
          /\d/g,
          ""
        )
        .charAt(0) || ".";

    let result =
      integerString;

    if (fractionString) {
      result +=
        decimalSeparator +
        fractionString;
    }

    if (negative) {
      result =
        `-${result}`;
    }

    return result;
  } catch (error) {
    console.error(
      "Could not format balance:",
      error
    );

    return "0";
  }
}

export async function getNativeBalance(
  account
) {
  const ethereum =
    getEthereum();

  if (!ethereum) {
    throw new Error(
      "MetaMask was not detected."
    );
  }

  if (!account) {
    return 0n;
  }

  const result =
    await ethereum.request({
      method:
        "eth_getBalance",

      params: [
        account,
        "latest",
      ],
    });

  return BigInt(
    result || "0x0"
  );
}

export async function getErc20Balance(
  tokenAddress,
  account
) {
  const ethereum =
    getEthereum();

  if (!ethereum) {
    throw new Error(
      "MetaMask was not detected."
    );
  }

  if (
    !tokenAddress ||
    !account
  ) {
    return 0n;
  }

  const data =
    encodeBalanceOf(
      account
    );

  const result =
    await ethereum.request({
      method:
        "eth_call",

      params: [
        {
          to: tokenAddress,
          data,
        },

        "latest",
      ],
    });

  return BigInt(
    result || "0x0"
  );
}

export async function getTokenBalance({
  token,
  account,
}) {
  if (
    !token ||
    !account
  ) {
    return {
      raw: 0n,
      formatted: "0",
    };
  }

  const tokenAddress =
    normalizeAddress(
      token.address
    );

  const numenAddress =
    normalizeAddress(
      TOKEN_ADDRESSES.NUMN
    );

  let rawBalance;

  if (
    tokenAddress ===
    numenAddress
  ) {
    /*
     * NUMN is the native asset.
     */
    rawBalance =
      await getNativeBalance(
        account
      );
  } else {
    /*
     * Standard ERC-20 token.
     */
    rawBalance =
      await getErc20Balance(
        token.address,
        account
      );
  }

  return {
    raw: rawBalance,

    formatted:
      formatTokenUnits(
        rawBalance,
        token.decimals ?? 18
      ),
  };
}