import "./AddLiquidityPage.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatUnits,
} from "ethers";

import NumenLogo from "../common/NumenLogo";
import TokenSelector from "../swap/TokenSelector";

import useTokens from "../../hooks/useTokens";
import useTokenBalance from "../../hooks/useTokenBalance";
import useLiquidity from "../../hooks/useLiquidity";

import {
  DEFAULT_TOKEN,
  NUMEN_NETWORK,
  TOKEN_ADDRESSES,
} from "../../config/network";

import {
  formatDisplayBalance,
  formatTokenUnits,
} from "../../services/balance";

import {
  calculateCounterpartAmountRaw,
  parseLiquidityAmount,
} from "../../services/liquidity";

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

function isValidAmount(
  value
) {
  return (
    value === "" ||
    /^\d*\.?\d*$/.test(value)
  );
}

function isPositiveAmount(
  value
) {
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

  try {
    return (
      Number(amount) > 0
    );
  } catch {
    return false;
  }
}

function normalizeTokenObject(
  token,
  allTokens
) {
  if (!token) {
    return null;
  }

  const address =
    typeof token === "string"
      ? token
      : token.address;

  if (!address) {
    return null;
  }

  const existing =
    allTokens.find(
      (item) =>
        sameAddress(
          item?.address,
          address
        )
    );

  if (existing) {
    return existing;
  }

  if (
    typeof token ===
    "object"
  ) {
    return {
      address,
      symbol:
        token.symbol ||
        "TOKEN",
      name:
        token.name ||
        token.symbol ||
        "Token",
      decimals:
        Number(
          token.decimals ??
            18
        ),
    };
  }

  return {
    address,
    symbol: "TOKEN",
    name: "Token",
    decimals: 18,
  };
}

function resolvePoolToken(
  pool,
  side,
  allTokens
) {
  if (!pool) {
    return null;
  }

  const key =
    side === 0
      ? "token0"
      : "token1";

  const addressKey =
    side === 0
      ? "token0Address"
      : "token1Address";

  const symbolKey =
    side === 0
      ? "token0Symbol"
      : "token1Symbol";

  const decimalsKey =
    side === 0
      ? "token0Decimals"
      : "token1Decimals";

  const value =
    pool[key];

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return normalizeTokenObject(
      value,
      allTokens
    );
  }

  const address =
    typeof value ===
    "string"
      ? value
      : pool[addressKey];

  if (!address) {
    return null;
  }

  const existing =
    allTokens.find(
      (token) =>
        sameAddress(
          token?.address,
          address
        )
    );

  if (existing) {
    return existing;
  }

  return {
    address,
    symbol:
      pool[symbolKey] ||
      "TOKEN",
    name:
      pool[symbolKey] ||
      "Token",
    decimals:
      Number(
        pool[decimalsKey] ??
          18
      ),
  };
}

