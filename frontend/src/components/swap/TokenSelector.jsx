import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TokenRow from "./TokenRow";

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function TokenSelector({
  open,
  tokens = [],
  loading = false,
  error = "",
  selectedToken = null,
  excludedToken = null,
  onSelect,
  onClose,
  onRetry,
}) {
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, onClose]);

  const filteredTokens =
    useMemo(() => {
      const query =
        normalizeSearchValue(
          search
        );

      if (!query) {
        return tokens;
      }

      return tokens.filter(
        (token) => {
          const symbol =
            normalizeSearchValue(
              token.symbol
            );

          const name =
            normalizeSearchValue(
              token.name
            );

          const address =
            normalizeSearchValue(
              token.address
            );

          return (
            symbol.includes(query) ||
            name.includes(query) ||
            address.includes(query)
          );
        }
      );
    }, [tokens, search]);

  if (!open) {
    return null;
  }

  const selectedAddress =
    selectedToken?.address?.toLowerCase();

  const excludedAddress =
    excludedToken?.address?.toLowerCase();

  const handleOverlayClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose?.();
    }
  };

  const handleTokenSelect = (
    token
  ) => {
    onSelect?.(token);
    onClose?.();
  };

  return (
    <div
      className="token-selector-overlay"
      onMouseDown={
        handleOverlayClick
      }
    >
      <div
        className="token-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-selector-title"
      >
        <div className="token-selector-header">
          <h2 id="token-selector-title">
            Select a token
          </h2>

          <button
            type="button"
            className="token-selector-close"
            onClick={onClose}
            aria-label="Close token selector"
          >
            ×
          </button>
        </div>

        <div className="token-search-container">
          <span className="token-search-icon">
            ⌕
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search name or paste address"
            autoFocus
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        <div className="token-selector-divider" />

        <div className="token-list">
          {loading && (
            <div className="token-list-message">
              <div className="token-loader" />

              <span>
                Loading tokens...
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="token-list-message token-list-error">
              <strong>
                Could not load tokens
              </strong>

              <span>
                {error}
              </span>

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="token-retry-button"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {!loading &&
            !error &&
            filteredTokens.length ===
              0 && (
              <div className="token-list-message">
                <strong>
                  No tokens found
                </strong>

                <span>
                  Try another name,
                  symbol, or contract
                  address.
                </span>
              </div>
            )}

          {!loading &&
            !error &&
            filteredTokens.map(
              (token) => {
                const address =
                  token.address?.toLowerCase();

                const isSelected =
                  address ===
                  selectedAddress;

                const isExcluded =
                  address ===
                  excludedAddress;

                return (
                  <TokenRow
                    key={
                      token.address
                    }
                    token={token}
                    disabled={
                      isSelected ||
                      isExcluded
                    }
                    onSelect={
                      handleTokenSelect
                    }
                  />
                );
              }
            )}
        </div>

        <div className="token-selector-footer">
          <span>
            Token list provided by
            NumenDEX
          </span>
        </div>
      </div>
    </div>
  );
}

export default TokenSelector;