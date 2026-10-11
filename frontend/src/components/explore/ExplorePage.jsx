import { useEffect, useMemo, useState } from "react";
import {
  getPoolStats,
  getPools,
  getPoolSwaps,
  getTokens,
} from "../../services/api";
import "./ExplorePage.css";

const TABS = [
  { id: "tokens", label: "Tokens" },
  { id: "pools", label: "Pools" },
  { id: "transactions", label: "Transactions" },
];

const VOLUME_PERIODS = [
  { id: "1h", label: "1H", longLabel: "1H volume" },
  { id: "1d", label: "1D", longLabel: "1D volume" },
  { id: "1w", label: "1W", longLabel: "1W volume" },
  { id: "1m", label: "1M", longLabel: "1M volume" },
  { id: "1y", label: "1Y", longLabel: "1Y volume" },
  { id: "all", label: "All", longLabel: "All-time volume" },
];

const SORTABLE_TOKEN_COLUMNS = {
  price: "priceUsd",
  change1h: "change1h",
  change1d: "change1d",
  fdv: "fdvUsd",
  volume: "selectedVolumeUsd",
};

const SORTABLE_POOL_COLUMNS = {
  tvl: "tvlUsd",
  volume1d: "volume1dUsd",
  volume30d: "volume30dUsd",
  ratio1d: "ratio1d",
  apr: "apr",
};

