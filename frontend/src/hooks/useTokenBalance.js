import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getTokenBalance,
} from "../services/balance";

export default function useTokenBalance(
  token,
  account,
  enabled = true
) {
  const [rawBalance, setRawBalance] =
    useState(0n);

  const [
    formattedBalance,
    setFormattedBalance,
  ] = useState("0");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBalance =
    useCallback(async () => {
      if (
        !enabled ||
        !token ||
        !account
      ) {
        setRawBalance(0n);
        setFormattedBalance("0");
        setError("");

        return;
      }

      try {
        setLoading(true);
        setError("");

        const result =
          await getTokenBalance({
            token,
            account,
          });

        setRawBalance(
          result.raw
        );

        setFormattedBalance(
          result.formatted
        );
      } catch (requestError) {
        console.error(
          "Could not load token balance:",
          requestError
        );

        setRawBalance(0n);
        setFormattedBalance("0");

        setError(
          requestError?.message ||
            "Could not load balance."
        );
      } finally {
        setLoading(false);
      }
    }, [
      token,
      account,
      enabled,
    ]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return {
    rawBalance,
    formattedBalance,
    loading,
    error,
    reload: loadBalance,
  };
}