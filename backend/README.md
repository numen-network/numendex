# NumenDEX

## Environment
Use exactly one environment file at the project root: `.env`.
Copy `.env.example` to `.env` and fill in `MONGO_URI`. Do not create `backend/.env` or `frontend/.env`.

## Indexer
The v2 indexer uses state key `lastProcessedBlock:v2-genesis`. On its first run it scans Numen from block 0 to the current block in batches, discovers ERC-20 contracts from Transfer events, discovers NumenDEX pools from Factory PairCreated events, indexes Swap events from known pairs, reconciles pools against Factory `allPairs`, saves progress after every successful batch, then continues polling new blocks.

`INDEXER_BATCH_SIZE` defaults to 500 and can be reduced if the RPC rejects large log ranges.

## Token import
The Swap token selector accepts a full EVM contract address. Unknown addresses are resolved by the backend using contract bytecode plus ERC-20 metadata checks and cached as `imported`. Imported tokens are not treated as verified. A token can only be swapped if the Router can find a valid liquidity route.

## Token logos
Put official local logos in `frontend/public/tokens/` and map their contract addresses in `frontend/src/config/tokenLogos.js`. Any unmapped or missing logo falls back to `frontend/public/tokens/default-token.svg`.

## Run
Backend:
`cd backend && npm install && npm start`

Frontend:
`cd frontend && npm install && npm run dev`
