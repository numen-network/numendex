import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isAddress,
} from "ethers";

import "./CreatePoolPage.css";

import useCreatePool from "../../hooks/useCreatePool";
import TokenSelectorModal from "./TokenSelectorModal";

const KNOWN_TOKENS = [
  {
    symbol: "NUMN",
    name: "Numen",
    address:
      "0x0000000000000000000000000000000000000802",
    decimals: 18,
  },
  {
    symbol: "NDEX",
    name: "NumenDEX",
    address:
      "0x2456f756084bc884f59bf1aa92845dee142cdb56",
    decimals: 18,
  },
  {
    symbol: "TEST",
    name: "Test Token",
    address:
      "0xa417b372ed6d6076fcce02f531f709b261fc2845",
    decimals: 18,
  },
];

function shortAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(
    0,
    8
  )}...${address.slice(-6)}`;
}

function getTokenByAddress(
  address
) {
  if (!address) {
    return null;
  }

  return (
    KNOWN_TOKENS.find(
      (token) =>
        token.address.toLowerCase() ===
        address.toLowerCase()
    ) || null
  );
}

function TokenLogo({
  token,
}) {
  if (!token) {
    return (
      <span className="create-pool-token-logo create-pool-token-logo-empty">
        ?
      </span>
    );
  }

  return (
    <span className="create-pool-token-logo">
      {token.symbol
        .slice(0, 1)
        .toUpperCase()}
    </span>
  );
}

function TokenButton({
  token,
  placeholder,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      className={`create-pool-token-button ${
        token
          ? "selected"
          : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="create-pool-token-button-left">
        <TokenLogo
          token={token}
        />

        <div className="create-pool-token-button-text">
          <strong>
            {token
              ? token.symbol
              : placeholder}
          </strong>

          {token && (
            <span>
              {token.name}
            </span>
          )}
        </div>
      </div>

      <span className="create-pool-token-chevron">
        ▾
      </span>
    </button>
  );
}