function shortAddress(value) {
  if (!value) return "—";
  const text = String(value);
  if (text.length < 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function number(value, digits = 2) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(parsed);
}

function compactUsd(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";

  if (Math.abs(parsed) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(parsed);
  }

  if (Math.abs(parsed) > 0 && Math.abs(parsed) < 0.01) {
    return `$${parsed.toLocaleString("en-US", {
      maximumSignificantDigits: 4,
    })}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function percent(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(2)}%`;
}

function ratio(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  return parsed.toFixed(2);
}

function amount(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  if (parsed === 0) return "0";
  if (Math.abs(parsed) < 0.000001) return parsed < 0 ? "-<0.000001" : "<0.000001";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(parsed);
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function tokenSymbol(token) {
  return token?.symbol || token?.tokenSymbol || "TOKEN";
}

function tokenName(token) {
  return token?.name || token?.tokenName || tokenSymbol(token);
}

function tokenAddress(token) {
  return token?.address || token?.tokenAddress || "";
}

function poolAddress(pool) {
  return pool?.pairAddress || pool?.poolAddress || pool?.address || "";
}

function poolToken(pool, side) {
  const nested = pool?.[side];

  return {
    address:
      nested?.address ||
      pool?.[`${side}Address`] ||
      "",
    symbol:
      nested?.symbol ||
      pool?.[`${side}Symbol`] ||
      "TOKEN",
  };
}

function poolSymbols(pool) {
  const left = poolToken(pool, "token0").symbol;
  const right = poolToken(pool, "token1").symbol;
  return `${left} / ${right}`;
}

function TokenMark({ symbol }) {
  return (
    <span className="explore-token-mark">
      {String(symbol || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function Sparkline({ values }) {
  const clean = Array.isArray(values)
    ? values.map(Number).filter(Number.isFinite)
    : [];

  if (clean.length < 2) {
    return <span className="explore-no-chart">—</span>;
  }

  const width = 76;
  const height = 30;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;

  const points = clean
    .map((value, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const up = clean[clean.length - 1] >= clean[0];

  return (
    <svg
      className={`explore-sparkline ${up ? "up" : "down"}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Price chart"
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function normalizeToken(token) {
  return {
    ...token,
    address: tokenAddress(token),
    name: tokenName(token),
    symbol: tokenSymbol(token),
    priceUsd: token?.priceUsd ?? token?.price ?? null,
    change1h:
      token?.change1h ??
      token?.priceChange1h ??
      null,
    change1d:
      token?.change1d ??
      token?.priceChange1d ??
      token?.priceChange24h ??
      null,
    fdvUsd: token?.fdvUsd ?? token?.fdv ?? null,
    volume1hUsd:
      token?.volume1hUsd ??
      token?.volumeHourUsd ??
      null,
    volume1dUsd:
      token?.volume1dUsd ??
      token?.volume24hUsd ??
      token?.volumeUsd ??
      null,
    volume1wUsd:
      token?.volume1wUsd ??
      token?.volume7dUsd ??
      null,
    volume1mUsd:
      token?.volume1mUsd ??
      token?.volume30dUsd ??
      null,
    volume1yUsd:
      token?.volume1yUsd ??
      token?.volume365dUsd ??
      null,
    volumeAllUsd:
      token?.volumeAllUsd ??
      token?.allTimeVolumeUsd ??
      token?.volumeTotalUsd ??
      null,
    chart: Array.isArray(token?.chart)
      ? token.chart
      : Array.isArray(token?.sparkline)
        ? token.sparkline
        : [],
  };
}

function getTokenVolume(token, period) {
  const fields = {
    "1h": "volume1hUsd",
    "1d": "volume1dUsd",
    "1w": "volume1wUsd",
    "1m": "volume1mUsd",
    "1y": "volume1yUsd",
    all: "volumeAllUsd",
  };

  return token?.[fields[period]] ?? null;
}

function normalizeSwap(swap, pool) {
  const token0 = poolToken(pool, "token0");
  const token1 = poolToken(pool, "token1");

  const amount0In = finiteNumber(swap?.amount0In) || 0;
  const amount0Out = finiteNumber(swap?.amount0Out) || 0;
  const amount1In = finiteNumber(swap?.amount1In) || 0;
  const amount1Out = finiteNumber(swap?.amount1Out) || 0;

  return {
    id: `${swap?.txHash || "swap"}-${swap?.logIndex ?? swap?.blockNumber ?? 0}`,
    timestamp: swap?.blockTimestamp || swap?.timestamp || null,
    type: "swap",
    usd: swap?.usd ?? swap?.amountUsd ?? swap?.valueUsd ?? null,
    token0,
    token1,
    amount0: amount0In > 0 ? amount0In : amount0Out > 0 ? -amount0Out : 0,
    amount1: amount1In > 0 ? amount1In : amount1Out > 0 ? -amount1Out : 0,
    wallet: swap?.sender || swap?.to || swap?.wallet || "",
    txHash: swap?.txHash || "",
  };
}

function extractSwaps(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.swaps)) return response.data.swaps;
  if (Array.isArray(response?.swaps)) return response.swaps;
  return [];
}

export default function ExplorePage({
  onSelectPool,
  onSelectToken,
  onCreateToken,
}) {
  const [tokens, setTokens] = useState([]);
  const [pools, setPools] = useState([]);
  const [stats, setStats] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("tokens");
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [volumePeriod, setVolumePeriod] = useState("1d");
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false);
  const [tokenSort, setTokenSort] = useState({
    key: "volume",
    direction: "desc",
  });
  const [poolSort, setPoolSort] = useState({
    key: "ratio1d",
    direction: "desc",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [tokenData, poolData, statsData] = await Promise.all([
          getTokens(),
          getPools(),
          getPoolStats().catch(() => []),
        ]);

        if (!alive) return;

        setTokens(
          Array.isArray(tokenData)
            ? tokenData.map(normalizeToken)
            : []
        );
        setPools(Array.isArray(poolData) ? poolData : []);
        setStats(Array.isArray(statsData) ? statsData : []);
      } catch (loadError) {
        if (alive) {
          setError(loadError?.message || "Explore data could not be loaded.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadTransactions() {
      if (tab !== "transactions") return;

      if (pools.length === 0) {
        setTransactions([]);
        return;
      }

      setTransactionsLoading(true);

      try {
        const results = await Promise.allSettled(
          pools.map(async (pool) => {
            const response = await getPoolSwaps(poolAddress(pool), {
              limit: 100,
              skip: 0,
            });

            return extractSwaps(response).map((swap) =>
              normalizeSwap(swap, pool)
            );
          })
        );

        if (!alive) return;

        const merged = results
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .sort((a, b) => {
            const first = new Date(a.timestamp || 0).getTime();
            const second = new Date(b.timestamp || 0).getTime();
            return second - first;
          });

        setTransactions(merged);
      } catch (loadError) {
        console.error("Explore transactions loading error:", loadError);
        if (alive) setTransactions([]);
      } finally {
        if (alive) setTransactionsLoading(false);
      }
    }

    loadTransactions();

    return () => {
      alive = false;
    };
  }, [tab, pools]);

  const statsByPair = useMemo(() => {
    const map = new Map();

    stats.forEach((item) => {
      const key = String(poolAddress(item)).toLowerCase();
      if (key) map.set(key, item);
    });

    return map;
  }, [stats]);

  const filteredTokens = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matching = tokens
      .filter((token) => {
        if (!needle) return true;

        return [
          token.name,
          token.symbol,
          token.address,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .map((token) => ({
        ...token,
        selectedVolumeUsd: getTokenVolume(token, volumePeriod),
      }));

    const field = SORTABLE_TOKEN_COLUMNS[tokenSort.key];

    if (!field) return matching;

    return [...matching].sort((a, b) => {
      const aValue = finiteNumber(a[field]);
      const bValue = finiteNumber(b[field]);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      return tokenSort.direction === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [query, tokens, volumePeriod, tokenSort]);

  const filteredPools = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matching = pools
      .filter((pool) => {
        if (!needle) return true;

        return [
          poolSymbols(pool),
          poolAddress(pool),
          poolToken(pool, "token0").address,
          poolToken(pool, "token1").address,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .map((pool) => {
        const pair = poolAddress(pool);
        const poolStat = statsByPair.get(pair.toLowerCase()) || {};

        const tvlUsd =
          poolStat?.tvlUsd ??
          pool?.tvlUsd ??
          null;

        const volume1dUsd =
          poolStat?.volume1dUsd ??
          pool?.volume1dUsd ??
          null;

        const volume30dUsd =
          poolStat?.volume30dUsd ??
          pool?.volume30dUsd ??
          null;

        const tvl = finiteNumber(tvlUsd);
        const volume1d = finiteNumber(volume1dUsd);

        const ratio1d =
          finiteNumber(poolStat?.volumeTvlRatio) ??
          (tvl !== null && tvl > 0 && volume1d !== null
            ? volume1d / tvl
            : null);

        const apr =
          poolStat?.apr ??
          pool?.apr ??
          null;

        return {
          ...pool,
          __explore: {
            tvlUsd,
            volume1dUsd,
            volume30dUsd,
            ratio1d,
            apr,
          },
        };
      });

    const field = SORTABLE_POOL_COLUMNS[poolSort.key];

    if (!field) return matching;

    return [...matching].sort((a, b) => {
      const aValue = finiteNumber(a.__explore?.[field]);
      const bValue = finiteNumber(b.__explore?.[field]);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      return poolSort.direction === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [query, pools, statsByPair, poolSort]);

  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return transactions;

    return transactions.filter((transaction) =>
      [
        transaction.type,
        transaction.wallet,
        transaction.txHash,
        transaction.token0?.symbol,
        transaction.token1?.symbol,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, transactions]);

  function handleTokenSort(key) {
    setTokenSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "desc" ? "asc" : "desc",
        };
      }

      return {
        key,
        direction: "desc",
      };
    });
  }

  function tokenSortIndicator(key) {
    if (tokenSort.key !== key) return "";
    return tokenSort.direction === "desc" ? "↓" : "↑";
  }

  function handlePoolSort(key) {
    setPoolSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "desc" ? "asc" : "desc",
        };
      }

      return {
        key,
        direction: "desc",
      };
    });
  }

  function poolSortIndicator(key) {
    if (poolSort.key !== key) return "";
    return poolSort.direction === "desc" ? "↓" : "↑";
  }

  const activeVolumePeriod =
    VOLUME_PERIODS.find((item) => item.id === volumePeriod) ||
    VOLUME_PERIODS[1];

  const currentCount =
    tab === "tokens"
      ? filteredTokens.length
      : tab === "pools"
        ? filteredPools.length
        : filteredTransactions.length;

  return (
    <section className="explore-page">
      <div className="explore-market-toolbar">
        <div className="explore-tabs" role="tablist" aria-label="Explore markets">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setQuery("");
              }}
              role="tab"
              aria-selected={tab === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="explore-toolbar-actions">
          {tab === "tokens" && (
            <div className="explore-volume-filter">
              <button
                type="button"
                className="explore-volume-trigger"
                onClick={() => setVolumeMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={volumeMenuOpen}
              >
                <span>{activeVolumePeriod.longLabel}</span>
                <span className={`explore-volume-chevron ${volumeMenuOpen ? "open" : ""}`}>
                  ⌄
                </span>
              </button>

              {volumeMenuOpen && (
                <div className="explore-volume-menu" role="menu">
                  {VOLUME_PERIODS.map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      className={volumePeriod === period.id ? "active" : ""}
                      onClick={() => {
                        setVolumePeriod(period.id);
                        setVolumeMenuOpen(false);
                      }}
                      role="menuitem"
                    >
                      <span>{period.longLabel}</span>
                      {volumePeriod === period.id && <strong>✓</strong>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="explore-search">
            <span>⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === "tokens"
                  ? "Search token, symbol or address"
                  : tab === "pools"
                    ? "Search pool, token or address"
                    : "Search transaction, token or wallet"
              }
            />
            {query && (
              <button
                type="button"
                className="explore-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="explore-market-panel">
        {error && <div className="explore-error">{error}</div>}

        {(loading || (tab === "transactions" && transactionsLoading)) && (
          <div className="explore-loading">
            Loading NumenDEX markets…
          </div>
        )}

        {!loading && tab === "tokens" && (
          <div className="explore-table-wrap">
            <table className="explore-table explore-token-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handleTokenSort("price")}>
                      <span>{tokenSortIndicator("price")}</span> Price
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handleTokenSort("change1h")}>
                      <span>{tokenSortIndicator("change1h")}</span> 1H
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handleTokenSort("change1d")}>
                      <span>{tokenSortIndicator("change1d")}</span> 1D
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handleTokenSort("fdv")}>
                      <span>{tokenSortIndicator("fdv")}</span> FDV
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handleTokenSort("volume")}>
                      <span>{tokenSortIndicator("volume")}</span> Volume
                    </button>
                  </th>
                  <th className="numeric">Chart</th>
                </tr>
              </thead>

              <tbody>
                {filteredTokens.map((token, index) => {
                  const oneHour = finiteNumber(token.change1h);
                  const oneDay = finiteNumber(token.change1d);

                  return (
                    <tr
                      key={token.address || `${token.symbol}-${index}`}
                      className="clickable"
                      onClick={() => onSelectToken?.(token)}
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="explore-token-cell">
                          <TokenMark symbol={token.symbol} />
                          <span>
                            <strong>{token.name}</strong>
                            <small>{token.symbol}</small>
                          </span>
                        </div>
                      </td>

                      <td className="numeric">{compactUsd(token.priceUsd)}</td>

                      <td
                        className={`numeric change ${
                          oneHour === null
                            ? ""
                            : oneHour > 0
                              ? "positive"
                              : oneHour < 0
                                ? "negative"
                                : ""
                        }`}
                      >
                        {percent(token.change1h)}
                      </td>

                      <td
                        className={`numeric change ${
                          oneDay === null
                            ? ""
                            : oneDay > 0
                              ? "positive"
                              : oneDay < 0
                                ? "negative"
                                : ""
                        }`}
                      >
                        {percent(token.change1d)}
                      </td>

                      <td className="numeric">{compactUsd(token.fdvUsd)}</td>
                      <td className="numeric">{compactUsd(token.selectedVolumeUsd)}</td>

                      <td className="numeric">
                        <Sparkline values={token.chart} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTokens.length === 0 && (
              <div className="explore-empty">No matching tokens.</div>
            )}
          </div>
        )}

        {!loading && tab === "pools" && (
          <div className="explore-table-wrap">
            <table className="explore-table explore-pool-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pool</th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handlePoolSort("tvl")}>
                      <span>{poolSortIndicator("tvl")}</span> TVL
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handlePoolSort("volume1d")}>
                      <span>{poolSortIndicator("volume1d")}</span> 1D Volume
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handlePoolSort("volume30d")}>
                      <span>{poolSortIndicator("volume30d")}</span> 30D Volume
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handlePoolSort("ratio1d")}>
                      <span>{poolSortIndicator("ratio1d")}</span> 1D Volume / TVL
                    </button>
                  </th>
                  <th className="numeric sortable">
                    <button type="button" onClick={() => handlePoolSort("apr")}>
                      <span>{poolSortIndicator("apr")}</span> Pool APR
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPools.map((pool, index) => {
                  const pair = poolAddress(pool);
                  const values = pool.__explore || {};

                  return (
                    <tr
                      key={pair || index}
                      className="clickable"
                      onClick={() => onSelectPool?.(pool)}
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="explore-pool-cell">
                          <div className="explore-pair-icons">
                            <TokenMark symbol={poolToken(pool, "token0").symbol} />
                            <TokenMark symbol={poolToken(pool, "token1").symbol} />
                          </div>

                          <span>
                            <strong>{poolSymbols(pool)}</strong>
                            <small>v2 · 0.30%</small>
                          </span>
                        </div>
                      </td>

                      <td className="numeric">{compactUsd(values.tvlUsd)}</td>
                      <td className="numeric">{compactUsd(values.volume1dUsd)}</td>
                      <td className="numeric">{compactUsd(values.volume30dUsd)}</td>
                      <td className="numeric">{ratio(values.ratio1d)}</td>
                      <td className="numeric">{percent(values.apr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPools.length === 0 && (
              <div className="explore-empty">No matching pools.</div>
            )}
          </div>
        )}

        {!loading &&
          !transactionsLoading &&
          tab === "transactions" && (
            <div className="explore-table-wrap">
              <table className="explore-table explore-transaction-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th className="numeric">USD</th>
                    <th className="numeric">Token 0 Amount</th>
                    <th className="numeric">Token 1 Amount</th>
                    <th>Wallet</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatTime(transaction.timestamp)}</td>

                      <td>
                        <div className="explore-transaction-type">
                          <span>Swap</span>
                          <strong>{transaction.token0?.symbol || "TOKEN"}</strong>
                          <small>for</small>
                          <strong>{transaction.token1?.symbol || "TOKEN"}</strong>
                        </div>
                      </td>

                      <td className="numeric">
                        {compactUsd(transaction.usd)}
                      </td>

                      <td className="numeric transaction-amount">
                        <strong>{amount(transaction.amount0)}</strong>
                        <small>{transaction.token0?.symbol || "TOKEN"}</small>
                      </td>

                      <td className="numeric transaction-amount">
                        <strong>{amount(transaction.amount1)}</strong>
                        <small>{transaction.token1?.symbol || "TOKEN"}</small>
                      </td>

                      <td className="mono">
                        {shortAddress(transaction.wallet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="explore-empty">
                  No matching transactions.
                </div>
              )}
            </div>
          )}
      </div>
    </section>
  );
}
