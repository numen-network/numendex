import { useEffect, useMemo, useState } from "react";
import {
  getPools,
  getPoolStats,
  getPoolSwaps,
} from "../../services/api";
import SwapCard from "../swap/SwapCard";
import { NUMEN_NETWORK } from "../../config/network";
import "./TokenDetail.css";

const PERIODS = [
  { id: "1h", label: "1H" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
      maximumSignificantDigits: 5,
    })}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(parsed);
}

function percent(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(2)}%`;
}

function amount(value) {
  const parsed = finiteNumber(value);
  if (parsed === null) return "—";
  if (parsed === 0) return "0";
  if (Math.abs(parsed) < 0.000001) {
    return parsed < 0 ? "-<0.000001" : "<0.000001";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(parsed);
}

function shortAddress(value) {
  if (!value) return "—";
  const text = String(value);
  if (text.length <= 14) return text;
  return `${text.slice(0, 7)}...${text.slice(-5)}`;
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

function tokenAddress(token) {
  return String(token?.address || token?.tokenAddress || "").toLowerCase();
}

function tokenSymbol(token) {
  return token?.symbol || token?.tokenSymbol || "TOKEN";
}

function tokenName(token) {
  return token?.name || token?.tokenName || tokenSymbol(token);
}

function poolAddress(pool) {
  return pool?.pairAddress || pool?.poolAddress || pool?.address || "";
}

function poolToken(pool, side) {
  const nested = pool?.[side];

  return {
    address: String(
      nested?.address ||
        pool?.[`${side}Address`] ||
        ""
    ).toLowerCase(),
    symbol:
      nested?.symbol ||
      pool?.[`${side}Symbol`] ||
      "TOKEN",
  };
}

function poolSymbols(pool) {
  return `${poolToken(pool, "token0").symbol} / ${poolToken(pool, "token1").symbol}`;
}

function extractSwaps(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.swaps)) return response.data.swaps;
  if (Array.isArray(response?.swaps)) return response.swaps;
  return [];
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
    usd: swap?.usd ?? swap?.amountUsd ?? swap?.valueUsd ?? null,
    token0,
    token1,
    amount0: amount0In > 0 ? amount0In : amount0Out > 0 ? -amount0Out : 0,
    amount1: amount1In > 0 ? amount1In : amount1Out > 0 ? -amount1Out : 0,
    wallet: swap?.sender || swap?.to || swap?.wallet || "",
    txHash: swap?.txHash || "",
  };
}

function TokenMark({ symbol }) {
  return (
    <span className="token-detail-mark">
      {String(symbol || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function DetailChart({ values }) {
  const clean = Array.isArray(values)
    ? values.map(Number).filter(Number.isFinite)
    : [];

  if (clean.length < 2) {
    return (
      <div className="token-detail-chart-empty">
        Price history is not available yet.
      </div>
    );
  }

  const width = 760;
  const height = 250;
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
      className={`token-detail-chart ${up ? "up" : "down"}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label="Token price history"
    >
      <defs>
        <linearGradient id="tokenDetailArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#tokenDetailArea)"
      />
      <polyline
        points={points}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function TokenDetail({
  token,
  account,
  connecting,
  isNumenNetwork,
  walletError,
  onConnect,
  onSwitchNetwork,
  onBack,
  onSelectPool,
}) {
  const [pools, setPools] = useState([]);
  const [stats, setStats] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("1d");
  const [bottomTab, setBottomTab] = useState("transactions");

  const address = tokenAddress(token);
  const symbol = tokenSymbol(token);
  const name = tokenName(token);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [poolData, statsData] = await Promise.all([
          getPools(),
          getPoolStats().catch(() => []),
        ]);

        if (!alive) return;

        const related = (Array.isArray(poolData) ? poolData : []).filter(
          (pool) =>
            poolToken(pool, "token0").address === address ||
            poolToken(pool, "token1").address === address
        );

        setPools(related);
        setStats(Array.isArray(statsData) ? statsData : []);
      } catch (loadError) {
        if (alive) {
          setError(loadError?.message || "Token details could not be loaded.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [address]);

  useEffect(() => {
    let alive = true;

    async function loadSwaps() {
      if (pools.length === 0) {
        setSwaps([]);
        return;
      }

      setSwapsLoading(true);

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

        setSwaps(merged);
      } catch {
        if (alive) setSwaps([]);
      } finally {
        if (alive) setSwapsLoading(false);
      }
    }

    loadSwaps();

    return () => {
      alive = false;
    };
  }, [pools]);

  const statsByPair = useMemo(() => {
    const map = new Map();

    stats.forEach((item) => {
      const key = String(poolAddress(item)).toLowerCase();
      if (key) map.set(key, item);
    });

    return map;
  }, [stats]);

  const aggregate = useMemo(() => {
    let tvlUsd = 0;
    let volume1dUsd = 0;
    let volume30dUsd = 0;
    let hasTvl = false;
    let has1d = false;
    let has30d = false;

    pools.forEach((pool) => {
      const stat = statsByPair.get(String(poolAddress(pool)).toLowerCase()) || {};
      const tvl = finiteNumber(stat?.tvlUsd ?? pool?.tvlUsd);
      const oneDay = finiteNumber(
        stat?.volume1dUsd ??
          stat?.volume24hUsd ??
          pool?.volume1dUsd
      );
      const thirtyDay = finiteNumber(
        stat?.volume30dUsd ??
          pool?.volume30dUsd
      );

      if (tvl !== null) {
        tvlUsd += tvl;
        hasTvl = true;
      }

      if (oneDay !== null) {
        volume1dUsd += oneDay;
        has1d = true;
      }

      if (thirtyDay !== null) {
        volume30dUsd += thirtyDay;
        has30d = true;
      }
    });

    return {
      tvlUsd: hasTvl ? tvlUsd : null,
      volume1dUsd: has1d ? volume1dUsd : null,
      volume30dUsd: has30d ? volume30dUsd : null,
    };
  }, [pools, statsByPair]);

  const primaryPool = pools[0] || null;
  const chartValues = Array.isArray(token?.chart)
    ? token.chart
    : Array.isArray(token?.sparkline)
      ? token.sparkline
      : [];

  const price =
    token?.priceUsd ??
    token?.price ??
    null;

  const change =
    period === "1h"
      ? token?.change1h ?? token?.priceChange1h ?? null
      : token?.change1d ??
        token?.priceChange1d ??
        token?.priceChange24h ??
        null;

  const explorerBase = NUMEN_NETWORK?.blockExplorerUrls?.[0] || "";
  const tokenExplorerUrl =
    explorerBase && address
      ? `${explorerBase.replace(/\/$/, "")}/token/${address}`
      : "";

  return (
    <section className="token-detail-page">
      <button type="button" className="token-detail-back" onClick={onBack}>
        ← Tokens
      </button>

      <header className="token-detail-header">
        <div className="token-detail-identity">
          <TokenMark symbol={symbol} />
          <div>
            <div className="token-detail-title-row">
              <h1>{name}</h1>
              <span>{symbol}</span>
            </div>
            <button
              type="button"
              className="token-detail-address"
              onClick={() => navigator.clipboard.writeText(token?.address || "")}
            >
              {shortAddress(token?.address)}
            </button>
          </div>
        </div>

        <div className="token-detail-header-actions">
          {tokenExplorerUrl && (
            <a href={tokenExplorerUrl} target="_blank" rel="noreferrer">
              Explorer ↗
            </a>
          )}
        </div>
      </header>

      {error && <div className="token-detail-error">{error}</div>}

      <div className="token-detail-hero">
        <div className="token-detail-market">
          <div className="token-detail-price">
            <strong>{compactUsd(price)}</strong>
            <span
              className={
                finiteNumber(change) === null
                  ? ""
                  : finiteNumber(change) >= 0
                    ? "positive"
                    : "negative"
              }
            >
              {percent(change)}
            </span>
          </div>

          <div className="token-detail-chart-shell">
            <DetailChart values={chartValues} />
          </div>

          <div className="token-detail-periods">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={period === item.id ? "active" : ""}
                onClick={() => setPeriod(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="token-detail-swap">
          <div className="token-detail-swap-heading">
            <strong>Trade {symbol}</strong>
            <span>NumenDEX · zero app fees</span>
          </div>

          {primaryPool ? (
            <SwapCard
              account={account}
              connecting={connecting}
              isNumenNetwork={isNumenNetwork}
              walletError={walletError}
              onConnect={onConnect}
              onSwitchNetwork={onSwitchNetwork}
              chartOpen={false}
              onToggleChart={() => {}}
              initialPool={primaryPool}
            />
          ) : (
            <div className="token-detail-no-pool">
              <strong>No liquidity pool found</strong>
              <p>
                This token does not currently have an indexed NumenDEX pool.
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="token-detail-section">
        <h2>Statistics</h2>

        <div className="token-detail-stats">
          <div>
            <span>TVL</span>
            <strong>{compactUsd(aggregate.tvlUsd)}</strong>
          </div>
          <div>
            <span>Market cap</span>
            <strong>{compactUsd(token?.marketCapUsd ?? token?.marketCap)}</strong>
          </div>
          <div>
            <span>FDV</span>
            <strong>{compactUsd(token?.fdvUsd ?? token?.fdv)}</strong>
          </div>
          <div>
            <span>1D volume</span>
            <strong>{compactUsd(aggregate.volume1dUsd ?? token?.volume1dUsd)}</strong>
          </div>
          <div>
            <span>30D volume</span>
            <strong>{compactUsd(aggregate.volume30dUsd ?? token?.volume30dUsd)}</strong>
          </div>
          <div>
            <span>Liquidity pools</span>
            <strong>{pools.length}</strong>
          </div>
        </div>
      </section>

      <section className="token-detail-section token-detail-about">
        <h2>About</h2>
        <p>
          {token?.description ||
            `${name} (${symbol}) is an indexed token on Numen Network. NumenDEX only displays on-chain and indexed market data that is currently available.`}
        </p>

        <div className="token-detail-links">
          {tokenExplorerUrl && (
            <a href={tokenExplorerUrl} target="_blank" rel="noreferrer">
              Explorer ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(token?.address || "")}
          >
            Copy contract
          </button>
        </div>
      </section>

      <section className="token-detail-bottom">
        <div className="token-detail-bottom-tabs">
          <button
            type="button"
            className={bottomTab === "transactions" ? "active" : ""}
            onClick={() => setBottomTab("transactions")}
          >
            Transactions
          </button>
          <button
            type="button"
            className={bottomTab === "pools" ? "active" : ""}
            onClick={() => setBottomTab("pools")}
          >
            Pools
          </button>
        </div>

        {bottomTab === "transactions" && (
          <div className="token-detail-table-wrap">
            <table className="token-detail-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th className="numeric">USD</th>
                  <th className="numeric">Token 0</th>
                  <th className="numeric">Token 1</th>
                  <th>Wallet</th>
                </tr>
              </thead>
              <tbody>
                {swaps.map((swap) => (
                  <tr key={swap.id}>
                    <td>{formatTime(swap.timestamp)}</td>
                    <td>
                      Swap {swap.token0.symbol} for {swap.token1.symbol}
                    </td>
                    <td className="numeric">{compactUsd(swap.usd)}</td>
                    <td className="numeric">
                      {amount(swap.amount0)} {swap.token0.symbol}
                    </td>
                    <td className="numeric">
                      {amount(swap.amount1)} {swap.token1.symbol}
                    </td>
                    <td className="mono">{shortAddress(swap.wallet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {swapsLoading && (
              <div className="token-detail-empty">Loading transactions…</div>
            )}

            {!swapsLoading && swaps.length === 0 && (
              <div className="token-detail-empty">
                No indexed swaps for this token yet.
              </div>
            )}
          </div>
        )}

        {bottomTab === "pools" && (
          <div className="token-detail-table-wrap">
            <table className="token-detail-table">
              <thead>
                <tr>
                  <th>Pool</th>
                  <th className="numeric">TVL</th>
                  <th className="numeric">1D Volume</th>
                  <th className="numeric">30D Volume</th>
                  <th className="numeric">Fee tier</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => {
                  const stat =
                    statsByPair.get(String(poolAddress(pool)).toLowerCase()) || {};

                  return (
                    <tr
                      key={poolAddress(pool)}
                      className="clickable"
                      onClick={() => onSelectPool?.(pool)}
                    >
                      <td>
                        <div className="token-detail-pool-name">
                          <span className="token-detail-pair-icons">
                            <TokenMark symbol={poolToken(pool, "token0").symbol} />
                            <TokenMark symbol={poolToken(pool, "token1").symbol} />
                          </span>
                          <span>
                            <strong>{poolSymbols(pool)}</strong>
                            <small>{shortAddress(poolAddress(pool))}</small>
                          </span>
                        </div>
                      </td>
                      <td className="numeric">
                        {compactUsd(stat?.tvlUsd ?? pool?.tvlUsd)}
                      </td>
                      <td className="numeric">
                        {compactUsd(
                          stat?.volume1dUsd ??
                            stat?.volume24hUsd ??
                            pool?.volume1dUsd
                        )}
                      </td>
                      <td className="numeric">
                        {compactUsd(stat?.volume30dUsd ?? pool?.volume30dUsd)}
                      </td>
                      <td className="numeric">0.30%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && pools.length === 0 && (
              <div className="token-detail-empty">
                No indexed NumenDEX pools for this token.
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
