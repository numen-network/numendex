const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : window.location.origin);

const API_BASE_URL =
  RAW_API_BASE_URL
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");


// ==========================================
// GENERIC API REQUEST
// ==========================================

async function apiGet(
  endpoint,
  {
    params,
    signal,
  } = {}
) {
  const normalizedEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  let url =
    `${API_BASE_URL}/api${normalizedEndpoint}`;

  if (params) {
    const searchParams =
      new URLSearchParams();

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          searchParams.set(
            key,
            String(value)
          );
        }
      }
    );

    const queryString =
      searchParams.toString();

    if (queryString) {
      url +=
        `${
          url.includes("?")
            ? "&"
            : "?"
        }${queryString}`;
    }
  }

  const response =
    await fetch(url, {
      method: "GET",

      headers: {
        Accept:
          "application/json",
      },

      signal,
    });

  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      `Invalid response from backend (${response.status})`
    );
  }

  if (
    !response.ok ||
    result?.success === false
  ) {
    throw new Error(
      result?.error ||
        `API request failed (${response.status})`
    );
  }

  return result;
}


// ==========================================
// HEALTH
// ==========================================

export async function getHealth() {
  return apiGet(
    "/health"
  );
}


// ==========================================
// TOKENS
// ==========================================

export async function getTokens() {
  const result =
    await apiGet(
      "/tokens"
    );

  return Array.isArray(
    result?.data
  )
    ? result.data
    : [];
}


export async function getToken(
  address
) {
  if (!address) {
    throw new Error(
      "Token address is required."
    );
  }

  const result =
    await apiGet(
      `/token/${encodeURIComponent(
        address
      )}`
    );

  return result.data;
}


// ==========================================
// POOLS
// ==========================================

export async function getPools() {
  const result =
    await apiGet(
      "/pools"
    );

  return Array.isArray(
    result?.data
  )
    ? result.data
    : [];
}


export async function getPool(
  address
) {
  if (!address) {
    throw new Error(
      "Pool address is required."
    );
  }

  const result =
    await apiGet(
      `/pool/${encodeURIComponent(
        address
      )}`
    );

  return result.data;
}


// ==========================================
// POOL STATS
// ==========================================

export async function getPoolStats() {
  const result =
    await apiGet(
      "/pool-stats"
    );

  return Array.isArray(
    result?.data
  )
    ? result.data
    : [];
}


export async function getSinglePoolStats(
  address
) {
  if (!address) {
    throw new Error(
      "Pool address is required."
    );
  }

  const result =
    await apiGet(
      `/pool-stats/${encodeURIComponent(
        address
      )}`
    );

  return result.data;
}


// ==========================================
// POOL SWAPS
// ==========================================

export async function getPoolSwaps(
  address,
  {
    limit = 50,
    skip = 0,
  } = {}
) {
  if (!address) {
    throw new Error(
      "Pool address is required."
    );
  }

  return apiGet(
    `/pool-swaps/${encodeURIComponent(
      address
    )}`,
    {
      params: {
        limit,
        skip,
      },
    }
  );
}


// ==========================================
// QUOTE
// ==========================================

export async function getQuote({
  tokenIn,
  tokenOut,
  amount,
  slippage = 0.5,
  signal,
}) {
  if (!tokenIn) {
    throw new Error(
      "tokenIn is required."
    );
  }

  if (!tokenOut) {
    throw new Error(
      "tokenOut is required."
    );
  }

  if (
    amount === undefined ||
    amount === null ||
    amount === ""
  ) {
    throw new Error(
      "amount is required."
    );
  }

  const result =
    await apiGet(
      "/quote",
      {
        params: {
          tokenIn,
          tokenOut,
          amount,
          slippage,
        },

        signal,
      }
    );

  return result.data;
}


export {
  API_BASE_URL,
  apiGet,
};
// Historical prices come from indexed swap events, not generated chart samples.
export async function getTokenPriceHistory(address, period = "1d", signal) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(address))) throw new Error("Invalid token address");
  const allowed = new Set(["1h", "1d", "1w", "1m", "1y", "all"]);
  if (!allowed.has(period)) throw new Error("Invalid chart period");
  const response = await apiGet(`/token/${encodeURIComponent(address)}/history`, { params: { period }, signal });
  return Array.isArray(response.data) ? response.data : [];
}