function CreatePoolPage({
  account,
  isNumenNetwork,
  connecting,
  onConnect,
  onSwitchNetwork,
  onBack,
  onAddLiquidity,
  onPoolCreated,
}) {
  const [
    step,
    setStep,
  ] =
    useState(1);

  const [
    tokenA,
    setTokenA,
  ] =
    useState(null);

  const [
    tokenB,
    setTokenB,
  ] =
    useState(null);

  const [
    selectorSide,
    setSelectorSide,
  ] =
    useState(null);

  const [
    localError,
    setLocalError,
  ] =
    useState("");

  const {
    error,
    pairAddress,
    transactionHash,

    isChecking,
    isCreating,
    isSuccess,
    isError,
    alreadyExists,
    isPending,

    checkExistingPool,
    executeCreatePool,
    resetCreatePoolState,
  } =
    useCreatePool();

  useEffect(
    () => {
      return () => {
        resetCreatePoolState();
      };
    },
    [
      resetCreatePoolState,
    ]
  );

  const tokenAValid =
    useMemo(
      () =>
        Boolean(
          tokenA?.address &&
            isAddress(
              tokenA.address
            )
        ),
      [tokenA]
    );

  const tokenBValid =
    useMemo(
      () =>
        Boolean(
          tokenB?.address &&
            isAddress(
              tokenB.address
            )
        ),
      [tokenB]
    );

  const sameToken =
    useMemo(
      () =>
        Boolean(
          tokenAValid &&
            tokenBValid &&
            tokenA.address.toLowerCase() ===
              tokenB.address.toLowerCase()
        ),
      [
        tokenA,
        tokenB,
        tokenAValid,
        tokenBValid,
      ]
    );

  const pairReady =
    tokenAValid &&
    tokenBValid &&
    !sameToken;

  const handleReset =
    () => {
      if (isPending) {
        return;
      }

      setStep(1);
      setTokenA(null);
      setTokenB(null);
      setSelectorSide(null);
      setLocalError("");

      resetCreatePoolState();
    };

  const openSelector =
    (side) => {
      if (isPending) {
        return;
      }

      setSelectorSide(side);
    };

  const closeSelector =
    () => {
      setSelectorSide(null);
    };

  const handleTokenSelect =
    (token) => {
      if (!token) {
        return;
      }

      setLocalError("");
      resetCreatePoolState();

      if (
        selectorSide === "A"
      ) {
        if (
          tokenB &&
          token.address.toLowerCase() ===
            tokenB.address.toLowerCase()
        ) {
          setTokenB(tokenA);
        }

        setTokenA(token);
      }

      if (
        selectorSide === "B"
      ) {
        if (
          tokenA &&
          token.address.toLowerCase() ===
            tokenA.address.toLowerCase()
        ) {
          setTokenA(tokenB);
        }

        setTokenB(token);
      }

      setSelectorSide(null);
    };

  const handleSwitchTokens =
    () => {
      if (isPending) {
        return;
      }

      setLocalError("");
      resetCreatePoolState();

      const oldTokenA =
        tokenA;

      setTokenA(
        tokenB
      );

      setTokenB(
        oldTokenA
      );
    };

  const handleContinue =
    async () => {
      setLocalError("");

      if (!pairReady) {
        setLocalError(
          "Select two different tokens."
        );
        return;
      }

      try {
        const existing =
          await checkExistingPool({
            tokenA:
              tokenA.address,

            tokenB:
              tokenB.address,
          });

        /*
         * Whether the pool exists or not,
         * Step 2 shows the result and the
         * appropriate action.
         */
        setStep(2);

        return existing;
      } catch {
        // Hook already stores the
        // readable error.
      }
    };

  const handleCreate =
    async () => {
      setLocalError("");

      if (!account) {
        setLocalError(
          "Connect your wallet first."
        );
        return;
      }

      if (!isNumenNetwork) {
        setLocalError(
          "Switch to Numen Network first."
        );
        return;
      }

      if (!pairReady) {
        setLocalError(
          "Select two different tokens."
        );
        return;
      }

      try {
        const result =
          await executeCreatePool({
            tokenA:
              tokenA.address,

            tokenB:
              tokenB.address,
          });

        if (
          result?.success &&
          typeof onPoolCreated ===
            "function"
        ) {
          onPoolCreated(
            result
          );
        }
      } catch {
        // Hook handles error state.
      }
    };

  const handleAddLiquidity =
    () => {
      if (
        !pairAddress ||
        !tokenA ||
        !tokenB ||
        typeof onAddLiquidity !==
          "function"
      ) {
        return;
      }

      onAddLiquidity({
        pairAddress,
        poolAddress:
          pairAddress,

        token0: {
          address:
            tokenA.address,
          symbol:
            tokenA.symbol,
          name:
            tokenA.name,
          decimals:
            tokenA.decimals ??
            18,
        },

        token1: {
          address:
            tokenB.address,
          symbol:
            tokenB.symbol,
          name:
            tokenB.name,
          decimals:
            tokenB.decimals ??
            18,
        },
      });
    };

  const handleMainCreateButton =
    () => {
      if (!account) {
        onConnect?.();
        return;
      }

      if (!isNumenNetwork) {
        onSwitchNetwork?.();
        return;
      }

      handleCreate();
    };

  const createButtonText =
    () => {
      if (connecting) {
        return "Connecting...";
      }

      if (!account) {
        return "Connect wallet";
      }

      if (!isNumenNetwork) {
        return "Switch to Numen Network";
      }

      if (isCreating) {
        return "Creating pool...";
      }

      return "Create pool";
    };

  const selectorExcludedAddress =
    selectorSide === "A"
      ? tokenB?.address
      : tokenA?.address;

  return (
    <>
      <section className="create-pool-page">
        <div className="create-pool-page-inner">
          <div className="create-pool-breadcrumb">
            <button
              type="button"
              onClick={
                onBack
              }
              disabled={
                isPending
              }
            >
              Pools
            </button>

            <span>
              ›
            </span>

            <strong>
              Create pool
            </strong>
          </div>

          <div className="create-pool-topbar">
            <button
              type="button"
              className="create-pool-title-button"
              onClick={
                onBack
              }
              disabled={
                isPending
              }
            >
              <span>
                ←
              </span>

              <strong>
                Create pool
              </strong>
            </button>

            <div className="create-pool-topbar-actions">
              <button
                type="button"
                className="create-pool-reset-button"
                onClick={
                  handleReset
                }
                disabled={
                  isPending
                }
              >
                ↶ Reset
              </button>

              <span className="create-pool-version-badge">
                v2
              </span>
            </div>
          </div>

          <div className="create-pool-workspace">
            <aside className="create-pool-steps">
              <div
                className={`create-pool-step ${
                  step === 1
                    ? "active"
                    : step > 1
                    ? "complete"
                    : ""
                }`}
              >
                <div className="create-pool-step-marker">
                  {step > 1
                    ? "✓"
                    : "1"}
                </div>

                <div className="create-pool-step-copy">
                  <span>
                    Step 1
                  </span>

                  <strong>
                    Select token pair
                  </strong>
                </div>
              </div>

              <div className="create-pool-step-line" />

              <div
                className={`create-pool-step ${
                  step === 2
                    ? "active"
                    : ""
                }`}
              >
                <div className="create-pool-step-marker">
                  2
                </div>

                <div className="create-pool-step-copy">
                  <span>
                    Step 2
                  </span>

                  <strong>
                    Create pool
                  </strong>
                </div>
              </div>
            </aside>

            <div className="create-pool-main-card">
              {step === 1 && (
                <>
                  <div className="create-pool-card-heading">
                    <h2>
                      Select pair
                    </h2>

                    <p>
                      Choose the two tokens you want to
                      create a liquidity pool for on
                      Numen Network.
                    </p>
                  </div>

                  <div className="create-pool-pair-selector">
                    <TokenButton
                      token={
                        tokenA
                      }
                      placeholder="Select token"
                      onClick={() =>
                        openSelector(
                          "A"
                        )
                      }
                      disabled={
                        isPending
                      }
                    />

                    <button
                      type="button"
                      className="create-pool-switch-token"
                      onClick={
                        handleSwitchTokens
                      }
                      disabled={
                        isPending ||
                        (
                          !tokenA &&
                          !tokenB
                        )
                      }
                      title="Switch tokens"
                    >
                      ⇄
                    </button>

                    <TokenButton
                      token={
                        tokenB
                      }
                      placeholder="Select token"
                      onClick={() =>
                        openSelector(
                          "B"
                        )
                      }
                      disabled={
                        isPending
                      }
                    />
                  </div>

                  <div className="create-pool-config-section">
                    <div className="create-pool-config-heading">
                      <h3>
                        Pool configuration
                      </h3>

                      <p>
                        NumenDEX uses a fixed V2 pool
                        configuration.
                      </p>
                    </div>

                    <div className="create-pool-config-grid">
                      <div className="create-pool-config-box">
                        <span>
                          Network
                        </span>

                        <strong>
                          Numen
                        </strong>
                      </div>

                      <div className="create-pool-config-box">
                        <span>
                          Version
                        </span>

                        <strong>
                          v2
                        </strong>
                      </div>

                      <div className="create-pool-config-box">
                        <span>
                          Swap fee
                        </span>

                        <strong>
                          0.30%
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="create-pool-info-banner">
                    <div className="create-pool-info-icon">
                      i
                    </div>

                    <div>
                      <strong>
                        About pool creation
                      </strong>

                      <p>
                        Creating a pool only creates the
                        trading pair. You can add
                        liquidity after the pool is
                        created.
                      </p>
                    </div>
                  </div>

                  {sameToken && (
                    <div className="create-pool-message error">
                      Select two different tokens.
                    </div>
                  )}

                  {localError && (
                    <div className="create-pool-message error">
                      {localError}
                    </div>
                  )}

                  {isError &&
                    error && (
                      <div className="create-pool-message error">
                        {error}
                      </div>
                    )}

                  {isChecking && (
                    <div className="create-pool-message neutral">
                      Checking whether this pool already
                      exists...
                    </div>
                  )}

                  <button
                    type="button"
                    className="create-pool-primary-button"
                    disabled={
                      !pairReady ||
                      isPending
                    }
                    onClick={
                      handleContinue
                    }
                  >
                    {isChecking
                      ? "Checking pool..."
                      : "Continue"}
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="create-pool-card-heading create-pool-review-heading">
                    <div>
                      <button
                        type="button"
                        className="create-pool-step-back"
                        onClick={() => {
                          if (
                            isPending
                          ) {
                            return;
                          }

                          setStep(
                            1
                          );

                          resetCreatePoolState();
                        }}
                        disabled={
                          isPending
                        }
                      >
                        ←
                      </button>

                      <div>
                        <h2>
                          {alreadyExists
                            ? "Pool already exists"
                            : isSuccess
                            ? "Pool created"
                            : "Create pool"}
                        </h2>

                        <p>
                          Review the pair before
                          continuing.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="create-pool-review-pair">
                    <div className="create-pool-review-icons">
                      <TokenLogo
                        token={
                          tokenA
                        }
                      />

                      <TokenLogo
                        token={
                          tokenB
                        }
                      />
                    </div>

                    <div>
                      <h3>
                        {tokenA?.symbol}
                        {" / "}
                        {tokenB?.symbol}
                      </h3>

                      <span>
                        NumenDEX v2 · 0.30%
                      </span>
                    </div>
                  </div>

                  <div className="create-pool-review-table">
                    <div>
                      <span>
                        Network
                      </span>

                      <strong>
                        Numen
                      </strong>
                    </div>

                    <div>
                      <span>
                        Version
                      </span>

                      <strong>
                        v2
                      </strong>
                    </div>

                    <div>
                      <span>
                        Swap fee
                      </span>

                      <strong>
                        0.30%
                      </strong>
                    </div>

                    <div>
                      <span>
                        Token A
                      </span>

                      <strong>
                        {tokenA?.symbol}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Token B
                      </span>

                      <strong>
                        {tokenB?.symbol}
                      </strong>
                    </div>
                  </div>

                  <div className="create-pool-addresses">
                    <div>
                      <span>
                        {tokenA?.symbol}
                      </span>

                      <code>
                        {tokenA?.address}
                      </code>
                    </div>

                    <div>
                      <span>
                        {tokenB?.symbol}
                      </span>

                      <code>
                        {tokenB?.address}
                      </code>
                    </div>
                  </div>

                  {alreadyExists &&
                    pairAddress && (
                      <div className="create-pool-result existing">
                        <div className="create-pool-result-icon">
                          i
                        </div>

                        <div className="create-pool-result-copy">
                          <strong>
                            This pool already exists.
                          </strong>

                          <p>
                            You do not need to create it
                            again. You can add liquidity
                            to the existing pool.
                          </p>

                          <span>
                            Pair address
                          </span>

                          <code>
                            {pairAddress}
                          </code>
                        </div>
                      </div>
                    )}

                  {isSuccess &&
                    pairAddress && (
                      <div className="create-pool-result success">
                        <div className="create-pool-result-icon">
                          ✓
                        </div>

                        <div className="create-pool-result-copy">
                          <strong>
                            Pool created successfully.
                          </strong>

                          <p>
                            The pair is now deployed on
                            Numen Network.
                          </p>

                          <span>
                            Pair address
                          </span>

                          <code>
                            {pairAddress}
                          </code>

                          {transactionHash && (
                            <>
                              <span>
                                Transaction
                              </span>

                              <code>
                                {transactionHash}
                              </code>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  {isCreating && (
                    <div className="create-pool-message neutral">
                      Confirm the transaction in your
                      wallet and wait for Numen Network
                      confirmation.
                    </div>
                  )}

                  {localError && (
                    <div className="create-pool-message error">
                      {localError}
                    </div>
                  )}

                  {isError &&
                    error && (
                      <div className="create-pool-message error">
                        {error}
                      </div>
                    )}

                  {!alreadyExists &&
                    !isSuccess && (
                      <div className="create-pool-transaction-note">
                        <strong>
                          Create the pair
                        </strong>

                        <p>
                          This transaction creates the
                          pool contract. No liquidity is
                          deposited during this step.
                        </p>
                      </div>
                    )}

                  {(alreadyExists ||
                    isSuccess) &&
                  pairAddress ? (
                    <button
                      type="button"
                      className="create-pool-primary-button"
                      onClick={
                        handleAddLiquidity
                      }
                    >
                      Add liquidity
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="create-pool-primary-button"
                      onClick={
                        handleMainCreateButton
                      }
                      disabled={
                        connecting ||
                        isPending
                      }
                    >
                      {createButtonText()}
                    </button>
                  )}

                  {(alreadyExists ||
                    isSuccess) && (
                    <button
                      type="button"
                      className="create-pool-secondary-button"
                      onClick={
                        handleReset
                      }
                    >
                      Create another pool
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {selectorSide && (
        <TokenSelectorModal
          tokens={
            KNOWN_TOKENS
          }
          selectedAddress={
            selectorSide === "A"
              ? tokenA?.address
              : tokenB?.address
          }
          excludedAddress={
            selectorExcludedAddress
          }
          onSelect={
            handleTokenSelect
          }
          onClose={
            closeSelector
          }
        />
      )}
    </>
  );
}

export default CreatePoolPage;