const CATEGORY_LABELS = {
  0: "Unspecified",
  1: "Currency",
  2: "Payment",
  3: "Utility",
  4: "Governance",
  5: "Community",
  6: "Gaming",
  7: "Commodity",
  8: "Real Estate",
  9: "Precious Metal",
  10: "Precious Stone",
  11: "Collectible",
  12: "Artwork",
  13: "Cultural Heritage",
  14: "Product",
  15: "Vehicle",
  16: "Machinery",
  17: "Intellectual Property",
  18: "Media",
  19: "Certificate",
  20: "Identity",
  21: "Financial Asset",
  22: "Custom",
};

const REPRESENTATION_LABELS = {
  0: "Unspecified",
  1: "Digital Asset",
  2: "Physical Reference",
  3: "Digital Twin",
  4: "Fractional Interest",
  5: "Ownership Claim",
  6: "Usage Right",
  7: "Revenue Right",
  8: "Certificate",
  9: "Product Passport",
  10: "Membership",
  11: "License",
  12: "Custom",
};

const PROPERTY_TYPE_LABELS = {
  0: "Text",
  1: "Integer",
  2: "Decimal",
  3: "Boolean",
  4: "Date",
  5: "URI",
  6: "Hash",
  7: "Address",
  8: "Bytes",
};

function ReviewRow({
  label,
  value,
}) {
  return (
    <div className="asset-studio-review-row">
      <span>
        {label}
      </span>

      <strong>
        {value === undefined ||
        value === null ||
        value === ""
          ? "—"
          : String(value)}
      </strong>
    </div>
  );
}

function ReviewSection({
  title,
  description,
  children,
}) {
  return (
    <div className="asset-studio-review-section">
      <div className="asset-studio-section-heading">
        <h3>
          {title}
        </h3>

        {description && (
          <p>
            {description}
          </p>
        )}
      </div>

      <div className="asset-studio-review-grid">
        {children}
      </div>
    </div>
  );
}