function TokenIcon({
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

  if (token.logoURI) {
    return (
      <img
        src={token.logoURI}
        alt={
          token.symbol ||
          "Token"
        }
        className="liquidity-token-logo"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <span
      className="liquidity-generic-token"
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

function AddLiquidityPage({
  account,
  connecting,
  isNumenNetwork,
  walletError,
  onConnect,
  onSwitchNetwork,
  initialPool = null,
  onBack,
  onSuccess,
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
    status,
    error:
      liquidityError,
    txHash,
    approvalToken,

    isCheckingAllowance,
    isApproving,
    isAddingLiquidity,
    isPending,
    isSuccess,

    loadPair,
    executeAddLiquidity,
    resetLiquidityState,
  } = useLiquidity();

  const allTokens =
    useMemo(() => {
      const map =
        new Map();

      map.set(
        DEFAULT_TOKEN.address
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
    tokenA,
    setTokenA,
  ] =
    useState(
      DEFAULT_TOKEN
    );

  const [
    tokenB,
    setTokenB,
  ] =
    useState(null);

  const [
    amountA,
    setAmountA,
  ] =
    useState("");

  const [
    amountB,
    setAmountB,
  ] =
    useState("");

  const [
    tokenSelectorSide,
    setTokenSelectorSide,
  ] =
    useState(null);

  const [
    pairInfo,
    setPairInfo,
  ] =
    useState(null);

  const [
    pairLoading,
    setPairLoading,
  ] =
    useState(false);

  const [
    pairError,
    setPairError,
  ] =
    useState("");

  const [
    slippage,
    setSlippage,
  ] =
    useState("0.5");

  const [
    deadline,
    setDeadline,
  ] =
    useState("30");

  const [
    lastEditedSide,
    setLastEditedSide,
  ] =
    useState("A");

  const effectiveTokenA =
    useMemo(() => {
      if (
        sameAddress(
          tokenA?.address,
          TOKEN_ADDRESSES.NUMN
        )
      ) {
        return defaultNumen;
      }

      return tokenA;
    }, [
      tokenA,
      defaultNumen,
    ]);

  /*
   * Pool Detail -> Add Liquidity
   *
   * Preselect the pool's two tokens.
   */
  useEffect(() => {
    if (
      !initialPool ||
      allTokens.length === 0
    ) {
      return;
    }

    const initialToken0 =
      resolvePoolToken(
        initialPool,
        0,
        allTokens
      );

    const initialToken1 =
      resolvePoolToken(
        initialPool,
        1,
        allTokens
      );

    if (
      initialToken0 &&
      initialToken1
    ) {
      setTokenA(
        initialToken0
      );

      setTokenB(
        initialToken1
      );

      setAmountA("");
      setAmountB("");

      resetLiquidityState();
    }
  }, [
    initialPool,
    allTokens,
    resetLiquidityState,
  ]);

  /*
   * If the page was opened from
   * "New position", NUMN remains
   * the default first token.
   */
  useEffect(() => {
    if (
      initialPool
    ) {
      return;
    }

    setTokenA(
      defaultNumen
    );
  }, [
    defaultNumen,
    initialPool,
  ]);

  /*
   * Read Factory + Pair reserves whenever
   * the selected token pair changes.
   */
  useEffect(() => {
    let cancelled =
      false;

    const run =
      async () => {
        if (
          !effectiveTokenA?.address ||
          !tokenB?.address ||
          sameAddress(
            effectiveTokenA.address,
            tokenB.address
          )
        ) {
          setPairInfo(null);
          setPairError("");
          return;
        }

        if (
          !isNumenNetwork
        ) {
          setPairInfo(null);
          return;
        }

        setPairLoading(true);
        setPairError("");

        try {
          const result =
            await loadPair({
              tokenA:
                effectiveTokenA,
              tokenB,
            });

          if (!cancelled) {
            setPairInfo(
              result
            );
          }
        } catch (
          error
        ) {
          if (!cancelled) {
            setPairInfo(null);

            setPairError(
              error?.shortMessage ||
              error?.message ||
              "Could not load pool."
            );
          }
        } finally {
          if (!cancelled) {
            setPairLoading(false);
          }
        }
      };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    effectiveTokenA,
    tokenB,
    isNumenNetwork,
    loadPair,
  ]);

  const {
    rawBalance:
      tokenARawBalance,

    loading:
      tokenABalanceLoading,

    error:
      tokenABalanceError,

    reload:
      reloadTokenABalance,
  } =
    useTokenBalance(
      effectiveTokenA,
      account,
      isNumenNetwork
    );

  const {
    rawBalance:
      tokenBRawBalance,

    loading:
      tokenBBalanceLoading,

    error:
      tokenBBalanceError,

    reload:
      reloadTokenBBalance,
  } =
    useTokenBalance(
      tokenB,
      account,
      isNumenNetwork
    );

  const tokenADisplayBalance =
    useMemo(() => {
      if (!account) {
        return "--";
      }

      if (
        tokenABalanceLoading
      ) {
        return "...";
      }

      return formatDisplayBalance(
        tokenARawBalance,
        effectiveTokenA
          ?.decimals ?? 18,
        5
      );
    }, [
      account,
      tokenABalanceLoading,
      tokenARawBalance,
      effectiveTokenA,
    ]);

  const tokenBDisplayBalance =
    useMemo(() => {
      if (!account) {
        return "--";
      }

      if (
        tokenBBalanceLoading
      ) {
        return "...";
      }

      return formatDisplayBalance(
        tokenBRawBalance,
        tokenB
          ?.decimals ?? 18,
        5
      );
    }, [
      account,
      tokenBBalanceLoading,
      tokenBRawBalance,
      tokenB,
    ]);

  const amountARaw =
    useMemo(() => {
      if (
        !effectiveTokenA ||
        !isPositiveAmount(
          amountA
        )
      ) {
        return 0n;
      }

      try {
        return parseLiquidityAmount({
          amount:
            amountA,
          token:
            effectiveTokenA,
        });
      } catch {
        return 0n;
      }
    }, [
      amountA,
      effectiveTokenA,
    ]);

  const amountBRaw =
    useMemo(() => {
      if (
        !tokenB ||
        !isPositiveAmount(
          amountB
        )
      ) {
        return 0n;
      }

      try {
        return parseLiquidityAmount({
          amount:
            amountB,
          token:
            tokenB,
        });
      } catch {
        return 0n;
      }
    }, [
      amountB,
      tokenB,
    ]);

  const insufficientA =
    amountARaw >
    tokenARawBalance;

  const insufficientB =
    amountBRaw >
    tokenBRawBalance;

  const poolHasLiquidity =
    Boolean(
      pairInfo?.exists &&
      pairInfo?.reserveA >
        0n &&
      pairInfo?.reserveB >
        0n
    );

  /*
   * Existing pool:
   * entering Token A automatically
   * calculates Token B using reserves.
   */
  const calculateBFromA =
    useCallback(
      (
        nextAmountA
      ) => {
        if (
          !poolHasLiquidity ||
          !effectiveTokenA ||
          !tokenB ||
          !isPositiveAmount(
            nextAmountA
          )
        ) {
          return "";
        }

        try {
          const rawA =
            parseLiquidityAmount({
              amount:
                nextAmountA,
              token:
                effectiveTokenA,
            });

          const rawB =
            calculateCounterpartAmountRaw({
              amountRaw:
                rawA,
              reserveInput:
                pairInfo.reserveA,
              reserveOutput:
                pairInfo.reserveB,
            });

          return formatTokenUnits(
            rawB,
            tokenB.decimals ??
              18
          );
        } catch {
          return "";
        }
      },
      [
        poolHasLiquidity,
        effectiveTokenA,
        tokenB,
        pairInfo,
      ]
    );

  /*
   * Existing pool:
   * entering Token B automatically
   * calculates Token A using reserves.
   */
  const calculateAFromB =
    useCallback(
      (
        nextAmountB
      ) => {
        if (
          !poolHasLiquidity ||
          !effectiveTokenA ||
          !tokenB ||
          !isPositiveAmount(
            nextAmountB
          )
        ) {
          return "";
        }

        try {
          const rawB =
            parseLiquidityAmount({
              amount:
                nextAmountB,
              token:
                tokenB,
            });

          const rawA =
            calculateCounterpartAmountRaw({
              amountRaw:
                rawB,
              reserveInput:
                pairInfo.reserveB,
              reserveOutput:
                pairInfo.reserveA,
            });

          return formatTokenUnits(
            rawA,
            effectiveTokenA
              .decimals ??
              18
          );
        } catch {
          return "";
        }
      },
      [
        poolHasLiquidity,
        effectiveTokenA,
        tokenB,
        pairInfo,
      ]
    );

  /*
   * When pair reserves arrive after the
   * user has already entered one side,
   * calculate the other side.
   */
  useEffect(() => {
    if (
      !poolHasLiquidity
    ) {
      return;
    }

    if (
      lastEditedSide ===
        "A" &&
      isPositiveAmount(
        amountA
      )
    ) {
      setAmountB(
        calculateBFromA(
          amountA
        )
      );

      return;
    }

    if (
      lastEditedSide ===
        "B" &&
      isPositiveAmount(
        amountB
      )
    ) {
      setAmountA(
        calculateAFromB(
          amountB
        )
      );
    }
  }, [
    poolHasLiquidity,
    pairInfo,
    lastEditedSide,
    amountA,
    amountB,
    calculateBFromA,
    calculateAFromB,
  ]);

  const handleAmountAChange =
    useCallback(
      (event) => {
        const value =
          event.target.value;

        if (
          !isValidAmount(
            value
          )
        ) {
          return;
        }

        resetLiquidityState();

        setLastEditedSide(
          "A"
        );

        setAmountA(
          value
        );

        if (
          poolHasLiquidity
        ) {
          setAmountB(
            calculateBFromA(
              value
            )
          );
        }
      },
      [
        poolHasLiquidity,
        calculateBFromA,
        resetLiquidityState,
      ]
    );

  const handleAmountBChange =
    useCallback(
      (event) => {
        const value =
          event.target.value;

        if (
          !isValidAmount(
            value
          )
        ) {
          return;
        }

        resetLiquidityState();

        setLastEditedSide(
          "B"
        );

        setAmountB(
          value
        );

        if (
          poolHasLiquidity
        ) {
          setAmountA(
            calculateAFromB(
              value
            )
          );
        }
      },
      [
        poolHasLiquidity,
        calculateAFromB,
        resetLiquidityState,
      ]
    );

  const handleMaxA =
    () => {
      if (
        tokenARawBalance <=
          0n ||
        isPending
      ) {
        return;
      }

      resetLiquidityState();

      const value =
        formatTokenUnits(
          tokenARawBalance,
          effectiveTokenA
            ?.decimals ?? 18
        );

      setLastEditedSide(
        "A"
      );

      setAmountA(
        value
      );

      if (
        poolHasLiquidity
      ) {
        setAmountB(
          calculateBFromA(
            value
          )
        );
      }
    };

  const handleMaxB =
    () => {
      if (
        tokenBRawBalance <=
          0n ||
        isPending
      ) {
        return;
      }

      resetLiquidityState();

      const value =
        formatTokenUnits(
          tokenBRawBalance,
          tokenB?.decimals ??
            18
        );

      setLastEditedSide(
        "B"
      );

      setAmountB(
        value
      );

      if (
        poolHasLiquidity
      ) {
        setAmountA(
          calculateAFromB(
            value
          )
        );
      }
    };

  const handleTokenSelect =
    useCallback(
      (token) => {
        resetLiquidityState();

        setAmountA("");
        setAmountB("");

        if (
          tokenSelectorSide ===
          "A"
        ) {
          setTokenA(
            token
          );
        }

        if (
          tokenSelectorSide ===
          "B"
        ) {
          setTokenB(
            token
          );
        }

        setTokenSelectorSide(
          null
        );
      },
      [
        tokenSelectorSide,
        resetLiquidityState,
      ]
    );

  const selectedTokenForModal =
    tokenSelectorSide ===
      "A"
      ? effectiveTokenA
      : tokenB;

  const excludedTokenForModal =
    tokenSelectorSide ===
      "A"
      ? tokenB
      : effectiveTokenA;

  const poolPrice =
    useMemo(() => {
      if (
        !poolHasLiquidity
      ) {
        return null;
      }

      try {
        const reserveA =
          Number(
            formatUnits(
              pairInfo.reserveA,
              effectiveTokenA
                ?.decimals ??
                18
            )
          );

        const reserveB =
          Number(
            formatUnits(
              pairInfo.reserveB,
              tokenB
                ?.decimals ??
                18
            )
          );

        if (
          !Number.isFinite(
            reserveA
          ) ||
          !Number.isFinite(
            reserveB
          ) ||
          reserveA <= 0
        ) {
          return null;
        }

        return (
          reserveB /
          reserveA
        );
      } catch {
        return null;
      }
    }, [
      poolHasLiquidity,
      pairInfo,
      effectiveTokenA,
      tokenB,
    ]);

  const handleSubmit =
    useCallback(
      async () => {
        if (
          !account ||
          !effectiveTokenA ||
          !tokenB ||
          amountARaw <= 0n ||
          amountBRaw <= 0n ||
          isPending
        ) {
          return;
        }

        try {
          const result =
            await executeAddLiquidity({
              account,

              tokenA:
                effectiveTokenA,

              tokenB,

              amountA,
              amountB,

              amountARaw,
              amountBRaw,

              slippage:
                Number(
                  slippage
                ),

              deadlineMinutes:
                Number(
                  deadline
                ),
            });

          await Promise.all([
            reloadTokenABalance(),
            reloadTokenBBalance(),
            reloadTokens(),
          ]);

          onSuccess?.(
            result
          );
        } catch {
          /*
           * useLiquidity exposes
           * the readable error.
           */
        }
      },
      [
        account,
        effectiveTokenA,
        tokenB,
        amountA,
        amountB,
        amountARaw,
        amountBRaw,
        slippage,
        deadline,
        isPending,
        executeAddLiquidity,
        reloadTokenABalance,
        reloadTokenBBalance,
        reloadTokens,
        onSuccess,
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
          disabled: false,
          action:
            onSwitchNetwork,
        };
      }

      if (!tokenB) {
        return {
          label:
            "Select two tokens",
          disabled: true,
          action: null,
        };
      }

      if (
        pairLoading
      ) {
        return {
          label:
            "Loading pool...",
          disabled: true,
          action: null,
        };
      }

      if (
        !isPositiveAmount(
          amountA
        ) ||
        !isPositiveAmount(
          amountB
        )
      ) {
        return {
          label:
            "Enter amounts",
          disabled: true,
          action: null,
        };
      }

      if (
        insufficientA
      ) {
        return {
          label:
            `Insufficient ${effectiveTokenA.symbol} balance`,
          disabled: true,
          action: null,
        };
      }

      if (
        insufficientB
      ) {
        return {
          label:
            `Insufficient ${tokenB.symbol} balance`,
          disabled: true,
          action: null,
        };
      }

      if (
        isCheckingAllowance
      ) {
        return {
          label:
            "Checking allowances...",
          disabled: true,
          action: null,
        };
      }

      if (
        isApproving
      ) {
        return {
          label:
            `Approving ${approvalToken}...`,
          disabled: true,
          action: null,
        };
      }

      if (
        isAddingLiquidity
      ) {
        return {
          label:
            "Adding liquidity...",
          disabled: true,
          action: null,
        };
      }

      return {
        label:
          pairInfo?.exists
            ? "Add liquidity"
            : "Create pool & add liquidity",
        disabled: false,
        action:
          handleSubmit,
      };
    };

  const actionState =
    getActionState();

  const explorerTxUrl =
    txHash
      ? `${NUMEN_NETWORK.blockExplorerUrls[0]}/tx/${txHash}`
      : "";

  return (
    <>
      <section className="add-liquidity-page">
        <div className="liquidity-breadcrumb">
          <button
            type="button"
            onClick={onBack}
          >
            Pools
          </button>

          <span>›</span>

          <strong>
            Add liquidity
          </strong>
        </div>

        <div className="liquidity-layout">
          <div className="liquidity-main-card">
            <div className="liquidity-card-header">
              <div>
                <h1>
                  Add liquidity
                </h1>

                <p>
                  Supply two tokens and earn
                  fees from NumenDEX swaps.
                </p>
              </div>

              <button
                type="button"
                className="liquidity-back-button"
                onClick={onBack}
              >
                ×
              </button>
            </div>

            <div className="liquidity-section-title">
              <span>
                Deposit amounts
              </span>

              {pairLoading && (
                <small>
                  Loading pool...
                </small>
              )}
            </div>

            <div className="liquidity-token-panel">
              <div className="liquidity-token-panel-top">
                <span>
                  Token 1
                </span>

                <button
                  type="button"
                  className="liquidity-balance-button"
                  onClick={
                    reloadTokenABalance
                  }
                  disabled={
                    isPending
                  }
                >
                  Balance:{" "}
                  {tokenADisplayBalance}
                </button>
              </div>

              <div className="liquidity-token-main-row">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amountA}
                  onChange={
                    handleAmountAChange
                  }
                  disabled={
                    isPending
                  }
                />

                <button
                  type="button"
                  className="liquidity-token-button"
                  onClick={() =>
                    setTokenSelectorSide(
                      "A"
                    )
                  }
                  disabled={
                    isPending
                  }
                >
                  <TokenIcon
                    token={
                      effectiveTokenA
                    }
                  />

                  <strong>
                    {
                      effectiveTokenA
                        ?.symbol ||
                      "Select"
                    }
                  </strong>

                  <span>
                    ⌄
                  </span>
                </button>
              </div>

              <div className="liquidity-panel-footer">
                <span>
                  USD value unavailable
                </span>

                <button
                  type="button"
                  onClick={
                    handleMaxA
                  }
                  disabled={
                    !account ||
                    tokenARawBalance <=
                      0n ||
                    isPending
                  }
                >
                  Max
                </button>
              </div>

              {tokenABalanceError && (
                <div className="liquidity-inline-error">
                  Could not load balance.
                </div>
              )}
            </div>

            <div className="liquidity-plus">
              +
            </div>

            <div className="liquidity-token-panel">
              <div className="liquidity-token-panel-top">
                <span>
                  Token 2
                </span>

                {tokenB && (
                  <button
                    type="button"
                    className="liquidity-balance-button"
                    onClick={
                      reloadTokenBBalance
                    }
                    disabled={
                      isPending
                    }
                  >
                    Balance:{" "}
                    {tokenBDisplayBalance}
                  </button>
                )}
              </div>

              <div className="liquidity-token-main-row">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amountB}
                  onChange={
                    handleAmountBChange
                  }
                  disabled={
                    isPending ||
                    !tokenB
                  }
                />

                {tokenB ? (
                  <button
                    type="button"
                    className="liquidity-token-button"
                    onClick={() =>
                      setTokenSelectorSide(
                        "B"
                      )
                    }
                    disabled={
                      isPending
                    }
                  >
                    <TokenIcon
                      token={
                        tokenB
                      }
                    />

                    <strong>
                      {
                        tokenB.symbol
                      }
                    </strong>

                    <span>
                      ⌄
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="liquidity-select-token"
                    onClick={() =>
                      setTokenSelectorSide(
                        "B"
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
                )}
              </div>

              <div className="liquidity-panel-footer">
                <span>
                  USD value unavailable
                </span>

                {tokenB && (
                  <button
                    type="button"
                    onClick={
                      handleMaxB
                    }
                    disabled={
                      !account ||
                      tokenBRawBalance <=
                        0n ||
                      isPending
                    }
                  >
                    Max
                  </button>
                )}
              </div>

              {tokenBBalanceError && (
                <div className="liquidity-inline-error">
                  Could not load balance.
                </div>
              )}
            </div>

            {pairError && (
              <div className="liquidity-message liquidity-message-error">
                {pairError}
              </div>
            )}

            {liquidityError && (
              <div className="liquidity-message liquidity-message-error">
                {liquidityError}
              </div>
            )}

            {isSuccess && (
              <div className="liquidity-message liquidity-message-success">
                ✓ Liquidity added successfully.
              </div>
            )}

            {txHash && (
              <div className="liquidity-message liquidity-message-transaction">
                Transaction:{" "}
                <a
                  href={
                    explorerTxUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {txHash.slice(
                    0,
                    10
                  )}
                  ...
                  {txHash.slice(
                    -8
                  )}
                  {" ↗"}
                </a>
              </div>
            )}

            {walletError && (
              <div className="liquidity-message liquidity-message-error">
                {walletError}
              </div>
            )}

            {tokensError && (
              <div className="liquidity-message liquidity-message-error">
                Token list:{" "}
                {tokensError}
              </div>
            )}

            <button
              type="button"
              className={
                actionState.disabled
                  ? "liquidity-primary-action disabled"
                  : "liquidity-primary-action"
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

          <aside className="liquidity-sidebar">
            <div className="liquidity-info-card">
              <h2>
                Pool
              </h2>

              {!tokenB ? (
                <p className="liquidity-muted">
                  Select two tokens to
                  view pool information.
                </p>
              ) : (
                <>
                  <div className="liquidity-pair-title">
                    <div className="liquidity-pair-icons">
                      <TokenIcon
                        token={
                          effectiveTokenA
                        }
                        size={30}
                      />

                      <TokenIcon
                        token={
                          tokenB
                        }
                        size={30}
                      />
                    </div>

                    <strong>
                      {
                        effectiveTokenA
                          ?.symbol
                      }
                      /
                      {
                        tokenB.symbol
                      }
                    </strong>
                  </div>

                  <div className="liquidity-info-row">
                    <span>
                      Pool status
                    </span>

                    <strong>
                      {pairLoading
                        ? "Loading..."
                        : pairInfo?.exists
                          ? "Existing pool"
                          : "New pool"}
                    </strong>
                  </div>

                  <div className="liquidity-info-row">
                    <span>
                      Fee tier
                    </span>

                    <strong>
                      0.30%
                    </strong>
                  </div>

                  <div className="liquidity-info-row">
                    <span>
                      Network
                    </span>

                    <strong>
                      Numen
                    </strong>
                  </div>

                  {poolPrice !==
                    null && (
                    <div className="liquidity-info-row">
                      <span>
                        Current price
                      </span>

                      <strong>
                        1{" "}
                        {
                          effectiveTokenA
                            .symbol
                        }
                        {" = "}
                        {poolPrice.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits:
                              8,
                          }
                        )}{" "}
                        {
                          tokenB.symbol
                        }
                      </strong>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="liquidity-info-card">
              <h2>
                Transaction settings
              </h2>

              <label className="liquidity-setting">
                <span>
                  Max slippage
                </span>

                <div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={
                      slippage
                    }
                    onChange={(
                      event
                    ) =>
                      setSlippage(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isPending
                    }
                  />

                  <span>
                    %
                  </span>
                </div>
              </label>

              <label className="liquidity-setting">
                <span>
                  Transaction deadline
                </span>

                <div>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={
                      deadline
                    }
                    onChange={(
                      event
                    ) =>
                      setDeadline(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isPending
                    }
                  />

                  <span>
                    min
                  </span>
                </div>
              </label>
            </div>

            {status !==
              "idle" &&
              !isSuccess && (
                <div className="liquidity-info-card liquidity-status-card">
                  <h2>
                    Transaction
                  </h2>

                  <p>
                    {isCheckingAllowance &&
                      "Checking token allowances..."}

                    {isApproving &&
                      `Approve ${approvalToken} in your wallet.`}

                    {isAddingLiquidity &&
                      "Confirming liquidity transaction..."}
                  </p>
                </div>
              )}
          </aside>
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
        onClose={() =>
          setTokenSelectorSide(
            null
          )
        }
        onRetry={
          reloadTokens
        }
      />
    </>
  );
}

export default AddLiquidityPage;