function AssetFeaturesStep({
  form,
  account,
  onChange,
}) {
  const update = (field, value) => {
    onChange(field, value);
  };

  const isFungible =
    form.assetClass === "fungible";

  const isERC721 =
    form.assetClass === "non-fungible" &&
    form.nftStandard === "erc721";

  const isERC1155 =
    form.assetClass === "non-fungible" &&
    form.nftStandard === "erc1155";

  const renderToggle = ({
    field,
    title,
    description,
    disabled = false,
  }) => {
    const enabled = Boolean(form[field]);

    return (
      <button
        type="button"
        className={`asset-studio-feature-toggle ${
          enabled ? "selected" : ""
        }`}
        onClick={() => {
          if (disabled) {
            return;
          }

          update(field, !enabled);
        }}
        disabled={disabled}
        aria-pressed={enabled}
      >
        <div className="asset-studio-feature-toggle-copy">
          <strong>{title}</strong>

          <p>{description}</p>
        </div>

        <span
          className={`asset-studio-switch ${
            enabled ? "active" : ""
          }`}
          aria-hidden="true"
        >
          <span />
        </span>
      </button>
    );
  };

  const useConnectedWalletAsRecipient = () => {
    if (!account) {
      return;
    }

    update("initialRecipient", account);
  };

  return (
    <>
      {isFungible && (
        <>
          <div className="asset-studio-form-section">
            <div className="asset-studio-section-heading">
              <h3>Token supply</h3>

              <p>
                Configure the initial ERC-20 supply,
                precision and recipient of the initial
                tokens.
              </p>
            </div>

            <div className="asset-studio-form-grid">
              <label className="asset-studio-field">
                <span>Initial supply</span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={form.initialSupply ?? ""}
                  onChange={(event) =>
                    update(
                      "initialSupply",
                      event.target.value
                    )
                  }
                  placeholder="Example: 1000000"
                />

                <small>
                  Amount created when the asset is
                  deployed.
                </small>
              </label>

              <label className="asset-studio-field">
                <span>Decimals</span>

                <input
                  type="number"
                  min="0"
                  max="18"
                  value={form.decimals ?? 18}
                  onChange={(event) =>
                    update(
                      "decimals",
                      Number(event.target.value)
                    )
                  }
                />

                <small>
                  Token display precision. Maximum 18.
                </small>
              </label>

              <label className="asset-studio-field asset-studio-field-full">
                <span>Initial recipient</span>

                <input
                  type="text"
                  value={form.initialRecipient ?? ""}
                  onChange={(event) =>
                    update(
                      "initialRecipient",
                      event.target.value
                    )
                  }
                  placeholder={
                    account ||
                    "0x..."
                  }
                  spellCheck="false"
                  autoComplete="off"
                />

                <small>
                  The initial token supply will be sent
                  directly to this address.
                </small>

                {account && (
                  <div className="asset-studio-authority-actions">
                    <button
                      type="button"
                      className={`asset-studio-wallet-fill-button ${
                        String(
                          form.initialRecipient || ""
                        ).toLowerCase() ===
                        String(account).toLowerCase()
                          ? "selected"
                          : ""
                      }`}
                      onClick={
                        useConnectedWalletAsRecipient
                      }
                    >
                      Use connected wallet
                    </button>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="asset-studio-form-section">
            <div className="asset-studio-section-heading">
              <h3>Supply model</h3>

              <p>
                Choose whether the total token supply is
                permanently fixed or may grow within
                rules selected by the creator.
              </p>
            </div>

            <div className="asset-studio-standard-grid">
              <button
                type="button"
                className={`asset-studio-standard-card ${
                  form.supplyModel === "fixed"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  update("supplyModel", "fixed");
                  update("mintEnabled", false);
                  update(
                    "maxSupply",
                    form.initialSupply || ""
                  );
                }}
              >
                <strong>Fixed supply</strong>

                <span>No future minting</span>

                <p>
                  The initial supply becomes the final
                  lifetime supply.
                </p>
              </button>

              <button
                type="button"
                className={`asset-studio-standard-card ${
                  form.supplyModel === "capped"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  update("supplyModel", "capped");
                  update("mintEnabled", true);
                }}
              >
                <strong>Capped supply</strong>

                <span>Mintable up to a limit</span>

                <p>
                  Additional tokens may be minted, but
                  never beyond the selected maximum
                  supply.
                </p>
              </button>

              <button
                type="button"
                className={`asset-studio-standard-card ${
                  form.supplyModel === "uncapped"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  update("supplyModel", "uncapped");
                  update("mintEnabled", true);
                  update("maxSupply", "");
                }}
              >
                <strong>Uncapped supply</strong>

                <span>Mintable</span>

                <p>
                  Authorized accounts may mint new
                  tokens without a protocol-level
                  maximum supply.
                </p>
              </button>
            </div>

            {form.supplyModel === "capped" && (
              <div className="asset-studio-form-grid asset-studio-feature-followup">
                <label className="asset-studio-field">
                  <span>Maximum supply</span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.maxSupply ?? ""}
                    onChange={(event) =>
                      update(
                        "maxSupply",
                        event.target.value
                      )
                    }
                    placeholder="Example: 10000000"
                  />

                  <small>
                    Lifetime maximum token supply.
                  </small>
                </label>
              </div>
            )}

            {form.supplyModel === "fixed" && (
              <div className="asset-studio-info-banner">
                <div className="asset-studio-info-icon">
                  i
                </div>

                <div>
                  <strong>
                    Fixed lifetime supply
                  </strong>

                  <p>
                    For a fixed-supply asset, maximum
                    supply equals the initial supply and
                    future minting is permanently
                    disabled.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isERC721 && (
        <div className="asset-studio-form-section">
          <div className="asset-studio-section-heading">
            <h3>ERC-721 collection</h3>

            <p>
              Configure the lifetime issuance rules for
              unique tokens in this collection.
            </p>
          </div>

          <div className="asset-studio-form-grid">
            <label className="asset-studio-field">
              <span>
                Maximum supply
                <small>Optional</small>
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={form.maxSupply ?? ""}
                onChange={(event) =>
                  update(
                    "maxSupply",
                    event.target.value
                  )
                }
                placeholder="Leave empty for no collection cap"
              />

              <small>
                Lifetime issuance cap. Burning a token
                does not restore mint capacity.
              </small>
            </label>
          </div>
        </div>
      )}

      {isERC1155 && (
        <div className="asset-studio-form-section">
          <div className="asset-studio-section-heading">
            <h3>ERC-1155 collection</h3>

            <p>
              ERC-1155 can contain multiple token types.
              Individual token IDs and their supply
              limits are created after the collection is
              deployed.
            </p>
          </div>

          <div className="asset-studio-info-banner">
            <div className="asset-studio-info-icon">
              i
            </div>

            <div>
              <strong>Per-token supply</strong>

              <p>
                Each ERC-1155 token type can have its
                own lifetime maximum supply. Burning
                units does not restore that token
                type&apos;s mint capacity.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>Token capabilities</h3>

          <p>
            Enable only the capabilities the asset
            actually needs. These choices are written
            into the deployed asset configuration.
          </p>
        </div>

        <div className="asset-studio-feature-list">
          {renderToggle({
            field: "mintEnabled",
            title: "Minting",
            disabled:
              isFungible &&
              form.supplyModel === "fixed",
            description:
              isFungible &&
              form.supplyModel === "fixed"
                ? "Disabled because the token uses a fixed supply."
                : isFungible
                  ? "Allow the selected mint authority to create additional tokens."
                  : "Allow the selected mint authority to create new tokens.",
          })}

          {renderToggle({
            field: "burnEnabled",
            title: "Burning",
            description:
              "Allow token holders to permanently burn tokens according to the asset standard.",
          })}

          {renderToggle({
            field: "pauseEnabled",
            title: "Pausable transfers",
            description:
              "Allow the selected pause authority to temporarily pause token transfers.",
          })}

          {isFungible &&
            renderToggle({
              field: "permitEnabled",
              title: "ERC-20 Permit",
              description:
                "Enable signature-based ERC-20 approvals. This allows compatible applications to approve spending without a separate approval transaction.",
            })}

          {isFungible &&
            renderToggle({
              field: "votesEnabled",
              title: "ERC-20 Votes",
              description:
                "Enable delegation and voting-power checkpoints for governance-compatible applications.",
            })}
        </div>
      </div>

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>Protocol integration</h3>

          <p>
            Configure optional Numen protocol
            capabilities for this asset.
          </p>
        </div>

        <div className="asset-studio-feature-list">
          {renderToggle({
            field: "objectBindingEnabled",
            title: "Object binding",
            description:
              "Allow this asset to participate in Numen Object Binding workflows for optional physical or 3D references.",
          })}
        </div>
      </div>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            Creator-selected capabilities
          </strong>

          <p>
            Numen does not receive a hidden mint,
            pause or administration role. Authorities
            are selected by the asset creator and are
            configured separately in Rights &amp;
            Permissions.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetFeaturesStep;