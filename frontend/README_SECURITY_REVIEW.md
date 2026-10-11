# NumenDEX integration review

This package includes the supplied frontend and backend with targeted corrections.

- Replaced the decorative NUMN price chart with actual backend history (`/api/token/:address/history`); empty or unavailable prices display as unavailable.
- Backend pool USD statistics are explicitly null when token USD pricing is unavailable.
- The backend currently computes historical USD volumes using *current* token prices, not execution-time USD prices. These are estimates, not historically exact volume.
- The backend historical chart likewise converts historical token prices using the *current* NUMN/USD reference, so historical USD values are not historically exact.
- Price discovery across thin pools may be manipulated; an oracle or liquidity-weighted, time-aware methodology is required for trusted valuations.
- APR is an estimated annualized fee yield, not a guaranteed return.
- Mainnet launch is NOT certified. Run build, unit, integration, wallet, and adversarial contract tests before deployment.
- Set VITE_API_URL to the actual backend URL for split-domain deployment; configure CORS_ORIGINS accordingly.
