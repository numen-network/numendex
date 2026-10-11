import "./PoolDetail.css";
import RemoveLiquidityPanel from "../liquidity/RemoveLiquidityPanel";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getPool,
  getPoolSwaps,
  getSinglePoolStats,
} from "../../services/api";

// ==========================================
// HELPERS
// ==========================================

function shortAddress(
  address,
  start = 6,
  end = 4
) {
  if (!address) {
    return "—";
  }

  if (
    address.length <=
    start + end
  ) {
    return address;
  }

  return `${address.slice(
    0,
    start
  )}...${address.slice(
    -end
  )}`;
}

function formatNumber(
  value,
  maximumFractionDigits = 6
) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits,
    }
  ).format(
    Number(value)
  );
}

function formatUsd(
  value
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      notation:
        Math.abs(
          Number(value)
        ) >= 1_000_000
          ? "compact"
          : "standard",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value)
  );
}

function formatApr(
  value
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "—";
  }

  return `${Number(
    value
  ).toFixed(2)}%`;
}

function formatDate(
  timestamp
) {
  if (!timestamp) {
    return "—";
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

// ==========================================
// TOKEN ICON
// ==========================================

function TokenIcon({
  symbol,
  second = false,
}) {
  const letter =
    String(
      symbol || "?"
    )
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";

  return (
    <div
      className={
        second
          ? "pool-detail-token-icon pool-detail-token-icon-second"
          : "pool-detail-token-icon"
      }
    >
      {letter}
    </div>
  );
}

// ==========================================
// VOLUME CHART
// ==========================================

function VolumeChart({
  swaps,
  token0,
  token1,
}) {
  const bars =
    useMemo(() => {
      if (
        !Array.isArray(swaps) ||
        swaps.length === 0
      ) {
        return [];
      }

      const ordered =
        [...swaps].reverse();

      return ordered.map(
        (
          swap,
          index
        ) => {
          const amount0 =
            Number(
              swap?.token0
                ?.amount ||
                0
            );

          const amount1 =
            Number(
              swap?.token1
                ?.amount ||
                0
            );

          /*
           * Without a USD pricing layer,
           * the chart is an activity chart.
           *
           * We normalize both sides so that
           * real swap activity can still be
           * visualized without inventing USD
           * values.
           */

          return {
            id:
              swap.transactionHash ||
              index,

            amount0:
              Number.isFinite(
                amount0
              )
                ? amount0
                : 0,

            amount1:
              Number.isFinite(
                amount1
              )
                ? amount1
                : 0,
          };
        }
      );
    }, [swaps]);

  const maxValue =
    useMemo(() => {
      if (
        bars.length === 0
      ) {
        return 0;
      }

      return Math.max(
        ...bars.map(
          (bar) =>
            Math.max(
              bar.amount0,
              bar.amount1
            )
        )
      );
    }, [bars]);

  if (
    bars.length === 0
  ) {
    return (
      <div className="pool-detail-chart-empty">
        <strong>
          No trading activity yet
        </strong>

        <span>
          Swap activity will
          appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="pool-detail-chart">
      <div className="pool-detail-chart-label">
        Recent swap activity
      </div>

      <div className="pool-detail-chart-symbols">
        {token0?.symbol}
        {" / "}
        {token1?.symbol}
      </div>

      <div className="pool-detail-chart-bars">
        {bars.map(
          (bar) => {
            const value =
              Math.max(
                bar.amount0,
                bar.amount1
              );

            const height =
              maxValue > 0
                ? Math.max(
                    7,
                    (
                      value /
                      maxValue
                    ) *
                      100
                  )
                : 7;

            return (
              <div
                key={bar.id}
                className="pool-detail-chart-column"
              >
                <div
                  className="pool-detail-chart-bar"
                  style={{
                    height:
                      `${height}%`,
                  }}
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}


function ChartShell({ label, symbols, children }) {
  return (
    <div className="pool-detail-chart">
      <div className="pool-detail-chart-label">{label}</div>
      <div className="pool-detail-chart-symbols">{symbols}</div>
      {children}
    </div>
  );
}

function EmptyChart({ title, text }) {
  return (
    <div className="pool-detail-chart-empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function PriceChart({ swaps, token0, token1, fallbackPrice }) {
  const points = useMemo(() => {
    if (!Array.isArray(swaps) || swaps.length === 0) return [];

    const ordered = [...swaps].reverse();

    const values = ordered
      .map((swap, index) => {
        const amount0 = Number(swap?.token0?.amount || 0);
        const amount1 = Number(swap?.token1?.amount || 0);

        if (
          !Number.isFinite(amount0) ||
          !Number.isFinite(amount1) ||
          amount0 <= 0 ||
          amount1 <= 0
        ) {
          return null;
        }

        return {
          id: `${swap.transactionHash || "swap"}-${swap.logIndex ?? index}`,
          value: amount1 / amount0,
        };
      })
      .filter(Boolean);

    if (values.length === 0 && Number(fallbackPrice) > 0) {
      return [{ id: "current-price", value: Number(fallbackPrice) }];
    }

    return values;
  }, [swaps, fallbackPrice]);

  if (points.length === 0) {
    return (
      <EmptyChart
        title="No price history yet"
        text="Price history will appear after swaps are indexed."
      />
    );
  }

  const width = 1000;
  const height = 210;
  const padding = 12;
  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const range = max - min || Math.max(max * 0.02, 1e-12);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : (index / (points.length - 1)) * width;

    const y =
      padding +
      ((max - point.value) / range) * (height - padding * 2);

    return { ...point, x, y };
  });

  const polyline = coordinates
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <ChartShell
      label={`1 ${token0?.symbol || "token0"} = ${formatNumber(
        points[points.length - 1]?.value,
        8
      )} ${token1?.symbol || "token1"}`}
      symbols={`${token0?.symbol || "?"} / ${token1?.symbol || "?"}`}
    >
      <svg
        className="pool-detail-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Pool price history"
      >
        {points.length === 1 ? (
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            className="pool-detail-line"
          />
        ) : (
          <polyline
            points={polyline}
            className="pool-detail-line"
          />
        )}
      </svg>
    </ChartShell>
  );
}

function LiquidityChart({ token0, token1, reserve0, reserve1 }) {
  const r0 = Number(reserve0);
  const r1 = Number(reserve1);

  if (
    !Number.isFinite(r0) ||
    !Number.isFinite(r1) ||
    r0 < 0 ||
    r1 < 0
  ) {
    return (
      <EmptyChart
        title="Liquidity data unavailable"
        text="Pool reserve data could not be loaded."
      />
    );
  }

  const maxReserve = Math.max(r0, r1, 1);
  const h0 = Math.max(5, (r0 / maxReserve) * 100);
  const h1 = Math.max(5, (r1 / maxReserve) * 100);

  return (
    <ChartShell
      label="Current pool reserves"
      symbols={`${token0?.symbol || "?"} / ${token1?.symbol || "?"}`}
    >
      <div className="pool-detail-liquidity-chart">
        <div className="pool-detail-liquidity-item">
          <div className="pool-detail-liquidity-value">
            {formatNumber(r0, 6)} {token0?.symbol}
          </div>

          <div className="pool-detail-liquidity-track">
            <div
              className="pool-detail-liquidity-fill"
              style={{ height: `${h0}%` }}
            />
          </div>

          <strong>{token0?.symbol || "Token 0"}</strong>
        </div>

        <div className="pool-detail-liquidity-item">
          <div className="pool-detail-liquidity-value">
            {formatNumber(r1, 6)} {token1?.symbol}
          </div>

          <div className="pool-detail-liquidity-track">
            <div
              className="pool-detail-liquidity-fill pool-detail-liquidity-fill-secondary"
              style={{ height: `${h1}%` }}
            />
          </div>

          <strong>{token1?.symbol || "Token 1"}</strong>
        </div>
      </div>
    </ChartShell>
  );
}

function DepthChart({ token0, token1, reserve0, reserve1 }) {
  const r0 = Number(reserve0);
  const r1 = Number(reserve1);

  const points = useMemo(() => {
    if (
      !Number.isFinite(r0) ||
      !Number.isFinite(r1) ||
      r0 <= 0 ||
      r1 <= 0
    ) {
      return [];
    }

    const k = r0 * r1;
    const width = 1000;
    const height = 210;
    const padding = 12;
    const samples = 80;

    const raw = Array.from({ length: samples }, (_, index) => {
      const ratio = 0.45 + (index / (samples - 1)) * 1.1;
      const xReserve = r0 * ratio;
      const yReserve = k / xReserve;
      const price = yReserve / xReserve;

      return { price };
    });

    const minPrice = Math.min(...raw.map((point) => point.price));
    const maxPrice = Math.max(...raw.map((point) => point.price));
    const range = maxPrice - minPrice || 1;

    return raw.map((point, index) => ({
      ...point,
      x: (index / (samples - 1)) * width,
      y:
        padding +
        ((maxPrice - point.price) / range) *
          (height - padding * 2),
    }));
  }, [r0, r1]);

  if (points.length === 0) {
    return (
      <EmptyChart
        title="Depth data unavailable"
        text="Pool reserves are required to calculate AMM depth."
      />
    );
  }

  const polyline = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const currentPrice = r1 / r0;

  return (
    <ChartShell
      label={`AMM depth · current price ${formatNumber(currentPrice, 8)} ${
        token1?.symbol || ""
      }`}
      symbols={`${token0?.symbol || "?"} / ${token1?.symbol || "?"}`}
    >
      <svg
        className="pool-detail-line-chart"
        viewBox="0 0 1000 210"
        preserveAspectRatio="none"
        role="img"
        aria-label="AMM liquidity depth curve"
      >
        <polyline
          points={polyline}
          className="pool-detail-line pool-detail-depth-line"
        />

        <line
          x1="500"
          y1="0"
          x2="500"
          y2="210"
          className="pool-detail-current-depth"
        />
      </svg>

      <div className="pool-detail-depth-caption">
        <span>More {token0?.symbol || "token0"}</span>
        <span>Current pool</span>
        <span>More {token1?.symbol || "token1"}</span>
      </div>
    </ChartShell>
  );
}

// ==========================================
// POOL DETAIL
// ==========================================

function PoolDetail({
  pool,
  onBack,
  onSwap,
  onAddLiquidity,
  account,
}) {
  const pairAddress =
    pool?.pairAddress ||
    pool?.poolAddress;

  const [
    poolData,
    setPoolData,
  ] = useState(null);

  const [
    stats,
    setStats,
  ] = useState(null);

  const [
    swaps,
    setSwaps,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    removeLiquidityOpen,
    setRemoveLiquidityOpen,
  ] = useState(false);

  const [
    activeChart,
    setActiveChart,
  ] = useState("volume");

  // ========================================
  // LOAD
  // ========================================

  const loadData =
    useCallback(
      async () => {
        if (!pairAddress) {
          setError(
            "Pool address is missing."
          );

          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const [
            poolResult,
            statsResult,
            swapsResult,
          ] =
            await Promise.all([
              getPool(
                pairAddress
              ),

              getSinglePoolStats(
                pairAddress
              ),

              getPoolSwaps(
                pairAddress,
                {
                  limit: 50,
                  skip: 0,
                }
              ),
            ]);

          setPoolData(
            poolResult
          );

          setStats(
            statsResult
          );

          setSwaps(
            Array.isArray(
              swapsResult?.data
            )
              ? swapsResult.data
              : []
          );
        } catch (err) {
          console.error(
            "Pool detail load error:",
            err
          );

          setError(
            err?.message ||
              "Could not load pool."
          );
        } finally {
          setLoading(false);
        }
      },
      [pairAddress]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // DATA
  // ========================================

  const token0 =
    poolData?.token0 ||
    stats?.token0 ||
    pool?.token0 ||
    {};

  const token1 =
    poolData?.token1 ||
    stats?.token1 ||
    pool?.token1 ||
    {};

  const poolName =
    poolData?.poolName ||
    stats?.poolName ||
    pool?.poolName ||
    `${token0.symbol || "?"}/${token1.symbol || "?"}`;

  const reserve0 =
    poolData?.token0
      ?.reserveFormatted ??
    stats?.token0
      ?.reserveFormatted ??
    pool?.token0
      ?.reserveFormatted;

  const reserve1 =
    poolData?.token1
      ?.reserveFormatted ??
    stats?.token1
      ?.reserveFormatted ??
    pool?.token1
      ?.reserveFormatted;

  const fees1d =
    stats?.volume1dUsd !==
      null &&
    stats?.volume1dUsd !==
      undefined
      ? Number(
          stats.volume1dUsd
        ) * 0.003
      : null;

  // ========================================
  // STATES
  // ========================================

  if (loading) {
    return (
      <main className="pool-detail-page">
        <div className="pool-detail-loading">
          Loading pool...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pool-detail-page">
        <button
          type="button"
          className="pool-detail-back"
          onClick={onBack}
        >
          ← Pools
        </button>

        <div className="pool-detail-error">
          <strong>
            Unable to load pool
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={
              loadData
            }
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="pool-detail-page">
      {/* BREADCRUMB */}

      <div className="pool-detail-breadcrumb">
        <button
          type="button"
          onClick={onBack}
        >
          Pools
        </button>

        <span>
          ›
        </span>

        <strong>
          {poolName}
        </strong>
      </div>

      {/* HEADER */}

      <section className="pool-detail-header">
        <div className="pool-detail-title-area">
          <div className="pool-detail-token-icons">
            <TokenIcon
              symbol={
                token0.symbol
              }
            />

            <TokenIcon
              symbol={
                token1.symbol
              }
              second
            />
          </div>

          <div>
            <div className="pool-detail-title-row">
              <h1>
                {poolName}
              </h1>

              <span className="pool-detail-version">
                v2
              </span>

              <span className="pool-detail-fee-badge">
                0.30%
              </span>
            </div>

            <div className="pool-detail-address">
              {shortAddress(
                pairAddress,
                8,
                6
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="pool-detail-divider" />

      {/* CONTENT */}

      <section className="pool-detail-layout">
        {/* LEFT */}

        <div className="pool-detail-main">
          <div className="pool-detail-tabs">
            {[
              ["volume", "Volume"],
              ["price", "Price"],
              ["liquidity", "Liquidity"],
              ["depth", "Depth"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={
                  activeChart === key
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setActiveChart(key);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pool-detail-chart-heading">
            <div>
              {activeChart === "volume" && (
                <>
                  <strong>
                    {stats?.swapCount1d ?? 0}
                  </strong>
                  <span>
                    swaps in the last 24 hours
                  </span>
                </>
              )}

              {activeChart === "price" && (
                <>
                  <strong>
                    {formatNumber(
                      Number(reserve0) > 0
                        ? Number(reserve1) /
                            Number(reserve0)
                        : null,
                      8
                    )}
                  </strong>
                  <span>
                    {token1.symbol} per {token0.symbol}
                  </span>
                </>
              )}

              {activeChart === "liquidity" && (
                <>
                  <strong>Pool liquidity</strong>
                  <span>Current on-chain reserves</span>
                </>
              )}

              {activeChart === "depth" && (
                <>
                  <strong>AMM depth</strong>
                  <span>Constant-product liquidity curve</span>
                </>
              )}
            </div>
          </div>

          {activeChart === "volume" && (
            <VolumeChart
              swaps={swaps}
              token0={token0}
              token1={token1}
            />
          )}

          {activeChart === "price" && (
            <PriceChart
              swaps={swaps}
              token0={token0}
              token1={token1}
              fallbackPrice={
                Number(reserve0) > 0
                  ? Number(reserve1) /
                    Number(reserve0)
                  : null
              }
            />
          )}

          {activeChart === "liquidity" && (
            <LiquidityChart
              token0={token0}
              token1={token1}
              reserve0={reserve0}
              reserve1={reserve1}
            />
          )}

          {activeChart === "depth" && (
            <DepthChart
              token0={token0}
              token1={token1}
              reserve0={reserve0}
              reserve1={reserve1}
            />
          )}

          {/* TRANSACTIONS */}

          <section className="pool-transactions">
            <h2>
              Transactions
            </h2>

            <div className="pool-transactions-scroll">
              <table className="pool-transactions-table">
                <thead>
                  <tr>
                    <th>
                      Time
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      {token0.symbol}
                    </th>

                    <th>
                      {token1.symbol}
                    </th>

                    <th>
                      Wallet
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {swaps.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="pool-transactions-empty"
                      >
                        No transactions
                        yet.
                      </td>
                    </tr>
                  ) : (
                    swaps.map(
                      (
                        swap,
                        index
                      ) => (
                        <tr
                          key={
                            `${swap.transactionHash}-${swap.logIndex ?? index}`
                          }
                        >
                          <td>
                            {formatDate(
                              swap.timestamp
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                swap.side ===
                                "BUY"
                                  ? "pool-transaction-buy"
                                  : swap.side ===
                                      "SELL"
                                    ? "pool-transaction-sell"
                                    : ""
                              }
                            >
                              {swap.type}
                            </span>
                          </td>

                          <td>
                            {formatNumber(
                              swap
                                ?.token0
                                ?.amount,
                              6
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              swap
                                ?.token1
                                ?.amount,
                              6
                            )}
                          </td>

                          <td>
                            <span
                              title={
                                swap.sender
                              }
                            >
                              {shortAddress(
                                swap.sender,
                                6,
                                4
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* RIGHT */}

        <aside className="pool-detail-sidebar">
          <div className="pool-detail-actions">
            <button
              type="button"
              className="pool-detail-swap-button"
              onClick={() => {
                if (
                  typeof onSwap ===
                  "function"
                ) {
                  onSwap({
                    token0,
                    token1,
                    pool:
                      poolData,
                  });
                }
              }}
            >
              ⇄ Swap
            </button>

            <button
              type="button"
              className="pool-detail-liquidity-button"
              onClick={() => {
                if (
                  typeof onAddLiquidity ===
                  "function"
                ) {
                  onAddLiquidity({
                    token0,
                    token1,
                    pool:
                      poolData,
                  });
                }
              }}
            >
              + Add liquidity
            </button>

            <button
              type="button"
              className="pool-detail-remove-liquidity-button"
              onClick={() => {
                setRemoveLiquidityOpen(true);
              }}
            >
              − Remove liquidity
            </button>
          </div>

          {/* STATS */}

          <section className="pool-detail-stats">
            <h2>
              Statistics
            </h2>

            <div className="pool-detail-stat-block">
              <span className="pool-detail-stat-label">
                Pool balances
              </span>

              <div className="pool-detail-balances">
                <div>
                  <strong>
                    {formatNumber(
                      reserve0,
                      6
                    )}
                  </strong>

                  <span>
                    {token0.symbol}
                  </span>
                </div>

                <div>
                  <strong>
                    {formatNumber(
                      reserve1,
                      6
                    )}
                  </strong>

                  <span>
                    {token1.symbol}
                  </span>
                </div>
              </div>

              <div className="pool-detail-balance-bar">
                <span />
              </div>
            </div>

            <div className="pool-detail-stat-block">
              <span className="pool-detail-stat-label">
                Total APR
              </span>

              <strong className="pool-detail-stat-large">
                {formatApr(
                  stats?.apr
                )}
              </strong>
            </div>

            <div className="pool-detail-stat-block">
              <span className="pool-detail-stat-label">
                TVL
              </span>

              <strong className="pool-detail-stat-large">
                {formatUsd(
                  stats?.tvlUsd
                )}
              </strong>
            </div>

            <div className="pool-detail-stat-block">
              <span className="pool-detail-stat-label">
                24H volume
              </span>

              <strong className="pool-detail-stat-large">
                {formatUsd(
                  stats?.volume1dUsd
                )}
              </strong>

              <small>
                {formatNumber(
                  stats
                    ?.volume1d
                    ?.token0,
                  6
                )}{" "}
                {token0.symbol}
                {" · "}
                {formatNumber(
                  stats
                    ?.volume1d
                    ?.token1,
                  6
                )}{" "}
                {token1.symbol}
              </small>
            </div>

            <div className="pool-detail-stat-block">
              <span className="pool-detail-stat-label">
                24H fees
              </span>

              <strong className="pool-detail-stat-large">
                {formatUsd(
                  fees1d
                )}
              </strong>
            </div>
          </section>

          {/* LINKS */}

          <section className="pool-detail-links">
            <h2>
              Links
            </h2>

            <div className="pool-detail-link-row">
              <div className="pool-detail-link-token">
                <div className="pool-detail-link-icon">
                  LP
                </div>

                <span>
                  {poolName}
                </span>
              </div>

              <code>
                {shortAddress(
                  pairAddress,
                  6,
                  4
                )}
              </code>
            </div>

            <div className="pool-detail-link-row">
              <div className="pool-detail-link-token">
                <TokenIcon
                  symbol={
                    token0.symbol
                  }
                />

                <span>
                  {token0.symbol}
                </span>
              </div>

              <code>
                {shortAddress(
                  token0.address,
                  6,
                  4
                )}
              </code>
            </div>

            <div className="pool-detail-link-row">
              <div className="pool-detail-link-token">
                <TokenIcon
                  symbol={
                    token1.symbol
                  }
                />

                <span>
                  {token1.symbol}
                </span>
              </div>

              <code>
                {shortAddress(
                  token1.address,
                  6,
                  4
                )}
              </code>
            </div>
          </section>
        </aside>
      </section>

      {removeLiquidityOpen && (
        <RemoveLiquidityPanel
          pairAddress={pairAddress}
          token0={token0}
          token1={token1}
          account={account}
          onClose={() => {
            setRemoveLiquidityOpen(false);
          }}
          onSuccess={loadData}
        />
      )}
    </main>
  );
}

export default PoolDetail;