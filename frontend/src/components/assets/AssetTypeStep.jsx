function AssetTypeStep({
  assetClass,
  onSelect,
}) {
  return (
    <>
      <div className="asset-studio-type-grid">
        <button
          type="button"
          className={`asset-studio-type-card ${
            assetClass === "fungible"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            onSelect("fungible")
          }
        >
          <div className="asset-studio-type-icon">
            F
          </div>

          <div>
            <h3>
              Fungible Asset
            </h3>

            <p>
              Create an ERC-20 asset where every unit is
              interchangeable.
            </p>

            <span>
              ERC-20
            </span>
          </div>

          <div className="asset-studio-type-check">
            {assetClass === "fungible"
              ? "✓"
              : ""}
          </div>
        </button>

        <button
          type="button"
          className={`asset-studio-type-card ${
            assetClass === "non-fungible"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            onSelect(
              "non-fungible"
            )
          }
        >
          <div className="asset-studio-type-icon">
            N
          </div>

          <div>
            <h3>
              Non-Fungible Asset
            </h3>

            <p>
              Create unique assets or edition-based
              collections.
            </p>

            <span>
              ERC-721 / ERC-1155
            </span>
          </div>

          <div className="asset-studio-type-check">
            {assetClass ===
            "non-fungible"
              ? "✓"
              : ""}
          </div>
        </button>
      </div>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            Asset classification
          </strong>

          <p>
            RWA is not a separate token standard.
            Physical assets, digital twins,
            certificates and rights can be represented
            by either fungible or non-fungible assets.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetTypeStep;