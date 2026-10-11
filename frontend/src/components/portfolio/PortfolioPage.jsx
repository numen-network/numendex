import { useEffect, useMemo, useState } from "react";
import { getPools, getTokens } from "../../services/api";
import { getTokenBalance } from "../../services/balance";
import { getWalletPoolPositions } from "../../services/positions";
import { TOKEN_ADDRESSES } from "../../config/network";
import {
  evmToNumenAddress,
  getNumenAccountExplorerUrl,
} from "../../utils/numenAddress";
import "./PortfolioPage.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tokens", label: "Tokens" },
  { id: "liquidity", label: "Liquidity" },
  { id: "assets", label: "Assets" },
  { id: "activity", label: "Activity" },
];

function short(value, left = 6, right = 4) {
  if (!value) return "—";
  const text = String(value);
  if (text.length <= left + right + 3) return text;
  return `${text.slice(0, left)}...${text.slice(-right)}`;
}

function display(value, digits = 5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
  }).format(parsed);
}

function addressOf(token) {
  return token?.address || token?.tokenAddress || "";
}

function symbolOf(token) {
  return token?.symbol || token?.tokenSymbol || "TOKEN";
}

function nameOf(token) {
  return token?.name || token?.tokenName || symbolOf(token);
}


function numericTokenField(token, key) {
  const candidates = {
    price: [token?.priceUsd, token?.price, token?.usdPrice],
    averageCost: [
      token?.averageCostUsd,
      token?.averageCost,
      token?.avgCostUsd,
      token?.avgCost,
    ],
    change1d: [
      token?.change1d,
      token?.change1dPercent,
      token?.priceChange1d,
      token?.priceChange24h,
    ],
    balance: [token?.balance?.formatted],
    value: [
      token?.valueUsd,
      token?.usdValue,
      token?.portfolioValueUsd,
    ],
    unrealizedPnl: [
      token?.unrealizedPnlUsd,
      token?.unrealizedPnl,
      token?.pnlUsd,
    ],
    allocation: [
      token?.allocationPercent,
      token?.portfolioPercent,
      token?.allocation,
    ],
  };

  for (const value of candidates[key] || []) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function compareNullableNumbers(a, b, direction) {
  const aMissing = a === null || a === undefined || !Number.isFinite(a);
  const bMissing = b === null || b === undefined || !Number.isFinite(b);

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  return direction === "asc" ? a - b : b - a;
}

function SortableHeader({
  column,
  label,
  numeric = false,
  sort,
  onSort,
}) {
  const active = sort.key === column;
  const arrow = active
    ? sort.direction === "asc"
      ? "↑"
      : "↓"
    : "↕";

  return (
    <th className={numeric ? "numeric" : ""}>
      <button
        type="button"
        className={`portfolio-sort-button${active ? " active" : ""}`}
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="portfolio-sort-arrow">{arrow}</span>
      </button>
    </th>
  );
}

function TokenMark({ symbol }) {
  return (
    <span className="portfolio-token-mark">
      {String(symbol || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="portfolio-empty-state">
      <div className="portfolio-empty-icon">◇</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default function PortfolioPage({
  account,
  connecting,
  isNumenNetwork,
  onConnect,
  onSwitchNetwork,
  onSelectPool,
  onNavigate,
}) {
  const [tokens, setTokens] = useState([]);
  const [positions, setPositions] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [tokenQuery, setTokenQuery] = useState("");
  const [liquidityQuery, setLiquidityQuery] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [portfolioRange, setPortfolioRange] = useState("1D");
  const [tokenSort, setTokenSort] = useState({
    key: "value",
    direction: "desc",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!account || !isNumenNetwork) {
        setTokens([]);
        setPositions([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [indexedTokens, pools] = await Promise.all([
          getTokens(),
          getPools(),
        ]);

        const normalizedNumen = String(TOKEN_ADDRESSES.NUMN).toLowerCase();
        const tokenMap = new Map();

        (Array.isArray(indexedTokens) ? indexedTokens : []).forEach((token) => {
          const key = addressOf(token).toLowerCase();
          if (key) tokenMap.set(key, token);
        });

        if (!tokenMap.has(normalizedNumen)) {
          tokenMap.set(normalizedNumen, {
            address: TOKEN_ADDRESSES.NUMN,
            symbol: "NUMN",
            name: "Numen",
            decimals: 18,
          });
        }

        const balanceResults = await Promise.allSettled(
          [...tokenMap.values()].map(async (token) => ({
            ...token,
            balance: await getTokenBalance({ token, account }),
          }))
        );

        const walletTokens = balanceResults
          .filter(
            (result) =>
              result.status === "fulfilled" &&
              result.value.balance.raw > 0n
          )
          .map((result) => result.value);

        const walletPositions = await getWalletPoolPositions({
          account,
          pools: Array.isArray(pools) ? pools : [],
        });

        if (!alive) return;

        setTokens(walletTokens);
        setPositions(
          Array.isArray(walletPositions) ? walletPositions : []
        );
      } catch (loadError) {
        if (alive) {
          setError(
            loadError?.message || "Portfolio could not be loaded."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [account, isNumenNetwork]);

  const numenAddress = useMemo(() => {
    try {
      return account ? evmToNumenAddress(account) : "";
    } catch {
      return "";
    }
  }, [account]);

  const filteredTokens = useMemo(() => {
    const needle = tokenQuery.trim().toLowerCase();
    if (!needle) return tokens;

    return tokens.filter((token) =>
      [nameOf(token), symbolOf(token), addressOf(token)]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [tokens, tokenQuery]);

  const sortedTokens = useMemo(() => {
    const rows = [...filteredTokens];
    const { key, direction } = tokenSort;

    rows.sort((a, b) => {
      if (key === "token") {
        const result = nameOf(a).localeCompare(nameOf(b), undefined, {
          sensitivity: "base",
        });
        return direction === "asc" ? result : -result;
      }

      return compareNullableNumbers(
        numericTokenField(a, key),
        numericTokenField(b, key),
        direction
      );
    });

    return rows;
  }, [filteredTokens, tokenSort]);

  const filteredPositions = useMemo(() => {
    const needle = liquidityQuery.trim().toLowerCase();
    if (!needle) return positions;

    return positions.filter((position) =>
      [
        position?.token0?.symbol,
        position?.token1?.symbol,
        position?.pairAddress,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [positions, liquidityQuery]);

  function handleTokenSort(key) {
    setTokenSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: key === "token" ? "asc" : "desc",
      };
    });
  }

  async function copyAddress() {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function openExplorer() {
    if (!account) return;

    try {
      window.open(
        getNumenAccountExplorerUrl(account),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (explorerError) {
      console.error(explorerError);
    }
  }

  if (!account) {
    return (
      <section className="portfolio-page">
        <div className="portfolio-connect">
          <div className="portfolio-connect-icon">◈</div>
          <span>NUMEN PORTFOLIO</span>
          <h1>Your on-chain portfolio</h1>
          <p>
            Connect your wallet to view token balances and NumenDEX
            liquidity positions.
          </p>
          <button type="button" onClick={onConnect} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </section>
    );
  }

  if (!isNumenNetwork) {
    return (
      <section className="portfolio-page">
        <div className="portfolio-connect">
          <div className="portfolio-connect-icon">↔</div>
          <span>WRONG NETWORK</span>
          <h1>Switch to Numen</h1>
          <p>Your portfolio is available on Numen Network.</p>
          <button type="button" onClick={onSwitchNetwork}>
            Switch Network
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="portfolio-page">
      <header className="portfolio-wallet-header">
        <div className="portfolio-wallet-identity">
          <div className="portfolio-avatar">N</div>
          <div>
            <strong>{short(account, 8, 6)}</strong>
            <small>{numenAddress ? short(numenAddress, 10, 8) : "Numen account"}</small>
          </div>
        </div>

        <div className="portfolio-wallet-actions">
          <button type="button" className="icon-only" onClick={copyAddress}>
            {copied ? "✓" : "•••"}
          </button>
          <button type="button" onClick={copyAddress}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={openExplorer}>
            Explorer ↗
          </button>
        </div>
      </header>

      <nav className="portfolio-tabs" aria-label="Portfolio sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <div className="portfolio-error">{error}</div>}
      {loading && (
        <div className="portfolio-loading">
          Reading your Numen portfolio…
        </div>
      )}

      {!loading && activeTab === "overview" && (
        <div className="portfolio-overview">
          <div className="portfolio-overview-main">
            <div className="portfolio-value-block">
              <span>Portfolio value</span>
              <h1>—</h1>
              <p>
                USD valuation will appear when reliable token price data is
                available.
              </p>
            </div>

            <div className="portfolio-chart-placeholder">
              <div className="portfolio-chart-line">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="portfolio-chart-message">
                Portfolio history for {portfolioRange} is not indexed yet.
              </div>
            </div>

            <div
              className="portfolio-range-switcher"
              aria-label="Portfolio chart range"
            >
              {["1H", "1D", "1W", "1M", "1Y", "All"].map((range) => (
                <button
                  key={range}
                  type="button"
                  className={portfolioRange === range ? "active" : ""}
                  onClick={() => setPortfolioRange(range)}
                  aria-pressed={portfolioRange === range}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <aside className="portfolio-overview-side">
            <div className="portfolio-quick-grid">
              <button type="button" onClick={() => onNavigate?.("swap")}>
                <b>⇄</b>
                <span>Swap</span>
              </button>
              <button type="button" onClick={() => onNavigate?.("pools")}>
                <b>＋</b>
                <span>Add liquidity</span>
              </button>
              <button type="button" onClick={() => onNavigate?.("assets")}>
                <b>◇</b>
                <span>Create asset</span>
              </button>
              <button type="button" onClick={openExplorer}>
                <b>↗</b>
                <span>Explorer</span>
              </button>
            </div>

            <div className="portfolio-stat-list">
              <div>
                <span>Tokens</span>
                <strong>{tokens.length}</strong>
              </div>
              <div>
                <span>Liquidity positions</span>
                <strong>{positions.length}</strong>
              </div>
              <div>
                <span>Network</span>
                <strong>Numen</strong>
              </div>
            </div>
          </aside>

          <div className="portfolio-overview-lower">
            <section className="portfolio-overview-section">
              <div className="portfolio-section-heading">
                <div>
                  <h2>Tokens</h2>
                  <p>{tokens.length} tokens with a balance</p>
                </div>
                <button type="button" onClick={() => setActiveTab("tokens")}>
                  View all →
                </button>
              </div>

              <div className="portfolio-clean-table-wrap">
                <table className="portfolio-clean-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th className="numeric">Price</th>
                      <th className="numeric">Balance</th>
                      <th className="numeric">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.slice(0, 4).map((token) => (
                      <tr key={addressOf(token)}>
                        <td>
                          <div className="portfolio-token-cell">
                            <TokenMark symbol={symbolOf(token)} />
                            <span>
                              <strong>{nameOf(token)}</strong>
                              <small>{symbolOf(token)}</small>
                            </span>
                          </div>
                        </td>
                        <td className="numeric">—</td>
                        <td className="numeric">
                          <strong>
                            {display(token?.balance?.formatted)}{" "}
                            {symbolOf(token)}
                          </strong>
                        </td>
                        <td className="numeric">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {tokens.length === 0 && (
                  <div className="portfolio-empty">
                    No indexed token balances found.
                  </div>
                )}
              </div>
            </section>

            <aside className="portfolio-overview-rail">
              <section>
                <div className="portfolio-section-heading compact">
                  <div>
                    <h2>Liquidity</h2>
                    <p>Your NumenDEX positions</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("liquidity")}
                  >
                    View all
                  </button>
                </div>

                <div className="portfolio-mini-list">
                  {positions.slice(0, 4).map((position) => (
                    <button
                      key={position.pairAddress}
                      type="button"
                      onClick={() =>
                        onSelectPool?.(position.pool || position)
                      }
                    >
                      <div className="portfolio-pair-mark">
                        <TokenMark symbol={position?.token0?.symbol} />
                        <TokenMark symbol={position?.token1?.symbol} />
                      </div>
                      <span>
                        <strong>
                          {position?.token0?.symbol || "TOKEN"} /{" "}
                          {position?.token1?.symbol || "TOKEN"}
                        </strong>
                        <small>
                          {display(position.poolShare, 4)}% pool share
                        </small>
                      </span>
                    </button>
                  ))}

                  {positions.length === 0 && (
                    <div className="portfolio-empty small">
                      No liquidity positions.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="portfolio-section-heading compact">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Wallet activity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                  >
                    View all
                  </button>
                </div>
                <div className="portfolio-empty small">
                  Wallet activity indexing is not available yet.
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {!loading && activeTab === "tokens" && (
        <section className="portfolio-tab-page">
          <div className="portfolio-tab-title">
            <div>
              <h1>Tokens</h1>
              <p>{tokens.length} tokens with a balance</p>
            </div>

            <label className="portfolio-search">
              <span>⌕</span>
              <input
                type="search"
                value={tokenQuery}
                onChange={(event) => setTokenQuery(event.target.value)}
                placeholder="Search token"
              />
            </label>
          </div>

          <div className="portfolio-clean-table-wrap">
            <table className="portfolio-clean-table portfolio-token-table">
              <thead>
                <tr>
                  <SortableHeader
                    column="token"
                    label="Token"
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="price"
                    label="Price"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="averageCost"
                    label="Avg. cost"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="change1d"
                    label="1D change"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="balance"
                    label="Balance"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="value"
                    label="Value"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="unrealizedPnl"
                    label="Unrealized P/L"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                  <SortableHeader
                    column="allocation"
                    label="Allocation"
                    numeric
                    sort={tokenSort}
                    onSort={handleTokenSort}
                  />
                </tr>
              </thead>

              <tbody>
                {sortedTokens.map((token) => {
                  const price = numericTokenField(token, "price");
                  const averageCost = numericTokenField(token, "averageCost");
                  const change1d = numericTokenField(token, "change1d");
                  const value = numericTokenField(token, "value");
                  const unrealizedPnl = numericTokenField(
                    token,
                    "unrealizedPnl"
                  );
                  const allocation = numericTokenField(token, "allocation");

                  return (
                    <tr key={addressOf(token)}>
                      <td>
                        <div className="portfolio-token-cell">
                          <TokenMark symbol={symbolOf(token)} />
                          <span>
                            <strong>{nameOf(token)}</strong>
                            <small>{symbolOf(token)}</small>
                          </span>
                        </div>
                      </td>

                      <td className="numeric">
                        {price === null ? "—" : `$${display(price, 8)}`}
                      </td>

                      <td className="numeric">
                        {averageCost === null
                          ? "—"
                          : `$${display(averageCost, 8)}`}
                      </td>

                      <td
                        className={`numeric ${
                          change1d === null
                            ? ""
                            : change1d >= 0
                              ? "portfolio-positive"
                              : "portfolio-negative"
                        }`}
                      >
                        {change1d === null
                          ? "—"
                          : `${change1d >= 0 ? "▲" : "▼"} ${display(
                              Math.abs(change1d),
                              2
                            )}%`}
                      </td>

                      <td className="numeric">
                        <strong>
                          {display(token?.balance?.formatted)}{" "}
                          {symbolOf(token)}
                        </strong>
                      </td>

                      <td className="numeric">
                        {value === null ? "—" : `$${display(value, 2)}`}
                      </td>

                      <td
                        className={`numeric ${
                          unrealizedPnl === null
                            ? ""
                            : unrealizedPnl >= 0
                              ? "portfolio-positive"
                              : "portfolio-negative"
                        }`}
                      >
                        {unrealizedPnl === null
                          ? "—"
                          : `${unrealizedPnl >= 0 ? "+" : "-"}$${display(
                              Math.abs(unrealizedPnl),
                              2
                            )}`}
                      </td>

                      <td className="numeric">
                        <div className="portfolio-allocation-cell">
                          <span>
                            {allocation === null
                              ? "—"
                              : `${display(allocation, 2)}%`}
                          </span>
                          <span className="portfolio-allocation-track">
                            <span
                              style={{
                                width:
                                  allocation === null
                                    ? "0%"
                                    : `${Math.max(
                                        0,
                                        Math.min(100, allocation)
                                      )}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sortedTokens.length === 0 && (
              <div className="portfolio-empty">No matching tokens.</div>
            )}
          </div>
        </section>
      )}

      {!loading && activeTab === "liquidity" && (
        <section className="portfolio-tab-page">
          <div className="portfolio-tab-title">
            <div>
              <h1>Liquidity</h1>
              <p>{positions.length} active NumenDEX positions</p>
            </div>

            <div className="portfolio-tab-actions">
              <label className="portfolio-search">
                <span>⌕</span>
                <input
                  type="search"
                  value={liquidityQuery}
                  onChange={(event) =>
                    setLiquidityQuery(event.target.value)
                  }
                  placeholder="Search pool"
                />
              </label>
              <button
                type="button"
                className="portfolio-primary-action"
                onClick={() => onNavigate?.("pools")}
              >
                + Add liquidity
              </button>
            </div>
          </div>

          <div className="portfolio-clean-table-wrap">
            <table className="portfolio-clean-table portfolio-liquidity-table">
              <thead>
                <tr>
                  <th>Pool</th>
                  <th className="numeric">LP Balance</th>
                  <th className="numeric">Pool Share</th>
                  <th className="numeric">Position Value</th>
                  <th className="numeric">APR</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position) => (
                  <tr
                    key={position.pairAddress}
                    className="clickable"
                    onClick={() =>
                      onSelectPool?.(position.pool || position)
                    }
                  >
                    <td>
                      <div className="portfolio-token-cell">
                        <div className="portfolio-pair-mark">
                          <TokenMark symbol={position?.token0?.symbol} />
                          <TokenMark symbol={position?.token1?.symbol} />
                        </div>
                        <span>
                          <strong>
                            {position?.token0?.symbol || "TOKEN"} /{" "}
                            {position?.token1?.symbol || "TOKEN"}
                          </strong>
                          <small>{short(position.pairAddress)}</small>
                        </span>
                      </div>
                    </td>
                    <td className="numeric">
                      {display(
                        position?.lpBalanceFormatted ??
                          position?.lpBalance ??
                          position?.balance,
                        6
                      )}
                    </td>
                    <td className="numeric">
                      {display(position.poolShare, 4)}%
                    </td>
                    <td className="numeric">—</td>
                    <td className="numeric">—</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPositions.length === 0 && (
              <div className="portfolio-empty">
                No matching liquidity positions.
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && activeTab === "assets" && (
        <section className="portfolio-tab-page">
          <div className="portfolio-tab-title">
            <div>
              <h1>Assets</h1>
              <p>Assets created or associated with this wallet</p>
            </div>

            <div className="portfolio-tab-actions">
              <label className="portfolio-search">
                <span>⌕</span>
                <input
                  type="search"
                  value={assetQuery}
                  onChange={(event) => setAssetQuery(event.target.value)}
                  placeholder="Search asset"
                />
              </label>
              <button
                type="button"
                className="portfolio-primary-action"
                onClick={() => onNavigate?.("assets")}
              >
                + Create asset
              </button>
            </div>
          </div>

          <EmptyState
            title="Asset portfolio is ready for indexing"
            text="Asset Studio contracts are live, but wallet-owned Asset IDs and Object IDs are not indexed by the current portfolio service yet."
          />
        </section>
      )}

      {!loading && activeTab === "activity" && (
        <section className="portfolio-tab-page">
          <div className="portfolio-tab-title">
            <div>
              <h1>Activity</h1>
              <p>On-chain activity for this wallet</p>
            </div>

            <label className="portfolio-search">
              <span>⌕</span>
              <input
                type="search"
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
                placeholder="Search activity"
              />
            </label>
          </div>

          <div className="portfolio-clean-table-wrap">
            <table className="portfolio-clean-table portfolio-activity-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th className="numeric">Amount</th>
                  <th>Asset / Pool</th>
                  <th>Address</th>
                  <th>Transaction</th>
                </tr>
              </thead>
            </table>

            <EmptyState
              title="No indexed wallet activity yet"
              text="Swap and liquidity events can be added here after the backend indexes activity by wallet address."
            />
          </div>
        </section>
      )}
    </section>
  );
}
