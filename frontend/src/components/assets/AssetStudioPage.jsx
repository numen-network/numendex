import {
  useMemo,
  useState,
} from "react";

import "./AssetStudioPage.css";

import AssetTypeStep from "./AssetTypeStep";
import AssetIdentityStep from "./AssetIdentityStep";
import AssetPropertiesStep from "./AssetPropertiesStep";
import AssetFeaturesStep from "./AssetFeaturesStep";
import AssetPhysicalStep from "./AssetPhysicalStep";
import AssetPermissionsStep from "./AssetPermissionsStep";
import AssetReviewStep from "./AssetReviewStep";
import useAssetCreation from "../../hooks/useAssetCreation";
import { NUMEN_NETWORK } from "../../config/network";

const STEPS = [
  {
    id: 1,
    title: "Asset Type",
    description:
      "Choose the fundamental asset standard.",
  },
  {
    id: 2,
    title: "Identity",
    description:
      "Define the asset name and classification.",
  },
  {
    id: 3,
    title: "Properties",
    description:
      "Add metadata and custom properties.",
  },
  {
    id: 4,
    title: "Features",
    description:
      "Configure supply and token capabilities.",
  },
  {
    id: 5,
    title: "Physical / 3D",
    description:
      "Optionally connect physical or 3D data.",
  },
  {
    id: 6,
    title: "Rights & Permissions",
    description:
      "Configure administration and authorities.",
  },
  {
    id: 7,
    title: "Review",
    description:
      "Review and create the asset.",
  },
];

const createInitialForm = (
  account = ""
) => ({
  assetClass: "",
  nftStandard: "",

  name: "",
  symbol: "",
  description: "",

  category: 0,
  customCategory: "",

  representation: 1,
  customRepresentation: "",

  metadataURI: "",

  properties: [],

  initialSupply: "",
  decimals: 18,
  supplyModel: "fixed",
  maxSupply: "",

  mintEnabled: false,
  burnEnabled: false,
  pauseEnabled: false,
  permitEnabled: false,
  votesEnabled: false,

  physicalEnabled: false,

  objectName: "",
  externalObjectId: "",
  objectDescription: "",

  modelEnabled: false,
  modelFormat: "OBJ",
  modelURI: "",
  modelHash: "",
  shapeFingerprint: "",

  objectBindingEnabled: false,

  initialRecipient:
    account || "",

  adminAddress:
    account || "",

  metadataAuthority:
    account || "",

  mintAuthority:
    account || "",

  pauseAuthority:
    account || "",
});