function AssetReviewStep({
  form,
  account,
}) {
  const properties =
    Array.isArray(form.properties)
      ? form.properties
      : [];

  const isFungible =
    form.assetClass === "fungible";

  const isNFT =
    form.assetClass ===
    "non-fungible";

  const isERC721 =
    isNFT &&
    form.nftStandard === "erc721";

  const isERC1155 =
    isNFT &&
    form.nftStandard === "erc1155";

  const category =
    Number(form.category) === 22
      ? form.customCategory ||
        "Custom"
      : CATEGORY_LABELS[
          Number(form.category)
        ] || "Unspecified";

  const representation =
    Number(
      form.representation
    ) === 12
      ? form.customRepresentation ||
        "Custom"
      : REPRESENTATION_LABELS[
          Number(
            form.representation
          )
        ] || "Unspecified";

  const standard =
    isFungible
      ? "ERC-20"
      : isERC721
        ? "ERC-721"
        : isERC1155
          ? "ERC-1155"
          : "Not selected";

  const supplyModel =
    form.supplyModel === "fixed"
      ? "Fixed"
      : form.supplyModel ===
          "capped"
        ? "Capped"
        : form.supplyModel ===
            "uncapped"
          ? "Uncapped"
          : "—";

  return (
    <>
      <div className="asset-studio-review-intro">
        <div className="asset-studio-info-icon">
          ✓
        </div>

        <div>
          <strong>
            Review before creation
          </strong>

          <p>
            Confirm the asset configuration below.
            Creating the asset will require a wallet
            transaction on Numen Network.
          </p>
        </div>
      </div>

      <ReviewSection
        title="Asset identity"
        description="Core identity and protocol classification."
      >
        <ReviewRow
          label="Name"
          value={form.name}
        />

        <ReviewRow
          label="Symbol"
          value={form.symbol}
        />

        <ReviewRow
          label="Asset class"
          value={
            isFungible
              ? "Fungible"
              : "Non-Fungible"
          }
        />

        <ReviewRow
          label="Standard"
          value={standard}
        />

        <ReviewRow
          label="Category"
          value={category}
        />

        <ReviewRow
          label="Representation"
          value={
            representation
          }
        />

        <ReviewRow
          label="Metadata URI"
          value={
            form.metadataURI
          }
        />

        <ReviewRow
          label="Creator wallet"
          value={account}
        />

        {isFungible && (
          <ReviewRow
            label="Initial recipient"
            value={form.initialRecipient || account}
          />
        )}
      </ReviewSection>

      {form.description && (
        <div className="asset-studio-review-section">
          <div className="asset-studio-section-heading">
            <h3>
              Description
            </h3>
          </div>

          <div className="asset-studio-review-description">
            {form.description}
          </div>
        </div>
      )}

      {properties.length > 0 && (
        <div className="asset-studio-review-section">
          <div className="asset-studio-section-heading">
            <h3>
              Properties
            </h3>

            <p>
              Structured descriptive metadata selected
              for this asset.
            </p>
          </div>

          <div className="asset-studio-review-properties">
            {properties.map(
              (
                property,
                index
              ) => (
                <div
                  className="asset-studio-review-property"
                  key={`${property.key}-${index}`}
                >
                  <div className="asset-studio-review-property-heading">
                    <strong>
                      {property.label ||
                        property.key ||
                        `Property ${index + 1}`}
                    </strong>

                    <span>
                      {PROPERTY_TYPE_LABELS[
                        Number(
                          property.valueType
                        )
                      ] || "Unknown"}
                    </span>
                  </div>

                  <div className="asset-studio-review-property-value">
                    {property.value ||
                      "—"}

                    {property.unit
                      ? ` ${property.unit}`
                      : ""}
                  </div>

                  {property.key && (
                    <small>
                      Key:{" "}
                      {property.key}
                    </small>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {isFungible && (
        <ReviewSection
          title="Supply & features"
          description="ERC-20 issuance and token capabilities."
        >
          <ReviewRow
            label="Initial supply"
            value={
              form.initialSupply
            }
          />

          <ReviewRow
            label="Decimals"
            value={
              form.decimals ??
              18
            }
          />

          <ReviewRow
            label="Supply model"
            value={supplyModel}
          />

          {form.supplyModel ===
            "capped" && (
            <ReviewRow
              label="Maximum supply"
              value={
                form.maxSupply
              }
            />
          )}

          <ReviewRow
            label="Minting"
            value={
              form.mintEnabled
                ? "Enabled"
                : "Disabled"
            }
          />

          <ReviewRow
            label="Pausable"
            value={
              form.pauseEnabled
                ? "Enabled"
                : "Disabled"
            }
          />
        </ReviewSection>
      )}

      {isERC721 && (
        <ReviewSection
          title="ERC-721 features"
          description="Collection issuance and capabilities."
        >
          <ReviewRow
            label="Lifetime maximum supply"
            value={
              form.maxSupply ||
              "No collection cap"
            }
          />

          <ReviewRow
            label="Minting"
            value={
              form.mintEnabled
                ? "Enabled"
                : "Disabled"
            }
          />

          <ReviewRow
            label="Pausable"
            value={
              form.pauseEnabled
                ? "Enabled"
                : "Disabled"
            }
          />
        </ReviewSection>
      )}

      {isERC1155 && (
        <ReviewSection
          title="ERC-1155 features"
          description="Collection-level capabilities."
        >
          <ReviewRow
            label="Token types"
            value="Created after collection deployment"
          />

          <ReviewRow
            label="Minting"
            value={
              form.mintEnabled
                ? "Enabled"
                : "Disabled"
            }
          />

          <ReviewRow
            label="Pausable"
            value={
              form.pauseEnabled
                ? "Enabled"
                : "Disabled"
            }
          />
        </ReviewSection>
      )}

      {form.physicalEnabled && (
        <ReviewSection
          title="Physical / 3D"
          description="Optional object and model references."
        >
          <ReviewRow
            label="Object name"
            value={
              form.objectName
            }
          />

          <ReviewRow
            label="External identifier"
            value={
              form.externalObjectId
            }
          />

          <ReviewRow
            label="3D model"
            value={
              form.modelEnabled
                ? "Enabled"
                : "Not attached"
            }
          />

          {form.modelEnabled && (
            <>
              <ReviewRow
                label="Model format"
                value={
                  form.modelFormat
                }
              />

              <ReviewRow
                label="Model URI"
                value={
                  form.modelURI
                }
              />

              <ReviewRow
                label="Model hash"
                value={
                  form.modelHash
                }
              />

              <ReviewRow
                label="Shape fingerprint"
                value={
                  form.shapeFingerprint
                }
              />
            </>
          )}

          <ReviewRow
            label="Object binding"
            value={
              form.objectBindingEnabled
                ? "Requested"
                : "Not requested"
            }
          />
        </ReviewSection>
      )}

      <ReviewSection
        title="Authorities"
        description="Addresses selected to control supported asset capabilities."
      >
        <ReviewRow
          label="Administrator"
          value={
            form.adminAddress ||
            account
          }
        />

        <ReviewRow
          label="Metadata authority"
          value={
            form.metadataAuthority ||
            account
          }
        />

        {form.mintEnabled && (
          <ReviewRow
            label="Mint authority"
            value={
              form.mintAuthority ||
              account
            }
          />
        )}

        {form.pauseEnabled && (
          <ReviewRow
            label="Pause authority"
            value={
              form.pauseAuthority ||
              account
            }
          />
        )}
      </ReviewSection>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            On-chain creation
          </strong>

          <p>
            The asset contract and its Numen registry
            record are separate protocol components.
            Physical references, model data and object
            bindings do not by themselves represent a
            Numen authenticity or legal ownership
            verification.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetReviewStep;