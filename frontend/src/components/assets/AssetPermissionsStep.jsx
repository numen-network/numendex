function AssetPermissionsStep({
  form,
  account,
  onChange,
}) {
  const update = (field, value) => {
    onChange(field, value);
  };

  const connectedAccount =
    account || "";

  const adminAddress =
    form.adminAddress || "";

  const metadataAuthority =
    form.metadataAuthority || "";

  const mintAuthority =
    form.mintAuthority || "";

  const pauseAuthority =
    form.pauseAuthority || "";

  const useConnectedWallet = (
    field
  ) => {
    if (!connectedAccount) {
      return;
    }

    update(
      field,
      connectedAccount
    );
  };

  const shortenAddress = (
    address
  ) => {
    if (
      !address ||
      address.length < 12
    ) {
      return address || "Not connected";
    }

    return `${address.slice(
      0,
      6
    )}...${address.slice(-4)}`;
  };

  const renderWalletButton = (
    field,
    currentValue
  ) => {
    const isCurrentWallet =
      connectedAccount &&
      currentValue &&
      connectedAccount.toLowerCase() ===
        currentValue.toLowerCase();

    return (
      <button
        type="button"
        className={`asset-studio-wallet-fill-button ${
          isCurrentWallet
            ? "selected"
            : ""
        }`}
        disabled={
          !connectedAccount
        }
        onClick={() =>
          useConnectedWallet(
            field
          )
        }
      >
        {isCurrentWallet
          ? "✓ Connected wallet"
          : connectedAccount
            ? `Use ${shortenAddress(
                connectedAccount
              )}`
            : "Wallet not connected"}
      </button>
    );
  };

  return (
    <>
      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Administration
          </h3>

          <p>
            Select the address that will receive the
            primary administration role for this asset.
          </p>
        </div>

        <div className="asset-studio-authority-card">
          <div className="asset-studio-authority-header">
            <div>
              <span className="asset-studio-authority-badge">
                ADMIN
              </span>

              <h4>
                Administrator
              </h4>

              <p>
                Receives the asset's primary
                administration role. This address can
                manage role assignments through the
                token contract.
              </p>
            </div>
          </div>

          <div className="asset-studio-form-grid">
            <label className="asset-studio-field asset-studio-field-full">
              <span>
                Administrator address
              </span>

              <input
                type="text"
                value={
                  adminAddress
                }
                onChange={(
                  event
                ) =>
                  update(
                    "adminAddress",
                    event.target.value
                  )
                }
                placeholder="0x..."
                spellCheck="false"
                autoComplete="off"
              />

              <small>
                This address receives the initial
                DEFAULT_ADMIN_ROLE.
              </small>
            </label>
          </div>

          <div className="asset-studio-authority-actions">
            {renderWalletButton(
              "adminAddress",
              adminAddress
            )}
          </div>
        </div>
      </div>

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Metadata authority
          </h3>

          <p>
            Select who may update supported asset
            metadata after deployment.
          </p>
        </div>

        <div className="asset-studio-authority-card">
          <div className="asset-studio-authority-header">
            <div>
              <span className="asset-studio-authority-badge">
                METADATA
              </span>

              <h4>
                Metadata manager
              </h4>

              <p>
                Receives the METADATA_ROLE for the
                deployed asset.
              </p>
            </div>
          </div>

          <div className="asset-studio-form-grid">
            <label className="asset-studio-field asset-studio-field-full">
              <span>
                Metadata authority address
              </span>

              <input
                type="text"
                value={
                  metadataAuthority
                }
                onChange={(
                  event
                ) =>
                  update(
                    "metadataAuthority",
                    event.target.value
                  )
                }
                placeholder="0x..."
                spellCheck="false"
                autoComplete="off"
              />

              <small>
                This authority is separate from the
                Numen protocol and Factory.
              </small>
            </label>
          </div>

          <div className="asset-studio-authority-actions">
            {renderWalletButton(
              "metadataAuthority",
              metadataAuthority
            )}
          </div>
        </div>
      </div>

      {form.mintEnabled && (
        <div className="asset-studio-form-section">
          <div className="asset-studio-section-heading">
            <h3>
              Mint authority
            </h3>

            <p>
              Minting is enabled for this asset. Select
              the address allowed to create additional
              tokens.
            </p>
          </div>

          <div className="asset-studio-authority-card">
            <div className="asset-studio-authority-header">
              <div>
                <span className="asset-studio-authority-badge">
                  MINTER
                </span>

                <h4>
                  Mint manager
                </h4>

                <p>
                  Receives MINTER_ROLE when the asset is
                  deployed.
                </p>
              </div>
            </div>

            <div className="asset-studio-form-grid">
              <label className="asset-studio-field asset-studio-field-full">
                <span>
                  Mint authority address
                </span>

                <input
                  type="text"
                  value={
                    mintAuthority
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "mintAuthority",
                      event.target.value
                    )
                  }
                  placeholder="0x..."
                  spellCheck="false"
                  autoComplete="off"
                />

                <small>
                  Only configure an address you trust to
                  control future issuance.
                </small>
              </label>
            </div>

            <div className="asset-studio-authority-actions">
              {renderWalletButton(
                "mintAuthority",
                mintAuthority
              )}
            </div>
          </div>
        </div>
      )}

      {form.pauseEnabled && (
        <div className="asset-studio-form-section">
          <div className="asset-studio-section-heading">
            <h3>
              Pause authority
            </h3>

            <p>
              Pausing is enabled for this asset. Select
              the address allowed to pause and resume
              token operations supported by the
              contract.
            </p>
          </div>

          <div className="asset-studio-authority-card">
            <div className="asset-studio-authority-header">
              <div>
                <span className="asset-studio-authority-badge">
                  PAUSER
                </span>

                <h4>
                  Pause manager
                </h4>

                <p>
                  Receives PAUSER_ROLE when the asset is
                  deployed.
                </p>
              </div>
            </div>

            <div className="asset-studio-form-grid">
              <label className="asset-studio-field asset-studio-field-full">
                <span>
                  Pause authority address
                </span>

                <input
                  type="text"
                  value={
                    pauseAuthority
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "pauseAuthority",
                      event.target.value
                    )
                  }
                  placeholder="0x..."
                  spellCheck="false"
                  autoComplete="off"
                />

                <small>
                  This role can temporarily pause the
                  token when the selected token contract
                  supports pausing.
                </small>
              </label>
            </div>

            <div className="asset-studio-authority-actions">
              {renderWalletButton(
                "pauseAuthority",
                pauseAuthority
              )}
            </div>
          </div>
        </div>
      )}

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Authority summary
          </h3>

          <p>
            Review which addresses will receive
            privileged token roles at deployment.
          </p>
        </div>

        <div className="asset-studio-identity-summary">
          <div>
            <span>
              Administrator
            </span>

            <strong title={adminAddress}>
              {shortenAddress(
                adminAddress
              ) || "Not selected"}
            </strong>
          </div>

          <div>
            <span>
              Metadata
            </span>

            <strong
              title={
                metadataAuthority
              }
            >
              {shortenAddress(
                metadataAuthority
              ) || "Not selected"}
            </strong>
          </div>

          <div>
            <span>
              Mint
            </span>

            <strong
              title={
                mintAuthority
              }
            >
              {form.mintEnabled
                ? shortenAddress(
                    mintAuthority
                  ) ||
                  "Not selected"
                : "Disabled"}
            </strong>
          </div>

          <div>
            <span>
              Pause
            </span>

            <strong
              title={
                pauseAuthority
              }
            >
              {form.pauseEnabled
                ? shortenAddress(
                    pauseAuthority
                  ) ||
                  "Not selected"
                : "Disabled"}
            </strong>
          </div>
        </div>
      </div>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            No hidden Numen authority
          </strong>

          <p>
            The Numen protocol and deployment Factory
            do not receive a hidden administrator,
            mint, pause or metadata role. These
            authorities belong to the addresses you
            select.
          </p>
        </div>
      </div>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          !
        </div>

        <div>
          <strong>
            Administration warning
          </strong>

          <p>
            Do not renounce the final administrator
            role unless another trusted administrator
            has already been configured. Losing every
            administrator can permanently prevent
            future role management.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetPermissionsStep;