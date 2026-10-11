import {
  useCallback,
  useState,
} from "react";

import {
  addLiquidity,
  approveLiquidityToken,
  getLiquidityAllowance,
  getLiquidityPair,
} from "../services/liquidity";

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

export default function useLiquidity() {
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
    approvalToken,
    setApprovalToken,
  ] =
    useState("");

  const resetLiquidityState =
    useCallback(() => {
      setStatus("idle");
      setError("");
      setTxHash("");
      setApprovalToken("");
    }, []);

  const loadPair =
    useCallback(
      async ({
        tokenA,
        tokenB,
      }) => {
        if (
          !tokenA?.address ||
          !tokenB?.address
        ) {
          return null;
        }

        try {
          return await getLiquidityPair({
            tokenA,
            tokenB,
          });
        } catch (
          pairError
        ) {
          console.error(
            "Could not load liquidity pair:",
            pairError
          );

          throw pairError;
        }
      },
      []
    );

  const executeAddLiquidity =
    useCallback(
      async ({
        account,

        tokenA,
        tokenB,

        amountA,
        amountB,

        amountARaw,
        amountBRaw,

        slippage = 0.5,
        deadlineMinutes = 30,
      }) => {
        setError("");
        setTxHash("");
        setApprovalToken("");

        if (!account) {
          const message =
            "Connect your wallet first.";

          setError(
            message
          );

          throw new Error(
            message
          );
        }

        if (
          !tokenA?.address ||
          !tokenB?.address
        ) {
          const message =
            "Select two tokens.";

          setError(
            message
          );

          throw new Error(
            message
          );
        }

        if (
          !amountA ||
          !amountB
        ) {
          const message =
            "Enter liquidity amounts.";

          setError(
            message
          );

          throw new Error(
            message
          );
        }

        let rawA;
        let rawB;

        try {
          rawA =
            BigInt(
              amountARaw
            );

          rawB =
            BigInt(
              amountBRaw
            );
        } catch {
          const message =
            "Liquidity amounts are invalid.";

          setError(
            message
          );

          throw new Error(
            message
          );
        }

        if (
          rawA <= 0n ||
          rawB <= 0n
        ) {
          const message =
            "Liquidity amounts must be greater than zero.";

          setError(
            message
          );

          throw new Error(
            message
          );
        }

        try {
          /*
           * ====================================
           * TOKEN A ALLOWANCE
           * ====================================
           */

          setStatus(
            "checking-allowance-a"
          );

          const allowanceA =
            await getLiquidityAllowance({
              tokenAddress:
                tokenA.address,

              owner:
                account,
            });

          if (
            allowanceA <
            rawA
          ) {
            setApprovalToken(
              tokenA.symbol ||
                "Token A"
            );

            setStatus(
              "approving-a"
            );

            const approvalA =
              await approveLiquidityToken({
                tokenAddress:
                  tokenA.address,
                amountRaw: rawA,
              });

            setTxHash(
              approvalA.hash
            );
          }

          /*
           * ====================================
           * TOKEN B ALLOWANCE
           * ====================================
           */

          setStatus(
            "checking-allowance-b"
          );

          const allowanceB =
            await getLiquidityAllowance({
              tokenAddress:
                tokenB.address,

              owner:
                account,
            });

          if (
            allowanceB <
            rawB
          ) {
            setApprovalToken(
              tokenB.symbol ||
                "Token B"
            );

            setStatus(
              "approving-b"
            );

            const approvalB =
              await approveLiquidityToken({
                tokenAddress:
                  tokenB.address,
                amountRaw: rawB,
              });

            setTxHash(
              approvalB.hash
            );
          }

          /*
           * ====================================
           * ADD LIQUIDITY
           * ====================================
           */

          setApprovalToken(
            ""
          );

          setStatus(
            "adding-liquidity"
          );

          const result =
            await addLiquidity({
              tokenA,
              tokenB,

              amountA,
              amountB,

              slippage,

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
          liquidityError
        ) {
          const message =
            getReadableError(
              liquidityError
            );

          console.error(
            "Add liquidity failed:",
            liquidityError
          );

          setStatus(
            "error"
          );

          setError(
            message
          );

          throw liquidityError;
        }
      },
      []
    );

  return {
    status,
    error,
    txHash,
    approvalToken,

    isCheckingAllowance:
      status ===
        "checking-allowance-a" ||
      status ===
        "checking-allowance-b",

    isApproving:
      status ===
        "approving-a" ||
      status ===
        "approving-b",

    isAddingLiquidity:
      status ===
      "adding-liquidity",

    isPending:
      status ===
        "checking-allowance-a" ||
      status ===
        "checking-allowance-b" ||
      status ===
        "approving-a" ||
      status ===
        "approving-b" ||
      status ===
        "adding-liquidity",

    isSuccess:
      status ===
      "success",

    loadPair,
    executeAddLiquidity,
    resetLiquidityState,
  };
}