import "./PoolTable.css";

// ==========================================
// FORMATTERS
// ==========================================

function formatUsd(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  const number =
    Number(value);

  if (
    Math.abs(number) >=
    1_000_000_000
  ) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }
    ).format(number);
  }

  if (
    Math.abs(number) >=
    1_000_000
  ) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }
    ).format(number);
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(number);
}

function formatRatio(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(2);
}

function formatApr(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(
    value
  ).toFixed(2)}%`;
}

// ==========================================
// TOKEN ICON
// ==========================================

function TokenIcon({
  symbol,
  position,
}) {
  const normalizedSymbol =
    String(
      symbol || "?"
    )
      .trim()
      .toUpperCase();

  const firstLetter =
    normalizedSymbol
      .charAt(0) || "?";

  return (
    <div
      className={`pool-token-icon ${
        position === "second"
          ? "pool-token-icon-second"
          : ""
      }`}
      title={normalizedSymbol}
    >
      {firstLetter}
    </div>
  );
}

// ==========================================
// POOL TABLE
// ==========================================

function PoolTable({
  pools = [],
  onSelectPool,
}) {
  if (
    !Array.isArray(pools) ||
    pools.length === 0
  ) {
    return (
      <div className="pool-table-empty">
        <div className="pool-table-empty-icon">
          ◇
        </div>

        <strong>
          No pools available
        </strong>

        <span>
          Pools will appear here
          once liquidity is added.
        </span>
      </div>
    );
  }

  return (
    <div className="pool-table-container">
      <div className="pool-table-scroll">
        <table className="pool-table">
          <thead>
            <tr>
              <th className="pool-table-rank">
                #
              </th>

              <th className="pool-table-pool-heading">
                Pool
              </th>

              <th>
                TVL
              </th>

              <th>
                1D Volume
              </th>

              <th>
                30D Volume
              </th>

              <th>
                1D Volume / TVL
              </th>

              <th>
                Pool APR
              </th>
            </tr>
          </thead>

          <tbody>
            {pools.map(
              (
                pool,
                index
              ) => {
                const token0 =
                  pool.token0 || {};

                const token1 =
                  pool.token1 || {};

                const token0Symbol =
                  token0.symbol ||
                  "?";

                const token1Symbol =
                  token1.symbol ||
                  "?";

                const poolName =
                  pool.poolName ||
                  `${token0Symbol}/${token1Symbol}`;

                return (
                  <tr
                    key={
                      pool.pairAddress ||
                      index
                    }
                    className="pool-table-row"
                    onClick={() => {
                      if (
                        typeof onSelectPool ===
                        "function"
                      ) {
                        onSelectPool(
                          pool
                        );
                      }
                    }}
                  >
                    <td className="pool-table-rank">
                      {index + 1}
                    </td>

                    <td className="pool-table-pool-cell">
                      <div className="pool-table-pool">
                        <div className="pool-token-icons">
                          <TokenIcon
                            symbol={
                              token0Symbol
                            }
                            position="first"
                          />

                          <TokenIcon
                            symbol={
                              token1Symbol
                            }
                            position="second"
                          />
                        </div>

                        <div className="pool-table-pool-info">
                          <div className="pool-table-pool-name">
                            {poolName}
                          </div>

                          <div className="pool-table-pool-fee">
                            v2 · 0.30%
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="pool-table-number">
                      {formatUsd(
                        pool.tvlUsd
                      )}
                    </td>

                    <td className="pool-table-number">
                      {formatUsd(
                        pool.volume1dUsd
                      )}
                    </td>

                    <td className="pool-table-number">
                      {formatUsd(
                        pool.volume30dUsd
                      )}
                    </td>

                    <td className="pool-table-number">
                      {formatRatio(
                        pool.volumeTvlRatio
                      )}
                    </td>

                    <td className="pool-table-number pool-table-apr">
                      {formatApr(
                        pool.apr
                      )}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PoolTable;