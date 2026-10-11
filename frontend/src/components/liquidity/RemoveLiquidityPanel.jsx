import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatUnits,
} from "ethers";

import "./RemoveLiquidityPanel.css";

import useRemoveLiquidity from "../../hooks/useRemoveLiquidity";

import {
  calculateRemovePreview,
  getRemoveLiquidityInfo,
} from "../../services/removeLiquidity";

function formatTokenAmount(
  value,
  decimals = 18,
  maximumFractionDigits = 8
) {
  try {
    const formatted =
      formatUnits(
        BigInt(value || 0),
        Number(decimals || 18)
      );

    const numeric =
      Number(formatted);

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
      numeric < 0.000001
    ) {
      return numeric.toExponential(
        4
      );
    }

    return numeric.toLocaleString(
      "en-US",
      {
        maximumFractionDigits,
      }
    );
  } catch {
    return "0";
  }
}

function shortHash(
  hash
) {
  if (!hash) {
    return "";
  }

  if (
    hash.length <= 18
  ) {
    return hash;
  }

  return `${hash.slice(
    0,
    10
  )}...${hash.slice(-8)}`;
}

function RemoveLiquidityPanel({
  pairAddress,
  token0,
  token1,
  account,
  onClose,
  onSuccess,
}) {
  const [
    info,
    setInfo,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    percentage,
    setPercentage,
  ] =
    useState(25);

  const [
    slippage,
    setSlippage,
  ] =
    useState(0.5);

  const [
    deadlineMinutes,
    setDeadlineMinutes,
  ] =
    useState(30);

  const {
    error,
    txHash,
    approvalTxHash,

    isCheckingAllowance,
    isApproving,
    isRemovingLiquidity,
    isPending,
    isSuccess,
    isError,

    executeRemoveLiquidity,
    resetRemoveLiquidityState,
  } =
    useRemoveLiquidity();

  const token0Decimals =
    Number(
      token0?.decimals ??
        18
    );

  const token1Decimals =
    Number(
      token1?.decimals ??
        18
    );

  const token0Symbol =
    token0?.symbol ||
    "Token 0";

  const token1Symbol =
    token1?.symbol ||
    "Token 1";

  const loadPosition =
    useCallback(
      async () => {
        if (
          !pairAddress ||
          !account
        ) {
          setInfo(null);
          return;
        }

        setLoading(true);
        setLoadError("");

        try {
          const result =
            await getRemoveLiquidityInfo({
              pairAddress,
              account,
            });

          setInfo(result);
        } catch (loadPositionError) {
          console.error(
            "Remove liquidity info error:",
            loadPositionError
          );

          setInfo(null);

          setLoadError(
            loadPositionError?.shortMessage ||
              loadPositionError?.reason ||
              loadPositionError?.message ||
              "Unable to load your liquidity position."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        pairAddress,
        account,
      ]
    );

  useEffect(
    () => {
      resetRemoveLiquidityState();

      setPercentage(25);

      loadPosition();
    },
    [
      pairAddress,
      account,
      loadPosition,
      resetRemoveLiquidityState,
    ]
  );

  const preview =
    useMemo(
      () => {
        if (!info) {
          return {
            liquidity: 0n,
            amount0: 0n,
            amount1: 0n,
          };
        }

        try {
          return calculateRemovePreview({
            lpBalance:
              info.lpBalance,

            totalSupply:
              info.totalSupply,

            reserve0:
              info.reserve0,

            reserve1:
              info.reserve1,

            percentage:
              Number(
                percentage
              ),
          });
        } catch {
          return {
            liquidity: 0n,
            amount0: 0n,
            amount1: 0n,
          };
        }
      },
      [
        info,
        percentage,
      ]
    );

  const lpBalanceFormatted =
    useMemo(
      () => {
        if (!info) {
          return "0";
        }

        return formatTokenAmount(
          info.lpBalance,
          18,
          8
        );
      },
      [info]
    );

  const amount0Formatted =
    useMemo(
      () =>
        formatTokenAmount(
          preview.amount0,
          token0Decimals,
          8
        ),
      [
        preview.amount0,
        token0Decimals,
      ]
    );

  const amount1Formatted =
    useMemo(
      () =>
        formatTokenAmount(
          preview.amount1,
          token1Decimals,
          8
        ),
      [
        preview.amount1,
        token1Decimals,
      ]
    );

  const hasLiquidity =
    Boolean(
      info &&
        BigInt(
          info.lpBalance ||
            0
        ) > 0n
    );

  const canRemove =
    Boolean(
      account &&
        info &&
        hasLiquidity &&
        preview.liquidity >
          0n &&
        !isPending
    );

  const handlePercentage =
    (value) => {
      if (isPending) {
        return;
      }

      resetRemoveLiquidityState();

      setPercentage(
        Number(value)
      );
    };

  const handleRemove =
    async () => {
      if (
        !canRemove
      ) {
        return;
      }

      try {
        const result =
          await executeRemoveLiquidity({
            account,

            pairAddress,

            token0:
              info.token0,

            token1:
              info.token1,

            liquidity:
              preview.liquidity,

            expectedAmount0:
              preview.amount0,

            expectedAmount1:
              preview.amount1,

            slippage:
              Number(
                slippage
              ),

            deadlineMinutes:
              Number(
                deadlineMinutes
              ),

            recipient:
              account,
          });

        await loadPosition();

        if (
          typeof onSuccess ===
          "function"
        ) {
          onSuccess(result);
        }
      } catch (removeError) {
        console.error(
          "Remove liquidity failed:",
          removeError
        );
      }
    };

  const getButtonText =
    () => {
      if (!account) {
        return "Connect wallet";
      }

      if (loading) {
        return "Loading position...";
      }

      if (!hasLiquidity) {
        return "No liquidity position";
      }

      if (
        isCheckingAllowance
      ) {
        return "Checking allowance...";
      }

      if (isApproving) {
        return "Approve LP token in wallet";
      }

      if (
        isRemovingLiquidity
      ) {
        return "Removing liquidity...";
      }

      if (isSuccess) {
        return "Liquidity removed";
      }

      return "Remove liquidity";
    };

  return (
    <div
      className="remove-liquidity-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isPending
        ) {
          onClose?.();
        }
      }}
    >
      <div className="remove-liquidity-panel">
        <div className="remove-liquidity-header">
          <div>
            <span className="remove-liquidity-eyebrow">
              NumenDEX
            </span>

            <h2>
              Remove liquidity
            </h2>

            <p>
              Choose how much of your liquidity position you want to remove.
            </p>
          </div>

          <button
            type="button"
            className="remove-liquidity-close"
            onClick={() =>
              onClose?.()
            }
            disabled={
              isPending
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="remove-liquidity-pair">
          <div className="remove-liquidity-pair-name">
            <span>
              {token0Symbol}
            </span>

            <span className="remove-liquidity-pair-divider">
              /
            </span>

            <span>
              {token1Symbol}
            </span>
          </div>

          <span className="remove-liquidity-version">
            v2 · 0.30%
          </span>
        </div>

        {!account && (
          <div className="remove-liquidity-message remove-liquidity-message-neutral">
            Connect your wallet to view and remove your liquidity position.
          </div>
        )}

        {loadError && (
          <div className="remove-liquidity-message remove-liquidity-message-error">
            <strong>
              Unable to load position
            </strong>

            <span>
              {loadError}
            </span>
          </div>
        )}

        {loading && (
          <div className="remove-liquidity-loading">
            Loading your liquidity position...
          </div>
        )}

        {!loading &&
          account &&
          info && (
            <>
              <div className="remove-liquidity-balance-row">
                <span>
                  Your LP balance
                </span>

                <strong>
                  {lpBalanceFormatted}
                </strong>
              </div>

              <div className="remove-liquidity-section">
                <div className="remove-liquidity-section-title">
                  <span>
                    Amount to remove
                  </span>

                  <strong>
                    {Number(
                      percentage
                    ).toFixed(
                      Number(
                        percentage
                      ) %
                        1 ===
                        0
                        ? 0
                        : 2
                    )}
                    %
                  </strong>
                </div>

                <div className="remove-liquidity-percentage-buttons">
                  {[
                    25,
                    50,
                    75,
                    100,
                  ].map(
                    (
                      value
                    ) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        className={
                          Number(
                            percentage
                          ) ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          handlePercentage(
                            value
                          )
                        }
                        disabled={
                          isPending
                        }
                      >
                        {value ===
                        100
                          ? "Max"
                          : `${value}%`}
                      </button>
                    )
                  )}
                </div>

                <input
                  className="remove-liquidity-range"
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={
                    percentage
                  }
                  disabled={
                    isPending
                  }
                  onChange={(
                    event
                  ) =>
                    handlePercentage(
                      event
                        .target
                        .value
                    )
                  }
                />
              </div>

              <div className="remove-liquidity-section">
                <div className="remove-liquidity-section-title">
                  <span>
                    You will receive
                  </span>

                  <span className="remove-liquidity-estimate">
                    Estimated
                  </span>
                </div>

                <div className="remove-liquidity-receive-list">
                  <div className="remove-liquidity-receive-row">
                    <span>
                      {token0Symbol}
                    </span>

                    <strong>
                      {amount0Formatted}
                    </strong>
                  </div>

                  <div className="remove-liquidity-receive-row">
                    <span>
                      {token1Symbol}
                    </span>

                    <strong>
                      {amount1Formatted}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="remove-liquidity-settings">
                <label>
                  <span>
                    Slippage
                  </span>

                  <div className="remove-liquidity-input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      step="0.1"
                      value={
                        slippage
                      }
                      disabled={
                        isPending
                      }
                      onChange={(
                        event
                      ) =>
                        setSlippage(
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <span>
                      %
                    </span>
                  </div>
                </label>

                <label>
                  <span>
                    Deadline
                  </span>

                  <div className="remove-liquidity-input-wrap">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        deadlineMinutes
                      }
                      disabled={
                        isPending
                      }
                      onChange={(
                        event
                      ) =>
                        setDeadlineMinutes(
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <span>
                      min
                    </span>
                  </div>
                </label>
              </div>

              {isCheckingAllowance && (
                <div className="remove-liquidity-message remove-liquidity-message-neutral">
                  Checking LP token allowance...
                </div>
              )}

              {isApproving && (
                <div className="remove-liquidity-message remove-liquidity-message-neutral">
                  Confirm LP token approval in your wallet.
                </div>
              )}

              {isRemovingLiquidity && (
                <div className="remove-liquidity-message remove-liquidity-message-neutral">
                  Removing liquidity. Please wait for network confirmation.
                </div>
              )}

              {isSuccess && (
                <div className="remove-liquidity-message remove-liquidity-message-success">
                  <div className="remove-liquidity-result-icon">
                    ✓
                  </div>

                  <div className="remove-liquidity-result-content">
                    <strong>
                      Liquidity removed successfully.
                    </strong>

                    <span>
                      Your liquidity position has been updated and the tokens have been returned to your wallet.
                    </span>

                    {txHash && (
                      <code className="remove-liquidity-tx-hash">
                        {shortHash(
                          txHash
                        )}
                      </code>
                    )}
                  </div>
                </div>
              )}

              {isError && (
                <div className="remove-liquidity-message remove-liquidity-message-error">
                  <div className="remove-liquidity-result-icon">
                    !
                  </div>

                  <div className="remove-liquidity-result-content">
                    <strong>
                      Transaction failed.
                    </strong>

                    <span>
                      {error ||
                        "The liquidity removal transaction could not be completed."}
                    </span>
                  </div>
                </div>
              )}

              {approvalTxHash &&
                !isSuccess &&
                !isError && (
                  <div className="remove-liquidity-approval-hash">
                    Approval:{" "}
                    <code>
                      {shortHash(
                        approvalTxHash
                      )}
                    </code>
                  </div>
                )}

              <button
                type="button"
                className="remove-liquidity-submit"
                disabled={
                  !canRemove
                }
                onClick={
                  handleRemove
                }
              >
                {getButtonText()}
              </button>

              {!hasLiquidity &&
                account && (
                  <div className="remove-liquidity-empty">
                    You do not have liquidity in this pool.
                  </div>
                )}
            </>
          )}
      </div>
    </div>
  );
}

export default RemoveLiquidityPanel;