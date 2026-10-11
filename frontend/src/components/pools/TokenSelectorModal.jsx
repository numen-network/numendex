import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Contract,
  JsonRpcProvider,
  getAddress,
  isAddress,
} from "ethers";

import "./TokenSelectorModal.css";

const NUMEN_RPC_URL =
  "https://rpc.numen-network.org";

const NUMEN_CHAIN_ID =
  32026;

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

const provider =
  new JsonRpcProvider(
    NUMEN_RPC_URL,
    {
      name: "numen",
      chainId:
        NUMEN_CHAIN_ID,
    },
    {
      staticNetwork: true,
    }
  );

function shortAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(
    0,
    8
  )}...${address.slice(-6)}`;
}

function TokenIcon({
  symbol,
}) {
  return (
    <span className="token-selector-icon">
      {(symbol || "?")
        .slice(0, 1)
        .toUpperCase()}
    </span>
  );
}

function TokenSelectorModal({
  tokens = [],
  selectedAddress,
  excludedAddress,
  onSelect,
  onClose,
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    importedToken,
    setImportedToken,
  ] =
    useState(null);

  const [
    loadingToken,
    setLoadingToken,
  ] =
    useState(false);

  const [
    importError,
    setImportError,
  ] =
    useState("");

  useEffect(
    () => {
      const handleKeyDown =
        (event) => {
          if (
            event.key ===
            "Escape"
          ) {
            onClose?.();
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [onClose]
  );

  useEffect(
    () => {
      let cancelled =
        false;

      const loadToken =
        async () => {
          setImportedToken(
            null
          );

          setImportError("");

          const value =
            search.trim();

          if (
            !isAddress(value)
          ) {
            return;
          }

          const normalized =
            getAddress(value);

          const knownToken =
            tokens.find(
              (token) =>
                token.address.toLowerCase() ===
                normalized.toLowerCase()
            );

          if (knownToken) {
            return;
          }

          try {
            setLoadingToken(
              true
            );

            const tokenContract =
              new Contract(
                normalized,
                ERC20_ABI,
                provider
              );

            const [
              symbol,
              name,
              decimals,
            ] =
              await Promise.all([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals(),
              ]);

            if (cancelled) {
              return;
            }

            setImportedToken({
              address:
                normalized,

              symbol:
                String(symbol),

              name:
                String(name),

              decimals:
                Number(
                  decimals
                ),
            });
          } catch (
            error
          ) {
            if (cancelled) {
              return;
            }

            console.error(
              "Token lookup failed:",
              error
            );

            setImportError(
              "No compatible ERC-20 token was found at this address."
            );
          } finally {
            if (
              !cancelled
            ) {
              setLoadingToken(
                false
              );
            }
          }
        };

      const timer =
        window.setTimeout(
          loadToken,
          350
        );

      return () => {
        cancelled = true;

        window.clearTimeout(
          timer
        );
      };
    },
    [
      search,
      tokens,
    ]
  );

  const filteredTokens =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return tokens;
        }

        return tokens.filter(
          (token) =>
            token.symbol
              .toLowerCase()
              .includes(
                query
              ) ||
            token.name
              .toLowerCase()
              .includes(
                query
              ) ||
            token.address
              .toLowerCase()
              .includes(
                query
              )
        );
      },
      [
        search,
        tokens,
      ]
    );

  const isExcluded =
    (address) =>
      Boolean(
        excludedAddress &&
          address.toLowerCase() ===
            excludedAddress.toLowerCase()
      );

  const isSelected =
    (address) =>
      Boolean(
        selectedAddress &&
          address.toLowerCase() ===
            selectedAddress.toLowerCase()
      );

  const handleSelect =
    (token) => {
      if (
        !token ||
        isExcluded(
          token.address
        )
      ) {
        return;
      }

      onSelect?.(
        token
      );
    };

  return (
    <div
      className="token-selector-overlay"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className="token-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select token"
      >
        <div className="token-selector-header">
          <div>
            <h2>
              Select a token
            </h2>

            <p>
              Search by name, symbol or
              contract address.
            </p>
          </div>

          <button
            type="button"
            className="token-selector-close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="token-selector-search-wrap">
          <span>
            ⌕
          </span>

          <input
            type="text"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search token or paste address"
            autoFocus
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        <div className="token-selector-network">
          <span>
            Network
          </span>

          <strong>
            Numen
          </strong>
        </div>

        <div className="token-selector-content">
          {filteredTokens.length >
            0 && (
            <>
              <div className="token-selector-section-label">
                Tokens
              </div>

              <div className="token-selector-list">
                {filteredTokens.map(
                  (
                    token
                  ) => {
                    const excluded =
                      isExcluded(
                        token.address
                      );

                    const selected =
                      isSelected(
                        token.address
                      );

                    return (
                      <button
                        key={
                          token.address
                        }
                        type="button"
                        className={`token-selector-row ${
                          excluded
                            ? "disabled"
                            : ""
                        } ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        disabled={
                          excluded
                        }
                        onClick={() =>
                          handleSelect(
                            token
                          )
                        }
                      >
                        <TokenIcon
                          symbol={
                            token.symbol
                          }
                        />

                        <div className="token-selector-token-info">
                          <div>
                            <strong>
                              {
                                token.symbol
                              }
                            </strong>

                            {selected && (
                              <span className="token-selector-selected-badge">
                                Selected
                              </span>
                            )}

                            {excluded && (
                              <span className="token-selector-selected-badge">
                                In pair
                              </span>
                            )}
                          </div>

                          <span>
                            {
                              token.name
                            }
                          </span>

                          <code>
                            {shortAddress(
                              token.address
                            )}
                          </code>
                        </div>

                        <span className="token-selector-row-arrow">
                          ›
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </>
          )}

          {loadingToken && (
            <div className="token-selector-status">
              <div className="token-selector-spinner" />

              <span>
                Reading token from Numen Network...
              </span>
            </div>
          )}

          {importedToken &&
            !loadingToken && (
              <>
                <div className="token-selector-section-label token-selector-import-label">
                  Token found
                </div>

                <button
                  type="button"
                  className={`token-selector-row token-selector-import-row ${
                    isExcluded(
                      importedToken.address
                    )
                      ? "disabled"
                      : ""
                  }`}
                  disabled={
                    isExcluded(
                      importedToken.address
                    )
                  }
                  onClick={() =>
                    handleSelect(
                      importedToken
                    )
                  }
                >
                  <TokenIcon
                    symbol={
                      importedToken.symbol
                    }
                  />

                  <div className="token-selector-token-info">
                    <div>
                      <strong>
                        {
                          importedToken.symbol
                        }
                      </strong>

                      <span className="token-selector-import-badge">
                        ERC-20
                      </span>
                    </div>

                    <span>
                      {
                        importedToken.name
                      }
                    </span>

                    <code>
                      {importedToken.address}
                    </code>
                  </div>

                  <span className="token-selector-row-arrow">
                    ›
                  </span>
                </button>
              </>
            )}

          {importError &&
            !loadingToken && (
              <div className="token-selector-error">
                {importError}
              </div>
            )}

          {!loadingToken &&
            !importedToken &&
            !importError &&
            filteredTokens.length ===
              0 && (
              <div className="token-selector-empty">
                <strong>
                  No tokens found
                </strong>

                <p>
                  Search by token name or symbol, or
                  paste a valid Numen ERC-20 contract
                  address.
                </p>
              </div>
            )}
        </div>

        <div className="token-selector-footer">
          <span>
            Only select tokens you trust.
          </span>

          <strong>
            Numen Network
          </strong>
        </div>
      </div>
    </div>
  );
}

export default TokenSelectorModal;