import {
  useCallback,
  useState,
} from "react";

import {
  parseUnits,
} from "ethers";

import {
  approveRouter,
  executeTokenSwap,
  getTokenAllowance,
} from "../services/swap";

function getReadableError(
  error
) {
  if (
    error?.code === 4001 ||
    error?.code ===
      "ACTION_REJECTED"
  ) {
    return (
      "Transaction rejected by user."
    );
  }

  return (
    error?.shortMessage ||
    error?.reason ||
    error?.message ||
    "Transaction failed."
  );
}

export default function useSwap() {
  const [
    status,
    setStatus,
  ] =
    useState("idle");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    txHash,
    setTxHash,
  ] =
    useState("");

  const resetSwapState =
    useCallback(() => {
      setStatus("idle");
      setError("");
      setTxHash("");
    }, []);

  const executeSwap =
    useCallback(
      async ({
        account,
        tokenIn,
        tokenOut,
        amountIn,
        slippage,
        quote,
        deadlineMinutes,
      }) => {
        setError("");
        setTxHash("");

        if (!account) {
          const message =
            "Connect your wallet first.";

          setError(message);

          throw new Error(
            message
          );
        }

        if (
          !tokenIn?.address
        ) {
          const message =
            "Input token is missing.";

          setError(message);

          throw new Error(
            message
          );
        }

        if (!quote) {
          const message =
            "Swap quote is missing.";

          setError(message);

          throw new Error(
            message
          );
        }

        if (
          !quote?.amountIn
            ?.raw
        ) {
          const message =
            "Input amount is missing from the quote.";

          setError(message);

          throw new Error(
            message
          );
        }

        if (
          !Array.isArray(
            quote.path
          ) ||
          quote.path.length <
            2
        ) {
          const message =
            "Swap route is invalid.";

          setError(message);

          throw new Error(
            message
          );
        }

        const amountInRaw =
          parseUnits(
            String(amountIn).trim(),
            tokenIn.decimals ?? 18
          );

        const sameAddress = (a, b) =>
          String(a).toLowerCase() ===
          String(b).toLowerCase();

        if (
          !sameAddress(quote.path[0], tokenIn.address) ||
          !sameAddress(quote.path[quote.path.length - 1], tokenOut?.address) ||
          BigInt(quote.amountIn.raw) !== amountInRaw
        ) {
          const message =
            "Quote is out of date. Please try again.";

          setError(message);

          throw new Error(
            message
          );
        }

        try {
          setStatus(
            "checking-allowance"
          );

          const allowance =
            await getTokenAllowance({
              tokenAddress:
                tokenIn.address,

              owner:
                account,
            });

          if (
            allowance <
            amountInRaw
          ) {
            setStatus(
              "approving"
            );

            const approval =
              await approveRouter({
                tokenAddress:
                  tokenIn.address,
                amountRaw: amountInRaw,
              });

            setTxHash(
              approval.hash
            );
          }

          setStatus(
            "swapping"
          );

          const result =
            await executeTokenSwap({
              amountInRaw,

              slippage,

              path:
                quote.path,

              recipient:
                account,

              deadlineMinutes,
            });

          setTxHash(
            result.hash
          );

          setStatus(
            "success"
          );

          return result;
        } catch (
          swapError
        ) {
          const message =
            getReadableError(
              swapError
            );

          console.error(
            "Swap failed:",
            swapError
          );

          setStatus(
            "error"
          );

          setError(
            message
          );

          throw swapError;
        }
      },
      []
    );

  return {
    status,
    error,
    txHash,

    isCheckingAllowance:
      status ===
      "checking-allowance",

    isApproving:
      status ===
      "approving",

    isSwapping:
      status ===
      "swapping",

    isPending:
      status ===
        "checking-allowance" ||
      status ===
        "approving" ||
      status ===
        "swapping",

    isSuccess:
      status ===
      "success",

    executeSwap,
    resetSwapState,
  };
}