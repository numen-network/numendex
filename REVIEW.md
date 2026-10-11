# NumenDEX review and changes

## Structural fixes
- One environment file only: `/.env`.
- Backend loads the root env through `backend/services/env.js`.
- Vite loads the root env through `frontend/vite.config.js` (`envDir: ".."`).
- Removed duplicate unused `src/components/explore/PortfolioPage.*` and Vite/React starter SVGs.
- Build output and node_modules are not included in the reviewed source package.

## Token logos
- Trusted local logos live in `frontend/public/tokens/`.
- Address-to-file mapping is centralized in `frontend/src/config/tokenLogos.js`.
- Shared rendering component: `frontend/src/components/common/TokenLogo.jsx`.
- Unknown tokens fall back to their first symbol character.
- Remote token-provided image URLs are not rendered, avoiding third-party tracking/content replacement and symbol spoofing.
- Add your real files as `numn.png`, `ndex.png`, `test.png` and extend the address map for additional verified tokens.

## Market data
- Added `backend/services/marketDataService.js`.
- Current token prices are derived from live NumenDEX reserves relative to NUMN.
- NUMN/USD is fetched server-side from CoinGecko and cached; if unavailable, USD values remain null instead of being invented.
- Token price, FDV and volume fields are added to `/api/tokens` and `/api/token/:address`.
- Pool TVL, 1D/30D volume, volume/TVL and fee APR are populated when a trusted NUMN/USD price is available.
- LP APR uses the current protocol economics: 0.30% swap fee and no protocol fee (`volume * 0.003 * 365 / TVL`).
- Added `/api/token/:address/history?period=1h|1d|1w|1m|1y|all` from indexed swap executions. Token detail uses it for the chart.
- When USD pricing is unavailable, the API keeps values null rather than fabricating values.

## Security
- CORS is restricted to `CORS_ORIGINS` rather than `*`.
- API rate limiting added without a new runtime dependency.
- JSON request size limited to 32 KB.
- `X-Powered-By` disabled and basic security headers added.
- 500 responses no longer expose raw internal exception messages.
- `.env` is ignored by Git; `.env.example` contains no secrets.
- Frontend receives only `VITE_` variables. MongoDB credentials never enter the browser bundle.

## Important limitation
Historical USD prices are not independently archived. The token history endpoint reconstructs DEX execution prices from indexed swaps and converts through the current Numen liquidity graph/current NUMN USD reference. This is useful for a DEX chart but is not a historical oracle. For exact historical USD analytics, add a persisted price-candle/oracle indexer.
