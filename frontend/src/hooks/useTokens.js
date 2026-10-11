import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getTokens } from "../services/api";

function normalizeToken(token) {
  if (!token) {
    return null;
  }

  const address =
    token.address ||
    token.tokenAddress ||
    token.contractAddress;

  if (!address) {
    return null;
  }

  return {
    ...token,

    address,

    name:
      token.name ||
      token.tokenName ||
      token.symbol ||
      "Unknown Token",

    symbol:
      token.symbol ||
      token.tokenSymbol ||
      "UNKNOWN",

    decimals:
      Number(
        token.decimals ??
          token.tokenDecimals ??
          18
      ),

    logoURI:
      token.logoURI ||
      token.logoUrl ||
      token.logo ||
      null,
  };
}

function extractTokens(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.tokens)) {
    return response.tokens;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.tokens)) {
    return response.data.tokens;
  }

  return [];
}

export default function useTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTokens();

      const rawTokens =
        extractTokens(response);

      const normalizedTokens =
        rawTokens
          .map(normalizeToken)
          .filter(Boolean);

      const uniqueTokens = [];

      const seenAddresses =
        new Set();

      for (const token of normalizedTokens) {
        const normalizedAddress =
          token.address.toLowerCase();

        if (
          seenAddresses.has(
            normalizedAddress
          )
        ) {
          continue;
        }

        seenAddresses.add(
          normalizedAddress
        );

        uniqueTokens.push(token);
      }

      uniqueTokens.sort((a, b) => {
        return a.symbol.localeCompare(
          b.symbol
        );
      });

      setTokens(uniqueTokens);
    } catch (requestError) {
      console.error(
        "Could not load tokens:",
        requestError
      );

      setTokens([]);

      setError(
        requestError?.message ||
          "Could not load tokens."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const tokenMap = useMemo(() => {
    const map = new Map();

    for (const token of tokens) {
      map.set(
        token.address.toLowerCase(),
        token
      );
    }

    return map;
  }, [tokens]);

  const getTokenByAddress =
    useCallback(
      (address) => {
        if (!address) {
          return null;
        }

        return (
          tokenMap.get(
            address.toLowerCase()
          ) || null
        );
      },
      [tokenMap]
    );

  return {
    tokens,
    loading,
    error,
    reload: loadTokens,
    getTokenByAddress,
  };
}