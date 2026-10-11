import NumenLogo from "../common/NumenLogo";
import {
  TOKEN_ADDRESSES,
} from "../../config/network";

function getTokenInitial(symbol) {
  if (!symbol) {
    return "?";
  }

  return symbol
    .trim()
    .charAt(0)
    .toUpperCase();
}

function TokenRow({
  token,
  onSelect,
  disabled = false,
}) {
  if (!token) {
    return null;
  }

  const isNumen =
    token.address?.toLowerCase() ===
    TOKEN_ADDRESSES.NUMN.toLowerCase();

  const handleClick = () => {
    if (disabled) {
      return;
    }

    onSelect?.(token);
  };

  return (
    <button
      type="button"
      className={`token-row ${
        disabled
          ? "token-row-disabled"
          : ""
      }`}
      onClick={handleClick}
      disabled={disabled}
    >
      <div className="token-row-left">
        {isNumen ? (
          <NumenLogo
            size={40}
            alt="NUMN"
          />
        ) : token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="token-row-logo"
          />
        ) : (
          <div className="token-row-placeholder">
            {getTokenInitial(
              token.symbol
            )}
          </div>
        )}

        <div className="token-row-details">
          <div className="token-row-symbol">
            {token.symbol}
          </div>

          <div className="token-row-name">
            {token.name}
          </div>
        </div>
      </div>

      {disabled && (
        <span className="token-row-selected">
          Selected
        </span>
      )}
    </button>
  );
}

export default TokenRow;