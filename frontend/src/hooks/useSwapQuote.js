import {
  useEffect,
  useState,
} from "react";

import {
  fetchSwapQuote,
} from "../services/quote";

const QUOTE_DEBOUNCE_MS =
  350;

function getQuoteKey({
  tokenIn,
  tokenOut,
  amountIn,
  slippage,
}) {
  return [
    tokenIn?.address,
    tokenOut?.address,
    amountIn,
    slippage,
  ].join("|");
}

function isPositiveAmount(
  value
) {
  const amount =
    String(
      value ?? ""
    ).trim();

  if (
    !/^(?:\d+|\d*\.\d+)$/.test(
      amount
    )
  ) {
    return false;
  }

  try {
    const [
      integerPart = "0",
      fractionPart = "",
    ] =
      amount.split(".");

    const digits =
      `${integerPart}${fractionPart}`
        .replace(
          /^0+/,
          ""
        );

    return digits.length > 0;
  } catch {
    return false;
  }
}

export default function useSwapQuote({
  tokenIn,
  tokenOut,
  amountIn,
  slippage,
  enabled = true,
}) {
  const [
    quote,
    setQuote,
  ] = useState(null);

  const [
    quoteKey,
    setQuoteKey,
  ] = useState("");

  const currentKey =
    getQuoteKey({
      tokenIn,
      tokenOut,
      amountIn,
      slippage,
    });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (
      !enabled ||
      !tokenIn?.address ||
      !tokenOut?.address ||
      !isPositiveAmount(
        amountIn
      )
    ) {
      setQuote(null);
      setLoading(false);
      setError("");

      return;
    }

    if (
      tokenIn.address
        .toLowerCase() ===
      tokenOut.address
        .toLowerCase()
    ) {
      setQuote(null);
      setLoading(false);
      setError("");

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            setLoading(true);
            setError("");

            const result =
              await fetchSwapQuote({
                tokenIn,
                tokenOut,
                amountIn,
                slippage,
                signal:
                  controller.signal,
              });

            if (
              controller
                .signal
                .aborted
            ) {
              return;
            }

            setQuote(
              result
            );

            setQuoteKey(
              currentKey
            );
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
              "AbortError"
            ) {
              return;
            }

            console.error(
              "Could not load swap quote:",
              requestError
            );

            setQuote(null);

            setError(
              requestError
                ?.message ||
                "Could not calculate quote."
            );
          } finally {
            if (
              !controller
                .signal
                .aborted
            ) {
              setLoading(
                false
              );
            }
          }
        },
        QUOTE_DEBOUNCE_MS
      );

    return () => {
      window.clearTimeout(
        timer
      );

      controller.abort();
    };
  }, [
    tokenIn,
    tokenOut,
    amountIn,
    slippage,
    enabled,
    currentKey,
  ]);

  const stale =
    Boolean(quote) &&
    quoteKey !== currentKey;

  return {
    quote,
    loading:
      loading || stale,
    error,
  };
}