const ASSET_CATEGORIES = [
  { value: 0, label: "Unspecified" },
  { value: 1, label: "Currency" },
  { value: 2, label: "Payment" },
  { value: 3, label: "Utility" },
  { value: 4, label: "Governance" },
  { value: 5, label: "Community" },
  { value: 6, label: "Gaming" },
  { value: 7, label: "Commodity" },
  { value: 8, label: "Real Estate" },
  { value: 9, label: "Precious Metal" },
  { value: 10, label: "Precious Stone" },
  { value: 11, label: "Collectible" },
  { value: 12, label: "Artwork" },
  { value: 13, label: "Cultural Heritage" },
  { value: 14, label: "Product" },
  { value: 15, label: "Vehicle" },
  { value: 16, label: "Machinery" },
  {
    value: 17,
    label: "Intellectual Property",
  },
  { value: 18, label: "Media" },
  { value: 19, label: "Certificate" },
  { value: 20, label: "Identity" },
  {
    value: 21,
    label: "Financial Asset",
  },
  { value: 22, label: "Custom" },
];

const REPRESENTATION_TYPES = [
  { value: 0, label: "Unspecified" },
  { value: 1, label: "Digital Asset" },
  {
    value: 2,
    label: "Physical Reference",
  },
  { value: 3, label: "Digital Twin" },
  {
    value: 4,
    label: "Fractional Interest",
  },
  {
    value: 5,
    label: "Ownership Claim",
  },
  { value: 6, label: "Usage Right" },
  { value: 7, label: "Revenue Right" },
  { value: 8, label: "Certificate" },
  {
    value: 9,
    label: "Product Passport",
  },
  { value: 10, label: "Membership" },
  { value: 11, label: "License" },
  { value: 12, label: "Custom" },
];

