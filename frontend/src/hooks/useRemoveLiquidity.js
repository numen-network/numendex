import {
  useCallback,
  useState,
} from "react";

import {
  approveLpToken,
  getLpAllowance,
  removeLiquidity,
} from "../services/removeLiquidity";

// ========================================
// ERROR HELPER
// ========================================

function getReadableError(
  error
) {
  if (!error) {
    return "Unknown error.";
  }

  if (
    error.code === 4001 ||
    error.code ===
      "ACTION_REJECTED"
  ) {
    return "Transaction rejected in wallet.";
  }

  if (
    error?.info?.error
      ?.message
  ) {
    return error.info.error.message;
  }

  if (
    error?.error
      ?.message
  ) {
    return error.error.message;
  }

  if (
    error?.shortMessage
  ) {
    return error.shortMessage;
  }

  if (
    error?.reason
  ) {
    return error.reason;
  }

  if (
    error?.message
  ) {
    return error.message;
  }

  return "Transaction failed.";
}

// ========================================
// HOOK
// ========================================

export default function useRemoveLiquidity() {
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

  const [
    approvalTxHash,
    setApprovalTxHash,
  ] =
    useState("");

  // ========================================
  // RESET
  // ========================================

  const resetRemoveLiquidityState =
    useCallback(() => {
      setStatus(
        "idle"
      );

      setError(
        ""
      );

      setTxHash(
        ""
      );

      setApprovalTxHash(
        ""
      );
    }, []);

  // ========================================
  // EXECUTE
  // ========================================

  const executeRemoveLiquidity =
    useCallback(
      async ({
        account,

        pairAddress,

        token0,
        token1,

        liquidity,

        expectedAmount0,
        expectedAmount1,

        slippage = 0.5,

        deadlineMinutes = 30,

        recipient,
      }) => {
        resetRemoveLiquidityState();

        try {
          // =================================
          // VALIDATION
          // =================================

          if (
            !account
          ) {
            throw new Error(
              "Connect your wallet first."
            );
          }

          if (
            !pairAddress
          ) {
            throw new Error(
              "Pair address is required."
            );
          }

          if (
            !token0 ||
            !token1
          ) {
            throw new Error(
              "Pool tokens are required."
            );
          }

          const liquidityRaw =
            BigInt(
              liquidity
            );

          const amount0Raw =
            BigInt(
              expectedAmount0
            );

          const amount1Raw =
            BigInt(
              expectedAmount1
            );

          if (
            liquidityRaw <=
            0n
          ) {
            throw new Error(
              "Select an amount of liquidity to remove."
            );
          }

          if (
            amount0Raw <=
              0n ||
            amount1Raw <=
              0n
          ) {
            throw new Error(
              "Expected token amounts must be greater than zero."
            );
          }

          // =================================
          // CHECK LP ALLOWANCE
          // =================================

          setStatus(
            "checking-allowance"
          );

          const allowance =
            await getLpAllowance({
              pairAddress,
              owner:
                account,
            });

          // =================================
          // APPROVE LP TOKEN
          // =================================

          if (
            allowance <
            liquidityRaw
          ) {
            setStatus(
              "approving"
            );

            const approval =
              await approveLpToken({
                pairAddress,
                amountRaw: liquidityRaw,
              });

            setApprovalTxHash(
              approval.hash
            );
          }

          // =================================
          // REMOVE LIQUIDITY
          // =================================

          setStatus(
            "removing-liquidity"
          );

          const result =
            await removeLiquidity({
              pairAddress,

              tokenA:
                token0,

              tokenB:
                token1,

              liquidity:
                liquidityRaw,

              expectedAmountA:
                amount0Raw,

              expectedAmountB:
                amount1Raw,

              slippage,

              recipient:
                recipient ||
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
          err
        ) {
          console.error(
            "Remove liquidity error:",
            err
          );

          const message =
            getReadableError(
              err
            );

          setError(
            message
          );

          setStatus(
            "error"
          );

          throw err;
        }
      },
      [
        resetRemoveLiquidityState,
      ]
    );

  // ========================================
  // STATUS FLAGS
  // ========================================

  const isCheckingAllowance =
    status ===
    "checking-allowance";

  const isApproving =
    status ===
    "approving";

  const isRemovingLiquidity =
    status ===
    "removing-liquidity";

  const isPending =
    isCheckingAllowance ||
    isApproving ||
    isRemovingLiquidity;

  const isSuccess =
    status ===
    "success";

  const isError =
    status ===
    "error";

  // ========================================
  // RETURN
  // ========================================

  return {
    status,

    error,

    txHash,

    approvalTxHash,

    isCheckingAllowance,

    isApproving,

    isRemovingLiquidity,

    isPending,

    isSuccess,

    isError,

    executeRemoveLiquidity,

    resetRemoveLiquidityState,
  };
}