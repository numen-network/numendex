import "./PoolsPage.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PoolTable from "./PoolTable";

import {
  getPoolStats,
} from "../../services/api";

import {
  getWalletPoolPositions,
} from "../../services/positions";

import {
  TOKEN_ADDRESSES,
} from "../../config/network";

import NumenLogo from "../common/NumenLogo";

// ========================================
// HELPERS
// ========================================

function formatUsd(value) {
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value)
  );
}

function sameAddress(
  first,
  second
) {
  if (
    !first ||
    !second
  ) {
    return false;
  }

  return (
    String(first).toLowerCase() ===
    String(second).toLowerCase()
  );
}

function formatTokenAmount(
  value,
  maximumFractionDigits = 6
) {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "0";
  }

  if (
    numeric === 0
  ) {
    return "0";
  }

  if (
    Math.abs(numeric) <
    0.000001
  ) {
    return "<0.000001";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }
  ).format(
    numeric
  );
}

function formatPoolShare(
  value
) {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    ) ||
    numeric <= 0
  ) {
    return "0%";
  }

  if (
    numeric <
    0.0001
  ) {
    return "<0.0001%";
  }

  if (
    numeric <
    0.01
  ) {
    return `${numeric.toFixed(
      4
    )}%`;
  }

  if (
    numeric <
    1
  ) {
    return `${numeric.toFixed(
      3
    )}%`;
  }

  return `${numeric.toFixed(
    2
  )}%`;
}

function shortAddress(
  address
) {
  if (
    !address ||
    address.length < 12
  ) {
    return (
      address ||
      ""
    );
  }

  return `${address.slice(
    0,
    6
  )}...${address.slice(
    -4
  )}`;
}

// ========================================
// TOKEN ICON
// ========================================

