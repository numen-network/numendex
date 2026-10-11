const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenDocumentRegistry", function () {
  let deployer;
  let creator;
  let controller;
  let registrar;
  let secondRegistrar;
  let attacker;
  let recipient;
  let metadataAuthority;

  let assetRegistry;
  let objectRegistry;
  let documentRegistry;
  let asset;

  let assetId;
  let objectId;

  const SupplyModel = {
    NOT_APPLICABLE: 0,
    FIXED: 1,
    CAPPED: 2,
    UNCAPPED: 3,
  };

  const AssetCategory = {
    UNSPECIFIED: 0,
    CURRENCY: 1,
    PAYMENT: 2,
    UTILITY: 3,
    GOVERNANCE: 4,
    COMMUNITY: 5,
    GAMING: 6,
    COMMODITY: 7,
    REAL_ESTATE: 8,
    PRECIOUS_METAL: 9,
    PRECIOUS_STONE: 10,
    COLLECTIBLE: 11,
    ARTWORK: 12,
    CULTURAL_HERITAGE: 13,
    PRODUCT: 14,
    VEHICLE: 15,
    MACHINERY: 16,
    INTELLECTUAL_PROPERTY: 17,
    MEDIA: 18,
    CERTIFICATE: 19,
    IDENTITY: 20,
    FINANCIAL_ASSET: 21,
    CUSTOM: 22,
  };

  const RepresentationType = {
    UNSPECIFIED: 0,
    DIGITAL_ASSET: 1,
    PHYSICAL_REFERENCE: 2,
    DIGITAL_TWIN: 3,
    FRACTIONAL_INTEREST: 4,
    OWNERSHIP_CLAIM: 5,
    USAGE_RIGHT: 6,
    REVENUE_RIGHT: 7,
    CERTIFICATE: 8,
    PRODUCT_PASSPORT: 9,
    MEMBERSHIP: 10,
    LICENSE: 11,
    CUSTOM: 12,
  };

  function hashText(value) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(value)
    );
  }

  function createAssetConfig(
    overrides = {}
  ) {
    return {
      name:
        "Document Test Asset",

      symbol:
        "DTA",

      decimals:
        18,

      initialSupply:
        ethers.parseUnits(
          "1000000",
          18
        ),

      maxSupply:
        ethers.parseUnits(
          "1000000",
          18
        ),

      supplyModel:
        SupplyModel.FIXED,

      mintable:
        false,

      burnable:
        true,

      pausable:
        false,

      permitEnabled:
        true,

      votesEnabled:
        true,

      objectBindingEnabled:
        true,

      category:
        AssetCategory.MACHINERY,

      representation:
        RepresentationType
          .DIGITAL_TWIN,

      metadataURI:
        "ipfs://document-test-asset",

      metadataHash:
        hashText(
          "document-test-asset"
        ),

      creator:
        creator.address,

      admin:
        controller.address,

      initialRecipient:
        recipient.address,

      mintAuthority:
        ethers.ZeroAddress,

      pauseAuthority:
        ethers.ZeroAddress,

      metadataAuthority:
        metadataAuthority.address,

      registry:
        assetRegistry.target,

      ...overrides,
    };
  }

  function createObjectRequest(
    overrides = {}
  ) {
    return {
      creator:
        creator.address,

      controller:
        controller.address,

      modelURI:
        "ipfs://document-test-object.glb",

      modelHash:
        hashText(
          "document-test-object-model"
        ),

      modelFormat:
        "GLB",

      spectralFingerprint:
        hashText(
          "document-test-object-spectral"
        ),

      spectralAlgorithm:
        "spectral3d",

      spectralVersion:
        "asset-v1",

      metadataURI:
        "ipfs://document-test-object.json",

      metadataHash:
        hashText(
          "document-test-object-metadata"
        ),

      ...overrides,
    };
  }

  function createAssetDocumentRequest(
    overrides = {}
  ) {
    return {
      assetId:
        assetId,

      objectId:
        ethers.ZeroHash,

      documentType:
        "INSPECTION_REPORT",

      documentURI:
        "ipfs://documents/inspection-report.pdf",

      documentHash:
        hashText(
          "inspection-report-pdf"
        ),

      mimeType:
        "application/pdf",

      issuer:
        "Example Inspection Company",

      issuedAt:
        0,

      expiresAt:
        0,

      ...overrides,
    };
  }

  function createObjectDocumentRequest(
    overrides = {}
  ) {
    return {
      assetId:
        ethers.ZeroHash,

      objectId:
        objectId,

      documentType:
        "MODEL_CERTIFICATE",

      documentURI:
        "ipfs://documents/model-certificate.pdf",

      documentHash:
        hashText(
          "model-certificate-pdf"
        ),

      mimeType:
        "application/pdf",

      issuer:
        "Example Model Laboratory",

      issuedAt:
        0,

      expiresAt:
        0,

      ...overrides,
    };
  }

  async function deploySystem() {
    const AssetRegistry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    assetRegistry =
      await AssetRegistry.deploy();

    await assetRegistry
      .waitForDeployment();

    const ObjectRegistry =
      await ethers.getContractFactory(
        "NumenObjectRegistry"
      );

    objectRegistry =
      await ObjectRegistry.deploy();

    await objectRegistry
      .waitForDeployment();

    const DocumentRegistry =
      await ethers.getContractFactory(
        "NumenDocumentRegistry"
      );

    documentRegistry =
      await DocumentRegistry.deploy(
        assetRegistry.target,
        objectRegistry.target
      );

    await documentRegistry
      .waitForDeployment();

    const Asset =
      await ethers.getContractFactory(
        "NumenFungibleAsset"
      );

    asset =
      await Asset.deploy(
        createAssetConfig()
      );

    await asset
      .waitForDeployment();

    await asset
      .registerNumenAsset();

    assetId =
      await asset.numenAssetId();

    const objectTx =
      await objectRegistry
        .connect(creator)
        .registerObject(
          createObjectRequest()
        );

    const receipt =
      await objectTx.wait();

    let registeredEvent = null;

    for (
      const log of receipt.logs
    ) {
      try {
        const parsed =
          objectRegistry
            .interface
            .parseLog(log);

        if (
          parsed &&
          parsed.name ===
            "ObjectRegistered"
        ) {
          registeredEvent =
            parsed;

          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(
      registeredEvent
    ).to.not.equal(null);

    objectId =
      registeredEvent
        .args
        .objectId;
  }

  async function registerAssetDocument(
    overrides = {},
    signer = registrar
  ) {
    const request =
      createAssetDocumentRequest(
        overrides
      );

    const tx =
      await documentRegistry
        .connect(signer)
        .registerDocument(
          request
        );

    const receipt =
      await tx.wait();

    let event = null;

    for (
      const log of receipt.logs
    ) {
      try {
        const parsed =
          documentRegistry
            .interface
            .parseLog(log);

        if (
          parsed &&
          parsed.name ===
            "DocumentRegistered"
        ) {
          event = parsed;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(
      event
    ).to.not.equal(null);

    return {
      request,
      tx,
      receipt,
      event,

      documentId:
        event.args.documentId,
    };
  }

  async function registerObjectDocument(
    overrides = {},
    signer = registrar
  ) {
    const request =
      createObjectDocumentRequest(
        overrides
      );

    const tx =
      await documentRegistry
        .connect(signer)
        .registerDocument(
          request
        );

    const receipt =
      await tx.wait();

    let event = null;

    for (
      const log of receipt.logs
    ) {
      try {
        const parsed =
          documentRegistry
            .interface
            .parseLog(log);

        if (
          parsed &&
          parsed.name ===
            "DocumentRegistered"
        ) {
          event = parsed;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(
      event
    ).to.not.equal(null);

    return {
      request,
      tx,
      receipt,
      event,

      documentId:
        event.args.documentId,
    };
  }

  beforeEach(
    async function () {
      [
        deployer,
        creator,
        controller,
        registrar,
        secondRegistrar,
        attacker,
        recipient,
        metadataAuthority,
      ] =
        await ethers.getSigners();

      await deploySystem();
    }
  );

  describe(
    "Deployment",
    function () {
      it(
        "deploys with correct registries",
        async function () {
          expect(
            await documentRegistry
              .assetRegistry()
          ).to.equal(
            assetRegistry.target
          );

          expect(
            await documentRegistry
              .objectRegistry()
          ).to.equal(
            objectRegistry.target
          );
        }
      );

      it(
        "returns correct version",
        async function () {
          expect(
            await documentRegistry
              .documentRegistryVersion()
          ).to.equal(
            hashText(
              "NUMEN_DOCUMENT_REGISTRY_V1"
            )
          );
        }
      );

      it(
        "starts empty",
        async function () {
          expect(
            await documentRegistry
              .totalDocuments()
          ).to.equal(0n);
        }
      );

      it(
        "rejects zero asset registry",
        async function () {
          const Registry =
            await ethers
              .getContractFactory(
                "NumenDocumentRegistry"
              );

          await expect(
            Registry.deploy(
              ethers.ZeroAddress,
              objectRegistry.target
            )
          ).to.be
            .revertedWithCustomError(
              Registry,
              "ZeroAddress"
            );
        }
      );

      it(
        "rejects zero object registry",
        async function () {
          const Registry =
            await ethers
              .getContractFactory(
                "NumenDocumentRegistry"
              );

          await expect(
            Registry.deploy(
              assetRegistry.target,
              ethers.ZeroAddress
            )
          ).to.be
            .revertedWithCustomError(
              Registry,
              "ZeroAddress"
            );
        }
      );
    }
  );

  describe(
    "Asset documents",
    function () {
      it(
        "registers asset document",
        async function () {
          const result =
            await registerAssetDocument();

          expect(
            await documentRegistry
              .documentExists(
                result.documentId
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .totalDocuments()
          ).to.equal(1n);
        }
      );

      it(
        "stores complete asset document",
        async function () {
          const result =
            await registerAssetDocument();

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.documentId
          ).to.equal(
            result.documentId
          );

          expect(
            record.assetId
          ).to.equal(
            assetId
          );

          expect(
            record.objectId
          ).to.equal(
            ethers.ZeroHash
          );

          expect(
            record.registeredBy
          ).to.equal(
            registrar.address
          );

          expect(
            record.documentType
          ).to.equal(
            result.request
              .documentType
          );

          expect(
            record.documentURI
          ).to.equal(
            result.request
              .documentURI
          );

          expect(
            record.documentHash
          ).to.equal(
            result.request
              .documentHash
          );

          expect(
            record.mimeType
          ).to.equal(
            result.request
              .mimeType
          );

          expect(
            record.issuer
          ).to.equal(
            result.request
              .issuer
          );

          expect(
            record.issuedAt
          ).to.equal(0n);

          expect(
            record.expiresAt
          ).to.equal(0n);

          expect(
            record.registeredAt
          ).to.be.greaterThan(
            0n
          );

          expect(
            record.revokedAt
          ).to.equal(0n);

          expect(
            record.revoked
          ).to.equal(false);
        }
      );

      it(
        "emits DocumentRegistered",
        async function () {
          const request =
            createAssetDocumentRequest();

          const tx =
            await documentRegistry
              .connect(registrar)
              .registerDocument(
                request
              );

          const receipt =
            await tx.wait();

          let event = null;

          for (
            const log of
              receipt.logs
          ) {
            try {
              const parsed =
                documentRegistry
                  .interface
                  .parseLog(log);

              if (
                parsed &&
                parsed.name ===
                  "DocumentRegistered"
              ) {
                event = parsed;
                break;
              }
            } catch {
              // Ignore unrelated logs.
            }
          }

          expect(
            event
          ).to.not.equal(null);

          expect(
            event.args.targetId
          ).to.equal(
            assetId
          );

          expect(
            event.args.registeredBy
          ).to.equal(
            registrar.address
          );

          expect(
            event.args.targetIsAsset
          ).to.equal(true);

          expect(
            event.args.documentHash
          ).to.equal(
            request.documentHash
          );

          expect(
            event.args.documentType
          ).to.equal(
            request.documentType
          );
        }
      );
    }
  );

  describe(
    "Object documents",
    function () {
      it(
        "registers object document",
        async function () {
          const result =
            await registerObjectDocument();

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.assetId
          ).to.equal(
            ethers.ZeroHash
          );

          expect(
            record.objectId
          ).to.equal(
            objectId
          );

          expect(
            record.registeredBy
          ).to.equal(
            registrar.address
          );
        }
      );

      it(
        "emits object target correctly",
        async function () {
          const result =
            await registerObjectDocument();

          expect(
            result.event
              .args
              .targetId
          ).to.equal(
            objectId
          );

          expect(
            result.event
              .args
              .targetIsAsset
          ).to.equal(false);
        }
      );
    }
  );

  describe(
    "Privacy-oriented registration",
    function () {
      it(
        "allows hash-only document registration",
        async function () {
          const documentHash =
            hashText(
              "private-document"
            );

          const result =
            await registerAssetDocument({
              documentURI: "",
              documentHash,
              mimeType:
                "application/pdf",
            });

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.documentURI
          ).to.equal("");

          expect(
            record.documentHash
          ).to.equal(
            documentHash
          );
        }
      );

      it(
        "allows empty issuer",
        async function () {
          const result =
            await registerAssetDocument({
              issuer: "",
            });

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.issuer
          ).to.equal("");
        }
      );

      it(
        "allows empty MIME type",
        async function () {
          const result =
            await registerAssetDocument({
              mimeType: "",
            });

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.mimeType
          ).to.equal("");
        }
      );
    }
  );

  describe(
    "Permissionless registration",
    function () {
      it(
        "allows unrelated address to register a document",
        async function () {
          await expect(
            documentRegistry
              .connect(attacker)
              .registerDocument(
                createAssetDocumentRequest()
              )
          ).to.not.be.reverted;
        }
      );

      it(
        "records actual caller as registrar",
        async function () {
          const result =
            await registerAssetDocument(
              {},
              attacker
            );

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.registeredBy
          ).to.equal(
            attacker.address
          );
        }
      );

      it(
        "supports multiple registrars",
        async function () {
          const first =
            await registerAssetDocument(
              {
                documentHash:
                  hashText(
                    "registrar-a"
                  ),
              },
              registrar
            );

          const second =
            await registerAssetDocument(
              {
                documentHash:
                  hashText(
                    "registrar-b"
                  ),
              },
              secondRegistrar
            );

          expect(
            first.documentId
          ).to.not.equal(
            second.documentId
          );

          expect(
            await documentRegistry
              .totalDocuments()
          ).to.equal(2n);
        }
      );
    }
  );

  describe(
    "Target validation",
    function () {
      it(
        "rejects no target",
        async function () {
          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument({
                ...createAssetDocumentRequest(),

                assetId:
                  ethers.ZeroHash,

                objectId:
                  ethers.ZeroHash,
              })
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidTarget"
            );
        }
      );

      it(
        "rejects both targets",
        async function () {
          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument({
                ...createAssetDocumentRequest(),

                assetId:
                  assetId,

                objectId:
                  objectId,
              })
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidTarget"
            );
        }
      );

      it(
        "rejects unknown asset",
        async function () {
          const unknown =
            hashText(
              "unknown-asset"
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest({
                  assetId:
                    unknown,
                })
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "AssetNotFound"
            )
            .withArgs(
              unknown
            );
        }
      );

      it(
        "rejects inactive asset",
        async function () {
          await assetRegistry
            .connect(controller)
            .deactivateAsset(
              assetId
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest()
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "AssetInactive"
            )
            .withArgs(
              assetId
            );
        }
      );

      it(
        "rejects unknown object",
        async function () {
          const unknown =
            hashText(
              "unknown-object"
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createObjectDocumentRequest({
                  objectId:
                    unknown,
                })
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "ObjectNotFound"
            )
            .withArgs(
              unknown
            );
        }
      );

      it(
        "rejects inactive object",
        async function () {
          await objectRegistry
            .connect(controller)
            .deactivateObject(
              objectId
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createObjectDocumentRequest()
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "ObjectInactive"
            )
            .withArgs(
              objectId
            );
        }
      );
    }
  );

  describe(
    "Document validation",
    function () {
      it(
        "rejects zero document hash",
        async function () {
          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest({
                  documentHash:
                    ethers.ZeroHash,
                })
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "EmptyDocumentHash"
            );
        }
      );

      it(
        "rejects empty document type",
        async function () {
          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest({
                  documentType:
                    "",
                })
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "EmptyDocumentType"
            );
        }
      );
    }
  );

  describe(
    "Issued and expiration dates",
    function () {
      it(
        "stores issuedAt",
        async function () {
          const block =
            await ethers.provider
              .getBlock(
                "latest"
              );

          const issuedAt =
            block.timestamp -
            86400;

          const result =
            await registerAssetDocument({
              issuedAt,
            });

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.issuedAt
          ).to.equal(
            BigInt(
              issuedAt
            )
          );
        }
      );

      it(
        "allows future expiration",
        async function () {
          const block =
            await ethers.provider
              .getBlock(
                "latest"
              );

          const expiresAt =
            block.timestamp +
            3600;

          const result =
            await registerAssetDocument({
              expiresAt,
            });

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.expiresAt
          ).to.equal(
            BigInt(
              expiresAt
            )
          );

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(true);
        }
      );

      it(
        "rejects expiration in past",
        async function () {
          const block =
            await ethers.provider
              .getBlock(
                "latest"
              );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest({
                  expiresAt:
                    block.timestamp -
                    1,
                })
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidExpiration"
            );
        }
      );

      it(
        "becomes inactive at expiration",
        async function () {
          const block =
            await ethers.provider
              .getBlock(
                "latest"
              );

          const expiresAt =
            block.timestamp +
            100;

          const result =
            await registerAssetDocument({
              expiresAt,
            });

          await ethers.provider
            .send(
              "evm_setNextBlockTimestamp",
              [expiresAt]
            );

          await ethers.provider
            .send(
              "evm_mine",
              []
            );

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(false);

          expect(
            await documentRegistry
              .isDocumentExpired(
                result.documentId
              )
          ).to.equal(true);
        }
      );

      it(
        "non-expiring document remains non-expired",
        async function () {
          const result =
            await registerAssetDocument({
              expiresAt: 0,
            });

          expect(
            await documentRegistry
              .isDocumentExpired(
                result.documentId
              )
          ).to.equal(false);

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(true);
        }
      );
    }
  );

  describe(
    "Revocation",
    function () {
      it(
        "allows registrar to revoke",
        async function () {
          const result =
            await registerAssetDocument();

          await documentRegistry
            .connect(registrar)
            .revokeDocument(
              result.documentId
            );

          const record =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            record.revoked
          ).to.equal(true);

          expect(
            record.revokedAt
          ).to.be.greaterThan(
            0n
          );

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(false);
        }
      );

      it(
        "emits DocumentRevoked",
        async function () {
          const result =
            await registerAssetDocument();

          const tx =
            await documentRegistry
              .connect(registrar)
              .revokeDocument(
                result.documentId
              );

          const receipt =
            await tx.wait();

          let event = null;

          for (
            const log of
              receipt.logs
          ) {
            try {
              const parsed =
                documentRegistry
                  .interface
                  .parseLog(log);

              if (
                parsed &&
                parsed.name ===
                  "DocumentRevoked"
              ) {
                event =
                  parsed;

                break;
              }
            } catch {
              // Ignore unrelated logs.
            }
          }

          expect(
            event
          ).to.not.equal(null);

          expect(
            event.args.documentId
          ).to.equal(
            result.documentId
          );

          expect(
            event.args.registeredBy
          ).to.equal(
            registrar.address
          );

          expect(
            event.args.revokedAt
          ).to.be.greaterThan(
            0n
          );
        }
      );

      it(
        "rejects revocation by another address",
        async function () {
          const result =
            await registerAssetDocument();

          await expect(
            documentRegistry
              .connect(attacker)
              .revokeDocument(
                result.documentId
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "Unauthorized"
            )
            .withArgs(
              attacker.address,
              result.documentId
            );
        }
      );

      it(
        "rejects double revocation",
        async function () {
          const result =
            await registerAssetDocument();

          await documentRegistry
            .connect(registrar)
            .revokeDocument(
              result.documentId
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .revokeDocument(
                result.documentId
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "DocumentAlreadyRevoked"
            )
            .withArgs(
              result.documentId
            );
        }
      );

      it(
        "rejects unknown document",
        async function () {
          const unknown =
            hashText(
              "unknown-document"
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .revokeDocument(
                unknown
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "DocumentNotFound"
            )
            .withArgs(
              unknown
            );
        }
      );

      it(
        "preserves revoked document",
        async function () {
          const result =
            await registerAssetDocument();

          await documentRegistry
            .connect(registrar)
            .revokeDocument(
              result.documentId
            );

          expect(
            await documentRegistry
              .documentExists(
                result.documentId
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .totalDocuments()
          ).to.equal(1n);

          expect(
            await documentRegistry
              .assetDocumentCount(
                assetId
              )
          ).to.equal(1n);
        }
      );
    }
  );

  describe(
    "Document immutability",
    function () {
      it(
        "preserves document data after revocation",
        async function () {
          const result =
            await registerAssetDocument();

          const before =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          await documentRegistry
            .connect(registrar)
            .revokeDocument(
              result.documentId
            );

          const after =
            await documentRegistry
              .getDocument(
                result.documentId
              );

          expect(
            after.assetId
          ).to.equal(
            before.assetId
          );

          expect(
            after.objectId
          ).to.equal(
            before.objectId
          );

          expect(
            after.registeredBy
          ).to.equal(
            before.registeredBy
          );

          expect(
            after.documentType
          ).to.equal(
            before.documentType
          );

          expect(
            after.documentURI
          ).to.equal(
            before.documentURI
          );

          expect(
            after.documentHash
          ).to.equal(
            before.documentHash
          );

          expect(
            after.mimeType
          ).to.equal(
            before.mimeType
          );

          expect(
            after.issuer
          ).to.equal(
            before.issuer
          );

          expect(
            after.issuedAt
          ).to.equal(
            before.issuedAt
          );

          expect(
            after.expiresAt
          ).to.equal(
            before.expiresAt
          );

          expect(
            after.registeredAt
          ).to.equal(
            before.registeredAt
          );

          expect(
            after.revoked
          ).to.equal(true);
        }
      );
    }
  );

  describe(
    "Document hash lookup",
    function () {
      it(
        "finds document by hash",
        async function () {
          const hash =
            hashText(
              "shared-document"
            );

          const result =
            await registerAssetDocument({
              documentHash:
                hash,
            });

          expect(
            await documentRegistry
              .documentHashExists(
                hash
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .documentHashCount(
                hash
              )
          ).to.equal(1n);

          expect(
            await documentRegistry
              .documentIdByHashAt(
                hash,
                0
              )
          ).to.equal(
            result.documentId
          );
        }
      );

      it(
        "supports same hash registered multiple times",
        async function () {
          const hash =
            hashText(
              "shared-document"
            );

          const first =
            await registerAssetDocument(
              {
                documentHash:
                  hash,
              },
              registrar
            );

          const second =
            await registerAssetDocument(
              {
                documentHash:
                  hash,
              },
              secondRegistrar
            );

          expect(
            first.documentId
          ).to.not.equal(
            second.documentId
          );

          expect(
            await documentRegistry
              .documentHashCount(
                hash
              )
          ).to.equal(2n);

          const ids =
            await documentRegistry
              .documentIdsByHash(
                hash
              );

          expect(
            ids.length
          ).to.equal(2);

          expect(
            ids[0]
          ).to.equal(
            first.documentId
          );

          expect(
            ids[1]
          ).to.equal(
            second.documentId
          );
        }
      );

      it(
        "returns false for unknown hash",
        async function () {
          expect(
            await documentRegistry
              .documentHashExists(
                hashText(
                  "unknown-hash"
                )
              )
          ).to.equal(false);
        }
      );

      it(
        "rejects invalid hash index",
        async function () {
          const hash =
            hashText(
              "unknown-hash"
            );

          await expect(
            documentRegistry
              .documentIdByHashAt(
                hash,
                0
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidIndex"
            );
        }
      );
    }
  );

  describe(
    "Global enumeration",
    function () {
      it(
        "enumerates documents",
        async function () {
          const first =
            await registerAssetDocument({
              documentHash:
                hashText(
                  "global-1"
                ),
            });

          const second =
            await registerObjectDocument({
              documentHash:
                hashText(
                  "global-2"
                ),
            });

          expect(
            await documentRegistry
              .totalDocuments()
          ).to.equal(2n);

          expect(
            await documentRegistry
              .documentIdAt(0)
          ).to.equal(
            first.documentId
          );

          expect(
            await documentRegistry
              .documentIdAt(1)
          ).to.equal(
            second.documentId
          );

          const ids =
            await documentRegistry
              .allDocumentIds();

          expect(
            ids.length
          ).to.equal(2);
        }
      );

      it(
        "rejects invalid global index",
        async function () {
          await expect(
            documentRegistry
              .documentIdAt(0)
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidIndex"
            );
        }
      );
    }
  );

  describe(
    "Asset enumeration",
    function () {
      it(
        "enumerates asset documents",
        async function () {
          const first =
            await registerAssetDocument({
              documentHash:
                hashText(
                  "asset-doc-1"
                ),
            });

          const second =
            await registerAssetDocument({
              documentHash:
                hashText(
                  "asset-doc-2"
                ),
            });

          expect(
            await documentRegistry
              .assetDocumentCount(
                assetId
              )
          ).to.equal(2n);

          expect(
            await documentRegistry
              .assetDocumentIdAt(
                assetId,
                0
              )
          ).to.equal(
            first.documentId
          );

          expect(
            await documentRegistry
              .assetDocumentIdAt(
                assetId,
                1
              )
          ).to.equal(
            second.documentId
          );

          const ids =
            await documentRegistry
              .assetDocumentIds(
                assetId
              );

          expect(
            ids.length
          ).to.equal(2);
        }
      );

      it(
        "keeps object documents out of asset list",
        async function () {
          await registerObjectDocument();

          expect(
            await documentRegistry
              .assetDocumentCount(
                assetId
              )
          ).to.equal(0n);
        }
      );

      it(
        "rejects invalid asset index",
        async function () {
          await expect(
            documentRegistry
              .assetDocumentIdAt(
                assetId,
                0
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidIndex"
            );
        }
      );
    }
  );

  describe(
    "Object enumeration",
    function () {
      it(
        "enumerates object documents",
        async function () {
          const first =
            await registerObjectDocument({
              documentHash:
                hashText(
                  "object-doc-1"
                ),
            });

          const second =
            await registerObjectDocument({
              documentHash:
                hashText(
                  "object-doc-2"
                ),
            });

          expect(
            await documentRegistry
              .objectDocumentCount(
                objectId
              )
          ).to.equal(2n);

          expect(
            await documentRegistry
              .objectDocumentIdAt(
                objectId,
                0
              )
          ).to.equal(
            first.documentId
          );

          expect(
            await documentRegistry
              .objectDocumentIdAt(
                objectId,
                1
              )
          ).to.equal(
            second.documentId
          );

          const ids =
            await documentRegistry
              .objectDocumentIds(
                objectId
              );

          expect(
            ids.length
          ).to.equal(2);
        }
      );

      it(
        "keeps asset documents out of object list",
        async function () {
          await registerAssetDocument();

          expect(
            await documentRegistry
              .objectDocumentCount(
                objectId
              )
          ).to.equal(0n);
        }
      );

      it(
        "rejects invalid object index",
        async function () {
          await expect(
            documentRegistry
              .objectDocumentIdAt(
                objectId,
                0
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidIndex"
            );
        }
      );
    }
  );

  describe(
    "Registrar enumeration",
    function () {
      it(
        "enumerates registrar documents",
        async function () {
          const first =
            await registerAssetDocument({
              documentHash:
                hashText(
                  "registrar-doc-1"
                ),
            });

          const second =
            await registerObjectDocument({
              documentHash:
                hashText(
                  "registrar-doc-2"
                ),
            });

          expect(
            await documentRegistry
              .registrarDocumentCount(
                registrar.address
              )
          ).to.equal(2n);

          expect(
            await documentRegistry
              .registrarDocumentIdAt(
                registrar.address,
                0
              )
          ).to.equal(
            first.documentId
          );

          expect(
            await documentRegistry
              .registrarDocumentIdAt(
                registrar.address,
                1
              )
          ).to.equal(
            second.documentId
          );

          const ids =
            await documentRegistry
              .registrarDocumentIds(
                registrar.address
              );

          expect(
            ids.length
          ).to.equal(2);
        }
      );

      it(
        "separates registrars",
        async function () {
          await registerAssetDocument(
            {
              documentHash:
                hashText(
                  "registrar-a"
                ),
            },
            registrar
          );

          await registerAssetDocument(
            {
              documentHash:
                hashText(
                  "registrar-b"
                ),
            },
            secondRegistrar
          );

          expect(
            await documentRegistry
              .registrarDocumentCount(
                registrar.address
              )
          ).to.equal(1n);

          expect(
            await documentRegistry
              .registrarDocumentCount(
                secondRegistrar.address
              )
          ).to.equal(1n);
        }
      );

      it(
        "rejects invalid registrar index",
        async function () {
          await expect(
            documentRegistry
              .registrarDocumentIdAt(
                registrar.address,
                0
              )
          ).to.be
            .revertedWithCustomError(
              documentRegistry,
              "InvalidIndex"
            );
        }
      );
    }
  );

  describe(
    "Lifecycle independence",
    function () {
      it(
        "preserves document when asset is later deactivated",
        async function () {
          const result =
            await registerAssetDocument();

          await assetRegistry
            .connect(controller)
            .deactivateAsset(
              assetId
            );

          expect(
            await documentRegistry
              .documentExists(
                result.documentId
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(true);
        }
      );

      it(
        "preserves document when object is later deactivated",
        async function () {
          const result =
            await registerObjectDocument();

          await objectRegistry
            .connect(controller)
            .deactivateObject(
              objectId
            );

          expect(
            await documentRegistry
              .documentExists(
                result.documentId
              )
          ).to.equal(true);

          expect(
            await documentRegistry
              .isDocumentActive(
                result.documentId
              )
          ).to.equal(true);
        }
      );

      it(
        "allows registration after asset reactivation",
        async function () {
          await assetRegistry
            .connect(controller)
            .deactivateAsset(
              assetId
            );

          await assetRegistry
            .connect(controller)
            .reactivateAsset(
              assetId
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createAssetDocumentRequest()
              )
          ).to.not.be.reverted;
        }
      );

      it(
        "allows registration after object reactivation",
        async function () {
          await objectRegistry
            .connect(controller)
            .deactivateObject(
              objectId
            );

          await objectRegistry
            .connect(controller)
            .reactivateObject(
              objectId
            );

          await expect(
            documentRegistry
              .connect(registrar)
              .registerDocument(
                createObjectDocumentRequest()
              )
          ).to.not.be.reverted;
        }
      );
    }
  );

  describe(
    "Read behavior",
    function () {
      it(
        "returns false for unknown document",
        async function () {
          const unknown =
            hashText(
              "unknown-document"
            );

          expect(
            await documentRegistry
              .documentExists(
                unknown
              )
          ).to.equal(false);

          expect(
            await documentRegistry
              .isDocumentActive(
                unknown
              )
          ).to.equal(false);

          expect(
            await documentRegistry
              .isDocumentExpired(
                unknown
              )
          ).to.equal(false);
        }
      );

      it(
        "rejects getDocument for unknown document",
        async function () {
          const unknown =
            hashText(
              "unknown-document"
            );

          await expect(
            documentRegistry
              .getDocument(
                unknown
              )
          )
            .to.be
            .revertedWithCustomError(
              documentRegistry,
              "DocumentNotFound"
            )
            .withArgs(
              unknown
            );
        }
      );
    }
  );
});