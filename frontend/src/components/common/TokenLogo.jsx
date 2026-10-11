import { useEffect, useState } from "react";
import { DEFAULT_TOKEN_LOGO, getLocalTokenLogo } from "../../config/tokenLogos";
import "./TokenLogo.css";

export default function TokenLogo({ token, address, symbol, className = "", alt = "", style }) {
  const tokenAddress = address || token?.address || token?.tokenAddress || "";
  const tokenSymbol = symbol || token?.symbol || token?.tokenSymbol || "Token";
  const preferredLogo = getLocalTokenLogo(tokenAddress);
  const [src, setSrc] = useState(preferredLogo);

  useEffect(() => setSrc(preferredLogo), [preferredLogo]);

  return (
    <span className={`token-logo ${className}`.trim()} style={style}>
      <img
        src={src || DEFAULT_TOKEN_LOGO}
        alt={alt || `${tokenSymbol} token`}
        loading="lazy"
        onError={() => {
          if (src !== DEFAULT_TOKEN_LOGO) setSrc(DEFAULT_TOKEN_LOGO);
        }}
      />
    </span>
  );
}