function AssetIdentityStep({
  form,
  onChange,
}) {
  const selectedCategory =
    ASSET_CATEGORIES.find(
      (item) =>
        item.value ===
        Number(form.category)
    );

  const selectedRepresentation =
    REPRESENTATION_TYPES.find(
      (item) =>
        item.value ===
        Number(form.representation)
    );

  const update = (
    field,
    value
  ) => {
    onChange(
      field,
      value
    );
  };

  return (
    <>
      {form.assetClass ===
        "non-fungible" && (
        <div className="asset-studio-form-section">
          <div className="asset-studio-section-heading">
            <h3>
              Token standard
            </h3>

            <p>
              Choose how the non-fungible asset will be
              represented on-chain.
            </p>
          </div>

          <div className="asset-studio-standard-grid">
            <button
              type="button"
              className={`asset-studio-standard-card ${
                form.nftStandard ===
                "erc721"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                update(
                  "nftStandard",
                  "erc721"
                )
              }
            >
              <strong>
                ERC-721
              </strong>

              <span>
                Unique assets
              </span>

              <p>
                Best for individually unique tokens,
                certificates, digital twins and
                one-of-one assets.
              </p>
            </button>

            <button
              type="button"
              className={`asset-studio-standard-card ${
                form.nftStandard ===
                "erc1155"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                update(
                  "nftStandard",
                  "erc1155"
                )
              }
            >
              <strong>
                ERC-1155
              </strong>

              <span>
                Multi-token / editions
              </span>

              <p>
                Best for editions, product batches,
                memberships and multiple token types.
              </p>
            </button>
          </div>
        </div>
      )}

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Asset identity
          </h3>

          <p>
            Define the human-readable identity of the
            asset.
          </p>
        </div>

        <div className="asset-studio-form-grid">
          <label className="asset-studio-field">
            <span>
              Name
            </span>

            <input
              type="text"
              value={
                form.name
              }
              onChange={(
                event
              ) =>
                update(
                  "name",
                  event.target.value
                )
              }
              placeholder="Example: Numen Gold"
              maxLength={80}
            />
          </label>

          <label className="asset-studio-field">
            <span>
              Symbol
            </span>

            <input
              type="text"
              value={
                form.symbol
              }
              onChange={(
                event
              ) =>
                update(
                  "symbol",
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="Example: NGLD"
              maxLength={16}
            />
          </label>

          <label className="asset-studio-field asset-studio-field-full">
            <span>
              Description

              <small>
                Optional
              </small>
            </span>

            <textarea
              value={
                form.description
              }
              onChange={(
                event
              ) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe what this asset represents."
              rows={4}
              maxLength={1000}
            />

            <small className="asset-studio-field-counter">
              {form.description.length}
              /1000
            </small>
          </label>
        </div>
      </div>

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Classification
          </h3>

          <p>
            Classification describes what the asset is
            and what its on-chain representation means.
          </p>
        </div>

        <div className="asset-studio-form-grid">
          <label className="asset-studio-field">
            <span>
              Category
            </span>

            <select
              value={
                form.category
              }
              onChange={(
                event
              ) =>
                update(
                  "category",
                  Number(
                    event.target.value
                  )
                )
              }
            >
              {ASSET_CATEGORIES.map(
                (category) => (
                  <option
                    key={
                      category.value
                    }
                    value={
                      category.value
                    }
                  >
                    {category.label}
                  </option>
                )
              )}
            </select>

            <small>
              Protocol value:{" "}
              {
                selectedCategory?.value
              }
            </small>
          </label>

          <label className="asset-studio-field">
            <span>
              Representation
            </span>

            <select
              value={
                form.representation
              }
              onChange={(
                event
              ) =>
                update(
                  "representation",
                  Number(
                    event.target.value
                  )
                )
              }
            >
              {REPRESENTATION_TYPES.map(
                (
                  representation
                ) => (
                  <option
                    key={
                      representation.value
                    }
                    value={
                      representation.value
                    }
                  >
                    {
                      representation.label
                    }
                  </option>
                )
              )}
            </select>

            <small>
              Protocol value:{" "}
              {
                selectedRepresentation?.value
              }
            </small>
          </label>

          {Number(
            form.category
          ) === 22 && (
            <label className="asset-studio-field">
              <span>
                Custom category
              </span>

              <input
                type="text"
                value={
                  form.customCategory
                }
                onChange={(
                  event
                ) =>
                  update(
                    "customCategory",
                    event.target.value
                  )
                }
                placeholder="Enter category"
                maxLength={80}
              />
            </label>
          )}

          {Number(
            form.representation
          ) === 12 && (
            <label className="asset-studio-field">
              <span>
                Custom representation
              </span>

              <input
                type="text"
                value={
                  form.customRepresentation
                }
                onChange={(
                  event
                ) =>
                  update(
                    "customRepresentation",
                    event.target.value
                  )
                }
                placeholder="Enter representation"
                maxLength={80}
              />
            </label>
          )}
        </div>
      </div>

      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            External metadata
          </h3>

          <p>
            Large metadata should remain off-chain.
            The protocol can reference it through a URI
            and commit to its hash separately.
          </p>
        </div>

        <div className="asset-studio-form-grid">
          <label className="asset-studio-field asset-studio-field-full">
            <span>
              Metadata URI

              <small>
                Optional
              </small>
            </span>

            <input
              type="text"
              value={
                form.metadataURI
              }
              onChange={(
                event
              ) =>
                update(
                  "metadataURI",
                  event.target.value
                )
              }
              placeholder="ipfs://... or https://..."
            />
          </label>
        </div>
      </div>

      <div className="asset-studio-identity-summary">
        <div>
          <span>
            Asset class
          </span>

          <strong>
            {form.assetClass ===
            "fungible"
              ? "Fungible"
              : "Non-Fungible"}
          </strong>
        </div>

        <div>
          <span>
            Standard
          </span>

          <strong>
            {form.assetClass ===
            "fungible"
              ? "ERC-20"
              : form.nftStandard ===
                  "erc721"
                ? "ERC-721"
                : form.nftStandard ===
                    "erc1155"
                  ? "ERC-1155"
                  : "Not selected"}
          </strong>
        </div>

        <div>
          <span>
            Category
          </span>

          <strong>
            {Number(
              form.category
            ) === 22
              ? form.customCategory ||
                "Custom"
              : selectedCategory?.label}
          </strong>
        </div>

        <div>
          <span>
            Representation
          </span>

          <strong>
            {Number(
              form.representation
            ) === 12
              ? form.customRepresentation ||
                "Custom"
              : selectedRepresentation?.label}
          </strong>
        </div>
      </div>
    </>
  );
}

export default AssetIdentityStep;