function PositionTokenIcon({
  token,
  size = 34,
}) {
  if (!token) {
    return null;
  }

  if (
    sameAddress(
      token.address,
      TOKEN_ADDRESSES.NUMN
    )
  ) {
    return (
      <NumenLogo
        size={size}
        alt={
          token.symbol ||
          "NUMN"
        }
      />
    );
  }

  if (
    token.logoURI
  ) {
    return (
      <img
        src={
          token.logoURI
        }
        alt={
          token.symbol ||
          "Token"
        }
        className="position-token-image"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <span
      className="position-token-fallback"
      style={{
        width: size,
        height: size,
      }}
    >
      {token.symbol
        ?.charAt(0)
        ?.toUpperCase() ||
        "?"}
    </span>
  );
}

// ========================================
// COMPONENT
// ========================================

function PoolsPage({
  account,
  isNumenNetwork,

  onSelectPool,
  onNewPosition,
  onCreatePool,
  onCreateToken,
}) {
  // ========================================
  // POOLS
  // ========================================

  const [
    pools,
    setPools,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  // ========================================
  // POSITIONS
  // ========================================

  const [
    positions,
    setPositions,
  ] =
    useState([]);

  const [
    positionsLoading,
    setPositionsLoading,
  ] =
    useState(false);

  const [
    positionsError,
    setPositionsError,
  ] =
    useState("");

  // ========================================
  // LOAD POOLS
  // ========================================

  const loadPools =
    useCallback(async () => {
      setLoading(
        true
      );

      setError(
        ""
      );

      try {
        const data =
          await getPoolStats();

        setPools(
          Array.isArray(
            data
          )
            ? data
            : []
        );
      } catch (
        err
      ) {
        console.error(
          "Pool stats loading error:",
          err
        );

        setError(
          err?.message ||
            "Could not load pool data."
        );
      } finally {
        setLoading(
          false
        );
      }
    }, []);

  useEffect(() => {
    loadPools();
  }, [
    loadPools,
  ]);

  // ========================================
  // LOAD WALLET POSITIONS
  // ========================================

  const loadPositions =
    useCallback(async () => {
      if (
        !account ||
        !isNumenNetwork ||
        !Array.isArray(
          pools
        ) ||
        pools.length === 0
      ) {
        setPositions(
          []
        );

        setPositionsError(
          ""
        );

        setPositionsLoading(
          false
        );

        return;
      }

      setPositionsLoading(
        true
      );

      setPositionsError(
        ""
      );

      try {
        const result =
          await getWalletPoolPositions({
            account,
            pools,
          });

        setPositions(
          Array.isArray(
            result
          )
            ? result
            : []
        );
      } catch (
        err
      ) {
        console.error(
          "Wallet positions loading error:",
          err
        );

        setPositions(
          []
        );

        setPositionsError(
          err?.message ||
            "Could not load liquidity positions."
        );
      } finally {
        setPositionsLoading(
          false
        );
      }
    }, [
      account,
      isNumenNetwork,
      pools,
    ]);

  useEffect(() => {
    loadPositions();
  }, [
    loadPositions,
  ]);

  // ========================================
  // SUMMARY
  // ========================================

  const summary =
    useMemo(() => {
      let totalLiquidity =
        0;

      let totalFees =
        0;

      let hasLiquidity =
        false;

      let hasFees =
        false;

      for (
        const pool
        of pools
      ) {
        const tvl =
          Number(
            pool.tvlUsd
          );

        const volume1d =
          Number(
            pool.volume1dUsd
          );

        if (
          pool.tvlUsd !==
            null &&
          pool.tvlUsd !==
            undefined &&
          Number.isFinite(
            tvl
          )
        ) {
          totalLiquidity +=
            tvl;

          hasLiquidity =
            true;
        }

        if (
          pool.volume1dUsd !==
            null &&
          pool.volume1dUsd !==
            undefined &&
          Number.isFinite(
            volume1d
          )
        ) {
          totalFees +=
            volume1d *
            0.003;

          hasFees =
            true;
        }
      }

      return {
        totalLiquidity:
          hasLiquidity
            ? totalLiquidity
            : null,

        totalFees:
          hasFees
            ? totalFees
            : null,

        totalRewards:
          null,
      };
    }, [
      pools,
    ]);

  // ========================================
  // POSITION -> POOL DETAIL
  // ========================================

  const handleManagePosition =
    useCallback(
      (
        position
      ) => {
        if (
          !position
        ) {
          return;
        }

        /*
         * Prefer the original backend
         * pool object because PoolDetail
         * already understands its shape.
         */
        if (
          position.pool
        ) {
          onSelectPool?.(
            position.pool
          );

          return;
        }

        /*
         * Fallback shape in case the
         * original pool is unavailable.
         */
        onSelectPool?.({
          pairAddress:
            position.pairAddress,

          token0:
            position.token0,

          token1:
            position.token1,

          token0Address:
            position.token0
              ?.address,

          token1Address:
            position.token1
              ?.address,

          token0Symbol:
            position.token0
              ?.symbol,

          token1Symbol:
            position.token1
              ?.symbol,

          token0Decimals:
            position.token0
              ?.decimals,

          token1Decimals:
            position.token1
              ?.decimals,
        });
      },
      [
        onSelectPool,
      ]
    );

  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="pools-page">
      {/* =====================================
          INTRO
          ===================================== */}

      <section className="pools-intro">
        <h1>
          Provide liquidity
          <br />
          and earn fees
        </h1>

        <p>
          Contribute liquidity to
          NumenDEX pools and earn
          fees and rewards.
        </p>
      </section>

      {/* =====================================
          ACTION BUTTONS
          ===================================== */}

      <section className="pools-actions">
        <button
          type="button"
          className="pools-action-primary"
          onClick={
            onNewPosition
          }
        >
          <span className="pools-drop-icon">
            ●
          </span>

          New position
        </button>

        <button
          type="button"
          className="pools-action-secondary"
          onClick={
            onCreatePool
          }
        >
          <span className="pools-plus-icon">
            +
          </span>

          Create pool
        </button>

        <button
          type="button"
          className="pools-action-secondary"
          onClick={
            onCreateToken
          }
        >
          <span className="pools-plus-icon">
            +
          </span>

          Create token
        </button>
      </section>

      {/* =====================================
          SUMMARY CARDS
          ===================================== */}

      <section className="pools-summary-grid">
        <article className="pools-summary-card">
          <div className="pools-summary-header">
            <span>
              Total liquidity
            </span>
          </div>

          <div className="pools-summary-value">
            {formatUsd(
              summary.totalLiquidity
            )}
          </div>
        </article>

        <article className="pools-summary-card">
          <div className="pools-summary-header">
            <span>
              Total fees
            </span>

            <button
              type="button"
              className="pools-collect-button"
              disabled
            >
              Collect
            </button>
          </div>

          <div className="pools-summary-value">
            {formatUsd(
              summary.totalFees
            )}
          </div>
        </article>

        <article className="pools-summary-card">
          <div className="pools-summary-header">
            <span>
              Total rewards
            </span>

            <button
              type="button"
              className="pools-collect-button"
              disabled
            >
              Collect
            </button>
          </div>

          <div className="pools-summary-value">
            {formatUsd(
              summary.totalRewards
            )}
          </div>
        </article>
      </section>

      {/* =====================================
          POSITIONS
          ===================================== */}

      <section className="positions-section">
        <div className="positions-heading-row">
          <div>
            <h2>
              Existing positions
            </h2>

            {account && (
              <span>
                {shortAddress(
                  account
                )}
              </span>
            )}
          </div>

          {account &&
            isNumenNetwork && (
              <button
                type="button"
                className="positions-refresh-button"
                onClick={
                  loadPositions
                }
                disabled={
                  positionsLoading
                }
              >
                {positionsLoading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            )}
        </div>

        {!account ? (
          <div className="positions-empty">
            <div className="positions-decoration positions-decoration-left">
              ✦
            </div>

            <div className="positions-decoration positions-decoration-middle">
              ✿
            </div>

            <div className="positions-decoration positions-decoration-top">
              ✦
            </div>

            <div className="positions-decoration positions-decoration-right">
              ◆
            </div>

            <div className="positions-empty-content">
              <h2>
                Connect your wallet
              </h2>

              <p>
                Connect your wallet to
                view your NumenDEX
                liquidity positions.
              </p>
            </div>
          </div>
        ) : !isNumenNetwork ? (
          <div className="positions-empty">
            <div className="positions-empty-content">
              <h2>
                Numen Network required
              </h2>

              <p>
                Switch your wallet to
                Numen Network to view
                your liquidity positions.
              </p>
            </div>
          </div>
        ) : positionsLoading ? (
          <div className="positions-loading">
            <div className="positions-loading-spinner" />

            <span>
              Loading your positions...
            </span>
          </div>
        ) : positionsError ? (
          <div className="positions-error">
            <strong>
              Unable to load positions
            </strong>

            <p>
              {positionsError}
            </p>

            <button
              type="button"
              onClick={
                loadPositions
              }
            >
              Try again
            </button>
          </div>
        ) : positions.length ===
          0 ? (
          <div className="positions-empty">
            <div className="positions-decoration positions-decoration-left">
              ✦
            </div>

            <div className="positions-decoration positions-decoration-middle">
              ✿
            </div>

            <div className="positions-decoration positions-decoration-top">
              ✦
            </div>

            <div className="positions-decoration positions-decoration-right">
              ◆
            </div>

            <div className="positions-empty-content">
              <h2>
                No positions
              </h2>

              <p>
                You don't have any
                liquidity positions.
                Create a new position
                in an eligible pool to
                start earning fees and
                rewards.
              </p>
            </div>
          </div>
        ) : (
          <div className="positions-list">
            {positions.map(
              (
                position
              ) => (
                <article
                  key={
                    position.id
                  }
                  className="position-card"
                >
                  <div className="position-card-top">
                    <div className="position-pair">
                      <div className="position-token-icons">
                        <PositionTokenIcon
                          token={
                            position.token0
                          }
                          size={
                            36
                          }
                        />

                        <PositionTokenIcon
                          token={
                            position.token1
                          }
                          size={
                            36
                          }
                        />
                      </div>

                      <div className="position-pair-info">
                        <div className="position-pair-name">
                          {
                            position
                              .token0
                              .symbol
                          }
                          {" / "}
                          {
                            position
                              .token1
                              .symbol
                          }
                        </div>

                        <div className="position-pair-meta">
                          <span>
                            v2
                          </span>

                          <span>
                            ·
                          </span>

                          <span>
                            0.30%
                          </span>

                          <span>
                            ·
                          </span>

                          <span>
                            {
                              shortAddress(
                                position.pairAddress
                              )
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="position-status">
                      <span className="position-status-dot" />

                      In range
                    </div>
                  </div>

                  <div className="position-stats-grid">
                    <div className="position-stat">
                      <span>
                        Pool share
                      </span>

                      <strong>
                        {formatPoolShare(
                          position.poolShare
                        )}
                      </strong>
                    </div>

                    <div className="position-stat">
                      <span>
                        {
                          position
                            .token0
                            .symbol
                        }
                      </span>

                      <strong>
                        {formatTokenAmount(
                          position.amount0
                        )}
                      </strong>
                    </div>

                    <div className="position-stat">
                      <span>
                        {
                          position
                            .token1
                            .symbol
                        }
                      </span>

                      <strong>
                        {formatTokenAmount(
                          position.amount1
                        )}
                      </strong>
                    </div>

                    <div className="position-stat">
                      <span>
                        LP tokens
                      </span>

                      <strong>
                        {formatTokenAmount(
                          position.lpBalance
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="position-card-footer">
                    <div className="position-liquidity-note">
                      <span>
                        Your liquidity
                      </span>

                      <strong>
                        {
                          formatTokenAmount(
                            position.amount0
                          )
                        }{" "}
                        {
                          position
                            .token0
                            .symbol
                        }
                        {" + "}
                        {
                          formatTokenAmount(
                            position.amount1
                          )
                        }{" "}
                        {
                          position
                            .token1
                            .symbol
                        }
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="position-manage-button"
                      onClick={() =>
                        handleManagePosition(
                          position
                        )
                      }
                    >
                      Manage position

                      <span>
                        →
                      </span>
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* =====================================
          TOP POOLS
          ===================================== */}

      <section className="top-pools-section">
        <div className="top-pools-title">
          Top pools
        </div>

        {error ? (
          <div className="pools-error-state">
            <strong>
              Unable to load pools
            </strong>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={
                loadPools
              }
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="pools-loading-state">
            Loading pools...
          </div>
        ) : (
          <PoolTable
            pools={
              pools
            }
            onSelectPool={
              onSelectPool
            }
          />
        )}
      </section>
    </main>
  );
}

export default PoolsPage;