function AssetStudioPage({
  account,
  connecting,
  isNumenNetwork,
  onConnect,
  onSwitchNetwork,
  onBack,
}) {
  const {
    creating,
    creationStage,
    creationError,
    creationResult,
    create: createAsset,
    resetCreation,
  } = useAssetCreation();

  const [
    step,
    setStep,
  ] = useState(1);

  const [
    form,
    setForm,
  ] = useState(() =>
    createInitialForm(
      account
    )
  );

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const currentStep =
    useMemo(
      () =>
        STEPS.find(
          (item) =>
            item.id === step
        ) || STEPS[0],
      [step]
    );

  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setValidationError(
      ""
    );
  };

  const handleReset = () => {
    resetCreation();
    setStep(1);

    setForm(
      createInitialForm(
        account
      )
    );

    setValidationError(
      ""
    );
  };

  const handleSelectAssetClass = (
    value
  ) => {
    setForm(
      (current) => ({
        ...current,

        assetClass:
          value,

        nftStandard:
          value ===
          "non-fungible"
            ? current.nftStandard
            : "",

        supplyModel:
          value ===
          "fungible"
            ? current.supplyModel ||
              "fixed"
            : "",

        initialSupply:
          value ===
          "fungible"
            ? current.initialSupply
            : "",

        decimals:
          value ===
          "fungible"
            ? current.decimals ??
              18
            : 18,

        maxSupply: "",

        mintEnabled:
          value ===
          "fungible"
            ? current.supplyModel ===
                "capped" ||
              current.supplyModel ===
                "uncapped"
            : true,

        permitEnabled:
          value === "fungible"
            ? current.permitEnabled
            : false,

        votesEnabled:
          value === "fungible"
            ? current.votesEnabled
            : false,

        initialRecipient:
          value === "fungible"
            ? current.initialRecipient || account || ""
            : "",
      })
    );

    setValidationError(
      ""
    );
  };

  const validateAddress = (
    value
  ) => {
    return /^0x[a-fA-F0-9]{40}$/.test(
      String(
        value || ""
      ).trim()
    );
  };

  const validatePositiveNumber = (
    value
  ) => {
    const normalized =
      String(
        value ?? ""
      ).trim();

    if (!normalized) {
      return false;
    }

    const number =
      Number(
        normalized
      );

    return (
      Number.isFinite(
        number
      ) &&
      number > 0
    );
  };

  const validateNonNegativeInteger = (
    value
  ) => {
    const normalized =
      String(
        value ?? ""
      ).trim();

    if (!normalized) {
      return false;
    }

    if (
      !/^\d+$/.test(
        normalized
      )
    ) {
      return false;
    }

    return true;
  };

  const validateStepOne = () => {
    if (
      !form.assetClass
    ) {
      return "Select an asset type.";
    }

    return "";
  };

  const validateStepTwo = () => {
    if (
      !form.name.trim()
    ) {
      return "Enter an asset name.";
    }

    if (
      !form.symbol.trim()
    ) {
      return "Enter an asset symbol.";
    }

    if (
      form.assetClass ===
        "non-fungible" &&
      !form.nftStandard
    ) {
      return "Select ERC-721 or ERC-1155.";
    }

    if (
      Number(
        form.category
      ) === 22 &&
      !form.customCategory.trim()
    ) {
      return "Enter the custom category.";
    }

    if (
      Number(
        form.representation
      ) === 12 &&
      !form.customRepresentation.trim()
    ) {
      return "Enter the custom representation.";
    }

    return "";
  };

  const validateStepThree = () => {
    const properties =
      Array.isArray(
        form.properties
      )
        ? form.properties
        : [];

    for (
      let index = 0;
      index <
      properties.length;
      index += 1
    ) {
      const property =
        properties[index];

      if (
        !String(
          property.key || ""
        ).trim()
      ) {
        return `Enter a key for property ${
          index + 1
        }.`;
      }

      if (
        !String(
          property.label ||
            ""
        ).trim()
      ) {
        return `Enter a label for property ${
          index + 1
        }.`;
      }

      if (
        !String(
          property.value ??
            ""
        ).trim()
      ) {
        return `Enter a value for property ${
          index + 1
        }.`;
      }
    }

    return "";
  };

  const validateStepFour = () => {
    if (
      form.assetClass ===
      "fungible"
    ) {
      if (
        !validatePositiveNumber(
          form.initialSupply
        )
      ) {
        return "Enter a valid initial supply greater than zero.";
      }

      const decimals =
        Number(
          form.decimals
        );

      if (
        !Number.isInteger(
          decimals
        ) ||
        decimals < 0 ||
        decimals > 18
      ) {
        return "Decimals must be between 0 and 18.";
      }

      if (
        !validateAddress(
          form.initialRecipient
        )
      ) {
        return "Enter a valid initial recipient address.";
      }

      if (
        ![
          "fixed",
          "capped",
          "uncapped",
        ].includes(
          form.supplyModel
        )
      ) {
        return "Select a supply model.";
      }

      if (
        form.supplyModel ===
        "fixed" &&
        form.mintEnabled
      ) {
        return "Minting cannot be enabled for a fixed-supply token.";
      }

      if (
        form.supplyModel ===
        "capped"
      ) {
        if (
          !validatePositiveNumber(
            form.maxSupply
          )
        ) {
          return "Enter a valid maximum supply.";
        }

        if (
          Number(
            form.maxSupply
          ) <
          Number(
            form.initialSupply
          )
        ) {
          return "Maximum supply cannot be lower than initial supply.";
        }
      }
    }

    if (
      form.assetClass ===
        "non-fungible" &&
      form.nftStandard ===
        "erc721" &&
      String(
        form.maxSupply ||
          ""
      ).trim()
    ) {
      if (
        !validateNonNegativeInteger(
          form.maxSupply
        ) ||
        Number(
          form.maxSupply
        ) <= 0
      ) {
        return "ERC-721 maximum supply must be a positive whole number.";
      }
    }

    return "";
  };

  const validateStepFive = () => {
    if (
      !form.physicalEnabled
    ) {
      return "";
    }

    if (
      form.modelEnabled
    ) {
      if (
        !form.modelFormat
      ) {
        return "Select a 3D model format.";
      }

      if (!String(form.modelURI || "").trim()) {
        return "Model URI is required when registering a Numen Object record.";
      }

      if (!String(form.modelHash || "").trim()) {
        return "Model hash is required when registering a Numen Object record.";
      }

      const modelHash =
        String(
          form.modelHash ||
            ""
        ).trim();

      if (
        modelHash &&
        !/^0x[a-fA-F0-9]{64}$/.test(
          modelHash
        )
      ) {
        return "Model hash must be a 32-byte 0x-prefixed hash.";
      }
    }

    return "";
  };

  const validateStepSix = () => {
    if (
      !validateAddress(
        form.adminAddress
      )
    ) {
      return "Enter a valid administrator address.";
    }

    if (
      !validateAddress(
        form.metadataAuthority
      )
    ) {
      return "Enter a valid metadata authority address.";
    }

    if (
      form.mintEnabled &&
      !validateAddress(
        form.mintAuthority
      )
    ) {
      return "Enter a valid mint authority address.";
    }

    if (
      form.pauseEnabled &&
      !validateAddress(
        form.pauseAuthority
      )
    ) {
      return "Enter a valid pause authority address.";
    }

    return "";
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      return validateStepOne();
    }

    if (step === 2) {
      return validateStepTwo();
    }

    if (step === 3) {
      return validateStepThree();
    }

    if (step === 4) {
      return validateStepFour();
    }

    if (step === 5) {
      return validateStepFive();
    }

    if (step === 6) {
      return validateStepSix();
    }

    return "";
  };

  const handleContinue = () => {
    const error =
      validateCurrentStep();

    if (error) {
      setValidationError(
        error
      );

      return;
    }

    setValidationError(
      ""
    );

    setStep(
      (current) =>
        Math.min(
          current + 1,
          STEPS.length
        )
    );
  };

  const handlePrevious = () => {
    setValidationError(
      ""
    );

    setStep(
      (current) =>
        Math.max(
          current - 1,
          1
        )
    );
  };

  const handleStepClick = (
    targetStep
  ) => {
    if (
      targetStep >= step
    ) {
      return;
    }

    setValidationError(
      ""
    );

    setStep(
      targetStep
    );
  };

  const handleCreateAsset = async () => {
    if (creating) {
      return;
    }

    if (!account) {
      setValidationError("Connect your wallet before creating the asset.");
      return;
    }

    if (!isNumenNetwork) {
      setValidationError("Switch your wallet to Numen Network before creating the asset.");
      return;
    }

    const validations = [
      validateStepOne,
      validateStepTwo,
      validateStepThree,
      validateStepFour,
      validateStepFive,
      validateStepSix,
    ];

    for (let index = 0; index < validations.length; index += 1) {
      const error = validations[index]();
      if (error) {
        setValidationError(error);
        setStep(index + 1);
        return;
      }
    }

    setValidationError("");

    try {
      await createAsset({ form, account });
    } catch {
      // The hook exposes the user-facing error.
    }
  };

  const renderCurrentStep = () => {
    if (step === 1) {
      return (
        <AssetTypeStep
          assetClass={
            form.assetClass
          }
          onSelect={
            handleSelectAssetClass
          }
        />
      );
    }

    if (step === 2) {
      return (
        <AssetIdentityStep
          form={form}
          onChange={
            updateForm
          }
        />
      );
    }

    if (step === 3) {
      return (
        <AssetPropertiesStep
          properties={
            form.properties
          }
          onChange={(
            properties
          ) =>
            updateForm(
              "properties",
              properties
            )
          }
        />
      );
    }

    if (step === 4) {
      return (
        <AssetFeaturesStep
          form={form}
          account={account}
          onChange={
            updateForm
          }
        />
      );
    }

    if (step === 5) {
      return (
        <AssetPhysicalStep
          form={form}
          onChange={
            updateForm
          }
        />
      );
    }

    if (step === 6) {
      return (
        <AssetPermissionsStep
          form={form}
          account={
            account
          }
          onChange={
            updateForm
          }
        />
      );
    }

    if (step === 7) {
      return (
        <AssetReviewStep
          form={form}
          account={
            account
          }
        />
      );
    }

    return null;
  };

  const renderWalletStatus = () => {
    if (!account) {
      return (
        <button
          type="button"
          className="asset-studio-primary-button"
          onClick={
            onConnect
          }
          disabled={
            connecting
          }
        >
          {connecting
            ? "Connecting..."
            : "Connect Wallet"}
        </button>
      );
    }

    if (
      !isNumenNetwork
    ) {
      return (
        <button
          type="button"
          className="asset-studio-primary-button"
          onClick={
            onSwitchNetwork
          }
        >
          Switch to Numen
        </button>
      );
    }

    return (
      <span className="asset-studio-network-badge">
        Numen Mainnet
      </span>
    );
  };

  return (
    <section className="asset-studio-page">
      <div className="asset-studio-page-inner">
        <div className="asset-studio-breadcrumb">
          <button
            type="button"
            onClick={onBack}
          >
            NumenDEX
          </button>

          <span>
            ›
          </span>

          <strong>
            Asset Studio
          </strong>
        </div>

        <div className="asset-studio-topbar">
          <button
            type="button"
            className="asset-studio-title-button"
            onClick={onBack}
          >
            <span>
              ←
            </span>

            <div>
              <strong>
                Numen Asset Studio
              </strong>

              <small>
                Create assets natively on Numen Network
              </small>
            </div>
          </button>

          <div className="asset-studio-topbar-actions">
            <button
              type="button"
              className="asset-studio-reset-button"
              onClick={
                handleReset
              }
            >
              ↶ Reset
            </button>

            {renderWalletStatus()}
          </div>
        </div>

        <div className="asset-studio-workspace">
          <aside className="asset-studio-steps">
            {STEPS.map(
              (
                item,
                index
              ) => {
                const isActive =
                  step ===
                  item.id;

                const isComplete =
                  step >
                  item.id;

                return (
                  <div
                    key={
                      item.id
                    }
                  >
                    <button
                      type="button"
                      className={`asset-studio-step ${
                        isActive
                          ? "active"
                          : ""
                      } ${
                        isComplete
                          ? "complete"
                          : ""
                      }`}
                      onClick={() =>
                        handleStepClick(
                          item.id
                        )
                      }
                    >
                      <div className="asset-studio-step-marker">
                        {isComplete
                          ? "✓"
                          : item.id}
                      </div>

                      <div className="asset-studio-step-copy">
                        <span>
                          Step{" "}
                          {
                            item.id
                          }
                        </span>

                        <strong>
                          {
                            item.title
                          }
                        </strong>
                      </div>
                    </button>

                    {index <
                      STEPS.length -
                        1 && (
                      <div className="asset-studio-step-line" />
                    )}
                  </div>
                );
              }
            )}
          </aside>

          <div className="asset-studio-main-card">
            <div className="asset-studio-card-heading">
              <div>
                <span className="asset-studio-step-label">
                  Step {step} of{" "}
                  {
                    STEPS.length
                  }
                </span>

                <h2>
                  {
                    currentStep.title
                  }
                </h2>

                <p>
                  {
                    currentStep.description
                  }
                </p>
              </div>
            </div>

            {renderCurrentStep()}

            {validationError && (
              <div className="asset-studio-message error">
                {
                  validationError
                }
              </div>
            )}

            {creationStage && !creationResult && !creationError && (
              <div className="asset-studio-message">
                {creationStage}
              </div>
            )}

            {creationError && (
              <div className="asset-studio-message error asset-studio-result-error" role="alert">
                <strong>✕ Asset creation failed</strong>
                <span>{creationError}</span>
              </div>
            )}

            {creationResult && (
              <div className="asset-studio-review-section asset-studio-result-success" role="status">
                <div className="asset-studio-section-heading">
                  <h3>✓ Asset created successfully</h3>
                  <p>The contract and Numen Asset Registry record were created successfully.</p>
                </div>

                <div className="asset-studio-review-grid">
                  <div className="asset-studio-review-row">
                    <span>Asset contract</span>
                    <strong>{creationResult.assetAddress}</strong>
                  </div>
                  <div className="asset-studio-review-row">
                    <span>Numen Asset ID</span>
                    <strong>{creationResult.assetId}</strong>
                  </div>
                  <div className="asset-studio-review-row">
                    <span>Transaction</span>
                    <strong>
                      <a href={`${NUMEN_NETWORK.blockExplorerUrls[0]}/tx/${creationResult.transactionHash}`} target="_blank" rel="noreferrer">
                        View on explorer
                      </a>
                    </strong>
                  </div>
                  {creationResult.object?.objectId && (
                    <div className="asset-studio-review-row">
                      <span>Numen Object ID</span>
                      <strong>{creationResult.object.objectId}</strong>
                    </div>
                  )}
                </div>

                {creationResult.warnings?.map((warning) => (
                  <div className="asset-studio-message" key={warning}>{warning}</div>
                ))}
              </div>
            )}

            <div className="asset-studio-navigation">
              {step > 1 && (
                <button
                  type="button"
                  className="asset-studio-secondary-button"
                  onClick={
                    handlePrevious
                  }
                >
                  Back
                </button>
              )}

              {step <
                STEPS.length && (
                <button
                  type="button"
                  className="asset-studio-primary-button"
                  onClick={
                    handleContinue
                  }
                  disabled={
                    step === 1 &&
                    !form.assetClass
                  }
                >
                  Continue
                </button>
              )}

              {step ===
                STEPS.length && (
                <button
                  type="button"
                  className="asset-studio-primary-button"
                  onClick={handleCreateAsset}
                  disabled={creating || !account || !isNumenNetwork}
                  title={
                    !account
                      ? "Connect your wallet first."
                      : !isNumenNetwork
                        ? "Switch to Numen Network first."
                        : "Create this asset on Numen Network."
                  }
                >
                  {creating ? "Creating..." : "Create Asset"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AssetStudioPage;