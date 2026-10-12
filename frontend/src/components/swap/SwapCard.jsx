import "./SwapCard.css";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import NumenLogo from "../common/NumenLogo";

import TokenSelector from "./TokenSelector";
import SwapSettings from "./SwapSettings";
import QuickAmountButtons from "./QuickAmountButtons";

import useTokens from "../../hooks/useTokens";
import useTokenBalance from "../../hooks/useTokenBalance";
import useSwapQuote from "../../hooks/useSwapQuote";
import useSwap from "../../hooks/useSwap";

import {
  DEFAULT_TOKEN,
  TOKEN_ADDRESSES,
  NUMEN_NETWORK,
} from "../../config/network";

import {
  formatDisplayBalance,
  formatTokenUnits,
} from "../../services/balance";

function isValidAmount(value) {
  return (
    value === "" ||
    /^\d*\.?\d*$/.test(value)
  );
}

function isPositiveAmount(value) {
  const amount =
    String(
      value || ""
    ).trim();

  if (
    !/^(?:\d+|\d*\.\d+)$/.test(
      amount
    )
  ) {
    return false;
  }

  const [
    integerPart = "0",
    fractionPart = "",
  ] = amount.split(".");

  return (
    `${integerPart}${fractionPart}`
      .replace(/^0+/, "")
      .length > 0
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
    first.toLowerCase() ===
    second.toLowerCase()
  );
}

