function SwapSettings({
  open,

  slippageMode,
  customSlippage,
  deadline,

  onSlippageModeChange,
  onCustomSlippageChange,
  onDeadlineChange,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-popover">
      <div className="settings-heading">
        Swap settings
      </div>

      <div className="setting-block">
        <div className="setting-title">
          Max slippage
        </div>

        <div className="slippage-controls">
          <button
            type="button"
            className={
              slippageMode === "auto"
                ? "setting-pill active"
                : "setting-pill"
            }
            onClick={() =>
              onSlippageModeChange?.(
                "auto"
              )
            }
          >
            Auto
          </button>

          <div className="slippage-input">
            <input
              value={customSlippage}
              onChange={(event) => {
                onCustomSlippageChange?.(
                  event.target.value
                );

                onSlippageModeChange?.(
                  "custom"
                );
              }}
              inputMode="decimal"
              aria-label="Custom slippage"
            />

            <span>%</span>
          </div>
        </div>
      </div>

      <div className="setting-row">
        <div>
          <strong>
            Transaction deadline
          </strong>
        </div>

        <div className="deadline-control">
          <input
            value={deadline}
            onChange={(event) =>
              onDeadlineChange?.(
                event.target.value
              )
            }
            inputMode="numeric"
            aria-label="Transaction deadline"
          />

          <span>minutes</span>
        </div>
      </div>
    </div>
  );
}

export default SwapSettings;