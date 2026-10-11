import {
  useCallback,
  useState,
} from "react";

import {
  createPool,
  getExistingPair,
} from "../services/createPool";

function getReadableError(error) {
  if (!error) {
    return "An unknown error occurred.";
  }

  if (
    error.code === 4001 ||
    error.code === "ACTION_REJECTED"
  ) {
    return "Transaction rejected in wallet.";
  }

  const message =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "Pool creation failed.";

  if (
    message
      .toLowerCase()
      .includes("user rejected")
  ) {
    return "Transaction rejected in wallet.";
  }

  return message;
}

function useCreatePool() {
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
    pairAddress,
    setPairAddress,
  ] =
    useState("");

  const [
    transactionHash,
    setTransactionHash,
  ] =
    useState("");

  const resetCreatePoolState =
    useCallback(() => {
      setStatus("idle");
      setError("");
      setPairAddress("");
      setTransactionHash("");
    }, []);

  const checkExistingPool =
    useCallback(
      async ({
        tokenA,
        tokenB,
      }) => {
        setError("");

        try {
          setStatus(
            "checking"
          );

          const existingPair =
            await getExistingPair({
              tokenA,
              tokenB,
            });

          if (existingPair) {
            setPairAddress(
              existingPair
            );

            setStatus(
              "already-exists"
            );

            return existingPair;
          }

          setPairAddress("");
          setStatus("idle");

          return null;
        } catch (checkError) {
          const readableError =
            getReadableError(
              checkError
            );

          setError(
            readableError
          );

          setStatus("error");

          throw checkError;
        }
      },
      []
    );

  const executeCreatePool =
    useCallback(
      async ({
        tokenA,
        tokenB,
      }) => {
        setError("");
        setPairAddress("");
        setTransactionHash("");

        try {
          setStatus(
            "creating"
          );

          const result =
            await createPool({
              tokenA,
              tokenB,
            });

          if (
            result.alreadyExists
          ) {
            setPairAddress(
              result.pairAddress
            );

            setStatus(
              "already-exists"
            );

            return result;
          }

          setPairAddress(
            result.pairAddress
          );

          setTransactionHash(
            result.transactionHash ||
              ""
          );

          setStatus("success");

          return result;
        } catch (createError) {
          console.error(
            "Create pool error:",
            createError
          );

          setError(
            getReadableError(
              createError
            )
          );

          setStatus("error");

          throw createError;
        }
      },
      []
    );

  return {
    status,
    error,
    pairAddress,
    transactionHash,

    isChecking:
      status === "checking",

    isCreating:
      status === "creating",

    isSuccess:
      status === "success",

    isError:
      status === "error",

    alreadyExists:
      status ===
      "already-exists",

    isPending:
      status === "checking" ||
      status === "creating",

    checkExistingPool,
    executeCreatePool,
    resetCreatePoolState,
  };
}

export default useCreatePool;