function TokenIcon({
  token,
  size = 32,
}) {
  if (!token) {
    return null;
  }

  const isNumen =
    sameAddress(
      token.address,
      TOKEN_ADDRESSES.NUMN
    );

  if (isNumen) {
    return (
      <NumenLogo
        size={size}
        alt={token.symbol}
      />
    );
  }

  if (token.logoURI) {
    return (
      <img
        src={token.logoURI}
        alt={token.symbol}
        className="selected-token-logo"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <span
      className="generic-token-logo"
      style={{
        width: size,
        height: size,
      }}
    >
      {token.symbol
        ?.charAt(0)
        .toUpperCase() ||
        "?"}
    </span>
  );
}

function SwapCard({
  account,
  connecting,
  isNumenNetwork,
  walletError,
  onConnect,
  onSwitchNetwork,
  chartOpen,
  onToggleChart,
}) {
  const {
    tokens,
    loading:
      tokensLoading,
    error:
      tokensError,
    reload:
      reloadTokens,
    getTokenByAddress,
  } = useTokens();

  const {
    status:
      swapStatus,

    error:
      swapError,

    txHash,

    isCheckingAllowance,
    isApproving,
    isSwapping,
    isPending,
    isSuccess,

    executeSwap,
    resetSwapState,
  } = useSwap();

  const allTokens =
    useMemo(() => {
      const map =
        new Map();

      map.set(
        DEFAULT_TOKEN
          .address
          .toLowerCase(),
        DEFAULT_TOKEN
      );

      for (
        const token
        of tokens
      ) {
        if (
          !token?.address
        ) {
          continue;
        }

        map.set(
          token.address
            .toLowerCase(),
          token
        );
      }

      return Array.from(
        map.values()
      );
    }, [
      tokens,
    ]);

  const defaultNumen =
    useMemo(() => {
      return (
        getTokenByAddress(
          TOKEN_ADDRESSES.NUMN
        ) ||
        DEFAULT_TOKEN
      );
    }, [
      getTokenByAddress,
    ]);

  const [
    tokenIn,
    setTokenIn,
  ] =
    useState(
      DEFAULT_TOKEN
    );

  const [
    tokenOut,
    setTokenOut,
  ] =
    useState(null);

  const [
    amountIn,
    setAmountIn,
  ] =
    useState("");

  const [
    tokenSelectorSide,
    setTokenSelectorSide,
  ] =
    useState(null);

  const [
    settingsOpen,
    setSettingsOpen,
  ] =
    useState(false);

  const [
    slippageMode,
    setSlippageMode,
  ] =
    useState("auto");

  const [
    customSlippage,
    setCustomSlippage,
  ] =
    useState("0.5");

  const [
    deadline,
    setDeadline,
  ] =
    useState("30");

  const effectiveTokenIn =
    useMemo(() => {
      if (
        sameAddress(
          tokenIn?.address,
          TOKEN_ADDRESSES.NUMN
        )
      ) {
        return defaultNumen;
      }

      return tokenIn;
    }, [
      tokenIn,
      defaultNumen,
    ]);

  const {
    rawBalance:
      tokenInRawBalance,

    loading:
      tokenInBalanceLoading,

    error:
      tokenInBalanceError,

    reload:
      reloadTokenInBalance,
  } =
    useTokenBalance(
      effectiveTokenIn,
      account,
      isNumenNetwork
    );

  const {
    rawBalance:
      tokenOutRawBalance,

    loading:
      tokenOutBalanceLoading,

    error:
      tokenOutBalanceError,

    reload:
      reloadTokenOutBalance,
  } =
    useTokenBalance(
      tokenOut,
      account,
      isNumenNetwork
    );

  const effectiveSlippage =
    useMemo(() => {
      if (
        slippageMode ===
        "auto"
      ) {
        return 0.5;
      }

      const value =
        Number(
          customSlippage
        );

      if (
        !Number.isFinite(
          value
        )
      ) {
        return 0.5;
      }

      return Math.min(
        100,
        Math.max(
          0,
          value
        )
      );
    }, [
      slippageMode,
      customSlippage,
    ]);

  const {
    quote,
    loading:
      quoteLoading,
    error:
      quoteError,
  } =
    useSwapQuote({
      tokenIn:
        effectiveTokenIn,

      tokenOut,

      amountIn,

      slippage:
        effectiveSlippage,

      enabled:
        Boolean(
          effectiveTokenIn &&
          tokenOut &&
          isPositiveAmount(
            amountIn
          ) &&
          !isPending
        ),
    });

  const tokenInDisplayBalance =
    useMemo(() => {
      if (!account) {
        return "--";
      }

      if (
        tokenInBalanceLoading
      ) {
        return "...";
      }

      return formatDisplayBalance(
        tokenInRawBalance,
        effectiveTokenIn
          ?.decimals ?? 18,
        5
      );
    }, [
      account,
      tokenInBalanceLoading,
      tokenInRawBalance,
      effectiveTokenIn,
    ]);

  const tokenOutDisplayBalance =
    useMemo(() => {
      if (!account) {
        return "--";
      }

      if (
        tokenOutBalanceLoading
      ) {
        return "...";
      }

      return formatDisplayBalance(
        tokenOutRawBalance,
        tokenOut
          ?.decimals ?? 18,
        5
      );
    }, [
      account,
      tokenOutBalanceLoading,
      tokenOutRawBalance,
      tokenOut,
    ]);

  const amountOutDisplay =
    useMemo(() => {
      if (
        !tokenOut ||
        !amountIn
      ) {
        return "";
      }

      if (quoteLoading) {
        return "";
      }

      return (
        quote
          ?.amountOut
          ?.formatted ||
        ""
      );
    }, [
      tokenOut,
      amountIn,
      quote,
      quoteLoading,
    ]);

  const routeDisplay =
    useMemo(() => {
      if (
        !quote
          ?.pathSymbols
          ?.length
      ) {
        return "";
      }

      return quote
        .pathSymbols
        .join(" → ");
    }, [
      quote,
    ]);

  const insufficientBalance =
    useMemo(() => {
      if (
        !quote
          ?.amountIn
          ?.raw
      ) {
        return false;
      }

      try {
        return (
          BigInt(
            quote.amountIn.raw
          ) >
          tokenInRawBalance
        );
      } catch {
        return false;
      }
    }, [
      quote,
      tokenInRawBalance,
    ]);

  const handleAmountChange =
    useCallback(
      (event) => {
        const value =
          event
            .target
            .value;

        if (
          isValidAmount(
            value
          )
        ) {
          resetSwapState();

          setAmountIn(
            value
          );
        }
      },
      [
        resetSwapState,
      ]
    );

  const openTokenSelector =
    (side) => {
      if (isPending) {
        return;
      }

      setSettingsOpen(
        false
      );

      setTokenSelectorSide(
        side
      );
    };

  const closeTokenSelector =
    () => {
      setTokenSelectorSide(
        null
      );
    };

  const handleTokenSelect =
    useCallback(
      (token) => {
        resetSwapState();

        if (
          tokenSelectorSide ===
          "input"
        ) {
          if (
            tokenOut &&
            sameAddress(
              token.address,
              tokenOut.address
            )
          ) {
            setTokenOut(
              effectiveTokenIn
            );
          }

          setTokenIn(
            token
          );

          setAmountIn("");

          setTokenSelectorSide(
            null
          );

          return;
        }

        if (
          tokenSelectorSide ===
          "output"
        ) {
          if (
            effectiveTokenIn &&
            sameAddress(
              token.address,
              effectiveTokenIn
                .address
            )
          ) {
            setTokenIn(
              tokenOut ||
                DEFAULT_TOKEN
            );

            setAmountIn("");
          }

          setTokenOut(
            token
          );

          setTokenSelectorSide(
            null
          );
        }
      },
      [
        tokenSelectorSide,
        tokenOut,
        effectiveTokenIn,
        resetSwapState,
      ]
    );

  const handleReverseTokens =
    () => {
      if (
        !tokenOut ||
        isPending
      ) {
        return;
      }

      resetSwapState();

      const previousTokenIn =
        effectiveTokenIn;

      setTokenIn(
        tokenOut
      );

      setTokenOut(
        previousTokenIn
      );

      setAmountIn("");
    };

  const handleQuickAmount =
    (percent) => {
      if (
        tokenInRawBalance <=
          0n ||
        isPending
      ) {
        return;
      }

      resetSwapState();

      const percentage =
        BigInt(
          percent
        );

      const selectedRawAmount =
        percent === 100
          ? tokenInRawBalance
          : (
              tokenInRawBalance *
              percentage
            ) /
            100n;

      const formatted =
        formatTokenUnits(
          selectedRawAmount,
          effectiveTokenIn
            ?.decimals ?? 18
        );

      setAmountIn(
        formatted
      );
    };

  const handleToggleSettings =
    () => {
      if (isPending) {
        return;
      }

      setSettingsOpen(
        (current) =>
          !current
      );
    };

  const handleChartToggle =
    () => {
      setSettingsOpen(
        false
      );

      onToggleChart?.();
    };

  const handleReloadTokens =
    async () => {
      await reloadTokens();

      await Promise.all([
        reloadTokenInBalance(),
        reloadTokenOutBalance(),
      ]);
    };

  const handleSwap =
    useCallback(
      async () => {
        if (
          !account ||
          !quote ||
          !effectiveTokenIn ||
          isPending
        ) {
          return;
        }

        try {
          await executeSwap({
            account,

            tokenIn:
              effectiveTokenIn,

            tokenOut,

            amountIn,

            slippage:
              effectiveSlippage,

            quote,

            deadlineMinutes:
              deadline,
          });

          /*
           * Refresh balances after the
           * confirmed transaction.
           */
          await Promise.all([
            reloadTokenInBalance(),
            reloadTokenOutBalance(),
            reloadTokens(),
          ]);

          /*
           * Clearing the input prevents
           * accidentally submitting the
           * same quote twice.
           */
          setAmountIn("");
        } catch {
          /*
           * useSwap already converts and
           * exposes the transaction error.
           */
        }
      },
      [
        account,
        quote,
        effectiveTokenIn,
        tokenOut,
        amountIn,
        effectiveSlippage,
        deadline,
        isPending,
        executeSwap,
        reloadTokenInBalance,
        reloadTokenOutBalance,
        reloadTokens,
      ]
    );

  const getActionState =
    () => {
      if (!account) {
        return {
          label:
            connecting
              ? "Connecting..."
              : "Connect wallet",

          disabled:
            connecting,

          action:
            onConnect,
        };
      }

      if (
        !isNumenNetwork
      ) {
        return {
          label:
            "Switch network",

          disabled:
            false,

          action:
            onSwitchNetwork,
        };
      }

      if (!tokenOut) {
        return {
          label:
            "Select token",

          disabled:
            true,

          action:
            null,
        };
      }

      if (
        !isPositiveAmount(
          amountIn
        )
      ) {
        return {
          label:
            "Enter an amount",

          disabled:
            true,

          action:
            null,
        };
      }

      if (quoteLoading) {
        return {
          label:
            "Finding best route...",

          disabled:
            true,

          action:
            null,
        };
      }

      if (quoteError) {
        return {
          label:
            "No route available",

          disabled:
            true,

          action:
            null,
        };
      }

      if (!quote) {
        return {
          label:
            "Getting quote...",

          disabled:
            true,

          action:
            null,
        };
      }

      if (
        insufficientBalance
      ) {
        return {
          label:
            `Insufficient ${effectiveTokenIn.symbol} balance`,

          disabled:
            true,

          action:
            null,
        };
      }

      if (
        isCheckingAllowance
      ) {
        return {
          label:
            "Checking allowance...",

          disabled:
            true,

          action:
            null,
        };
      }

      if (isApproving) {
        return {
          label:
            `Approving ${effectiveTokenIn.symbol}...`,

          disabled:
            true,

          action:
            null,
        };
      }

      if (isSwapping) {
        return {
          label:
            "Swap pending...",

          disabled:
            true,

          action:
            null,
        };
      }

      return {
        label: "Swap",

        disabled: false,

        action:
          handleSwap,
      };
    };

  const actionState =
    getActionState();

  const selectedTokenForModal =
    tokenSelectorSide ===
    "input"
      ? effectiveTokenIn
      : tokenOut;

  const excludedTokenForModal =
    tokenSelectorSide ===
    "input"
      ? tokenOut
      : effectiveTokenIn;

  const explorerTxUrl =
    txHash
      ? `${NUMEN_NETWORK.blockExplorerUrls[0]}/tx/${txHash}`
      : "";

  return (
    <>
      <section className="swap-column">
        <div className="swap-toolbar">
          <div className="swap-tabs">
            <button
              type="button"
              className="swap-tab active"
            >
              Swap
            </button>
          </div>

          <div className="swap-tools">
            <button
              type="button"
              className={
                chartOpen
                  ? "toolbar-icon active"
                  : "toolbar-icon"
              }
              onClick={
                handleChartToggle
              }
              aria-label={
                chartOpen
                  ? "Hide market chart"
                  : "Show market chart"
              }
              title={
                chartOpen
                  ? "Hide market chart"
                  : "Show market chart"
              }
            >
              ↗
            </button>

            <div className="settings-container">
              <button
                type="button"
                className={
                  settingsOpen
                    ? "toolbar-icon active"
                    : "toolbar-icon"
                }
                onClick={
                  handleToggleSettings
                }
                disabled={
                  isPending
                }
                aria-label="Swap settings"
                title="Swap settings"
              >
                ⚙
              </button>

              <SwapSettings
                open={
                  settingsOpen
                }
                slippageMode={
                  slippageMode
                }
                customSlippage={
                  customSlippage
                }
                deadline={
                  deadline
                }
                onSlippageModeChange={
                  setSlippageMode
                }
                onCustomSlippageChange={
                  setCustomSlippage
                }
                onDeadlineChange={
                  setDeadline
                }
              />
            </div>
          </div>
        </div>

        <div className="swap-box">
          <div className="asset-panel">
            <div className="asset-label-row">
              <span>
                You pay
              </span>

              <QuickAmountButtons
                disabled={
                  !account ||
                  !isNumenNetwork ||
                  tokenInBalanceLoading ||
                  tokenInRawBalance <=
                    0n ||
                  isPending
                }
                onSelect={
                  handleQuickAmount
                }
              />
            </div>

            <div className="asset-main-row">
              <input
                className="swap-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={
                  amountIn
                }
                onChange={
                  handleAmountChange
                }
                disabled={
                  isPending
                }
                aria-label={`${effectiveTokenIn.symbol} amount`}
              />

              <div className="token-side">
                <button
                  type="button"
                  className="selected-token-button"
                  onClick={() =>
                    openTokenSelector(
                      "input"
                    )
                  }
                  disabled={
                    isPending
                  }
                >
                  <TokenIcon
                    token={
                      effectiveTokenIn
                    }
                    size={32}
                  />

                  <strong>
                    {
                      effectiveTokenIn
                        .symbol
                    }
                  </strong>

                  <span className="token-chevron">
                    ⌄
                  </span>
                </button>

                <button
                  type="button"
                  className="token-balance"
                  onClick={
                    reloadTokenInBalance
                  }
                  disabled={
                    isPending
                  }
                  title="Refresh balance"
                >
                  {tokenInDisplayBalance}{" "}
                  {
                    effectiveTokenIn
                      .symbol
                  }
                </button>
              </div>
            </div>

            <div className="usd-value">
              $0
            </div>

            {tokenInBalanceError && (
              <div className="balance-error">
                Could not load balance
              </div>
            )}
          </div>

          <div className="swap-direction">
            <button
              type="button"
              onClick={
                handleReverseTokens
              }
              disabled={
                !tokenOut ||
                isPending
              }
              aria-label="Reverse swap direction"
              title="Reverse swap direction"
            >
              ↓
            </button>
          </div>

          <div className="asset-panel output-panel">
            <div className="asset-label-row">
              <span>
                You receive
              </span>
            </div>

            <div className="asset-main-row">
              <input
                className="swap-amount"
                type="text"
                placeholder={
                  quoteLoading
                    ? "..."
                    : "0"
                }
                value={
                  amountOutDisplay
                }
                readOnly
                aria-label="Receive amount"
              />

              {!tokenOut ? (
                <button
                  type="button"
                  className="select-token-button"
                  onClick={() =>
                    openTokenSelector(
                      "output"
                    )
                  }
                  disabled={
                    isPending
                  }
                >
                  Select token

                  <span>
                    ⌄
                  </span>
                </button>
              ) : (
                <div className="token-side">
                  <button
                    type="button"
                    className="selected-token-button"
                    onClick={() =>
                      openTokenSelector(
                        "output"
                      )
                    }
                    disabled={
                      isPending
                    }
                  >
                    <TokenIcon
                      token={
                        tokenOut
                      }
                      size={32}
                    />

                    <strong>
                      {
                        tokenOut.symbol
                      }
                    </strong>

                    <span className="token-chevron">
                      ⌄
                    </span>
                  </button>

                  <button
                    type="button"
                    className="token-balance"
                    onClick={
                      reloadTokenOutBalance
                    }
                    disabled={
                      isPending
                    }
                    title="Refresh balance"
                  >
                    {tokenOutDisplayBalance}{" "}
                    {
                      tokenOut.symbol
                    }
                  </button>
                </div>
              )}
            </div>

            <div className="usd-value">
              $0
            </div>

            {tokenOutBalanceError && (
              <div className="balance-error">
                Could not load balance
              </div>
            )}
          </div>

          {quoteError && (
            <div className="wallet-message">
              {quoteError}
            </div>
          )}

          {quote && (
            <div className="quote-information">
              <div>
                <span>
                  Route
                </span>

                <strong>
                  {
                    routeDisplay
                  }
                </strong>
              </div>

              <div>
                <span>
                  Rate
                </span>

                <strong>
                  1{" "}
                  {
                    quote
                      .tokenIn
                      .symbol
                  }
                  {" = "}
                  {
                    Number(
                      quote.rate
                    ).toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits:
                          8,
                      }
                    )
                  }{" "}
                  {
                    quote
                      .tokenOut
                      .symbol
                  }
                </strong>
              </div>

              <div>
                <span>
                  Minimum received
                </span>

                <strong>
                  {
                    quote
                      .minimumAmountOut
                      .formatted
                  }{" "}
                  {
                    quote
                      .tokenOut
                      .symbol
                  }
                </strong>
              </div>

              <div>
                <span>
                  Max slippage
                </span>

                <strong>
                  {
                    quote.slippage
                  }
                  %
                </strong>
              </div>
            </div>
          )}

          {swapError && (
            <div
              className="wallet-message"
              style={{
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.5,
                color: "#dc2626",
                background: "rgba(220, 38, 38, 0.10)",
                border: "1px solid rgba(220, 38, 38, 0.18)",
              }}
            >
              {swapError}
            </div>
          )}

          {isSuccess && (
            <div
              className="wallet-message"
              style={{
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.5,
                color: "#16a34a",
                background: "rgba(22, 163, 74, 0.10)",
                border: "1px solid rgba(22, 163, 74, 0.18)",
              }}
            >
              ✓ Swap confirmed successfully.
            </div>
          )}

          {txHash && (
            <div
              className="wallet-message"
              style={{
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.5,
                color: isSuccess
                  ? "#16a34a"
                  : swapError
                    ? "#dc2626"
                    : "#b7791f",
                background: isSuccess
                  ? "rgba(22, 163, 74, 0.10)"
                  : swapError
                    ? "rgba(220, 38, 38, 0.10)"
                    : "rgba(183, 121, 31, 0.10)",
                border: isSuccess
                  ? "1px solid rgba(22, 163, 74, 0.18)"
                  : swapError
                    ? "1px solid rgba(220, 38, 38, 0.18)"
                    : "1px solid rgba(183, 121, 31, 0.18)",
              }}
            >
              Transaction:{" "}
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "inherit",
                  fontWeight: 700,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {txHash.slice(0, 10)}
                ...
                {txHash.slice(-8)}
                {" ↗"}
              </a>
            </div>
          )}

          <button
            type="button"
            className={
              actionState.disabled
                ? "primary-action disabled-action"
                : "primary-action"
            }
            disabled={
              actionState.disabled
            }
            onClick={
              actionState.action ||
              undefined
            }
          >
            {
              actionState.label
            }
          </button>
        </div>

        {walletError && (
          <div className="wallet-message">
            {walletError}
          </div>
        )}

        {tokensError && (
          <div className="wallet-message">
            Token list:{" "}
            {tokensError}
          </div>
        )}

        <div className="protocol-note">
          <NumenLogo
            size={20}
          />

          <span>
            Swaps are executed on
            Numen Network through
            NumenDEX liquidity pools.
          </span>
        </div>
      </section>

      <TokenSelector
        open={
          Boolean(
            tokenSelectorSide
          )
        }
        tokens={
          allTokens
        }
        loading={
          tokensLoading
        }
        error={
          tokensError
        }
        selectedToken={
          selectedTokenForModal
        }
        excludedToken={
          excludedTokenForModal
        }
        onSelect={
          handleTokenSelect
        }
        onClose={
          closeTokenSelector
        }
        onRetry={
          handleReloadTokens
        }
      />
    </>
  );
}

export default SwapCard;