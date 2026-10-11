# NumenDEX v2 changes

- First v2 indexer run starts at genesis block 0.
- Progress is persisted after each successful batch; restarts resume from the next block.
- New blocks are continuously polled after catch-up.
- Factory `allPairs` is reconciled after historical scan as a second source of truth.
- Pool tokens are discovered automatically.
- Global ERC-20 candidates are discovered from Transfer events; obvious pair contracts are excluded.
- ERC-20 discovery now requires contract bytecode plus valid `decimals()` and `totalSupply()` calls, reducing false positives from unrelated contracts.
- Expensive holder rescans were removed from automatic token discovery. Holder calculation remains available as a service but no longer blocks indexing.
- Added `/api/token/resolve/:address` for contract-address token import.
- Imported tokens are marked unverified and can only swap when an actual DEX route exists.
- All token logos are local-address mapped; missing logos use `/tokens/default-token.svg`.
- Root `.env` remains the only environment file. `.env` is intentionally excluded from these archives so secrets are not redistributed.
