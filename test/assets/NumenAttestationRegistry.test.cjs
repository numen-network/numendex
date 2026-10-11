const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenAttestationRegistry", function () {
  let deployer;
  let creator;
  let controller;
  let attester;
  let secondAttester;
  let attacker;
  let recipient;
  let metadataAuthority;

  let assetRegistry;
  let objectRegistry;
  let attestationRegistry;
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

  const AttestationType = {
    CUSTOM: 0,
    ISSUER: 1,
    MANUFACTURER: 2,
    OWNERSHIP: 3,
    ORIGIN: 4,
    INSPECTION: 5,
    APPRAISAL: 6,
    CUSTODY: 7,
    AUDIT: 8,
    LEGAL: 9,
    DOCUMENT: 10,
    MODEL: 11,
    SCAN: 12,
  };

  function hashText(value) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(value)
    );
  }

  function createAssetConfig(overrides = {}) {
    return {
      name: "Attestation Test Asset",
      symbol: "ATA",
      decimals: 18,

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

      mintable: false,
      burnable: true,
      pausable: false,
      permitEnabled: true,
      votesEnabled: true,
      objectBindingEnabled: true,

      category:
        AssetCategory.MACHINERY,

      representation:
        RepresentationType.DIGITAL_TWIN,

      metadataURI:
        "ipfs://attestation-test-asset",

      metadataHash:
        hashText(
          "attestation-test-asset"
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

  function createObjectRequest(overrides = {}) {
    return {
      creator:
        creator.address,

      controller:
        controller.address,

      modelURI:
        "ipfs://attestation-object.glb",

      modelHash:
        hashText(
          "attestation-object-model"
        ),

      modelFormat:
        "GLB",

      spectralFingerprint:
        hashText(
          "attestation-object-spectral"
        ),

      spectralAlgorithm:
        "spectral3d",

      spectralVersion:
        "asset-v1",

      metadataURI:
        "ipfs://attestation-object.json",

      metadataHash:
        hashText(
          "attestation-object-metadata"
        ),

      ...overrides,
    };
  }

  function createAssetAttestationRequest(
    overrides = {}
  ) {
    return {
      assetId,
      objectId: ethers.ZeroHash,

      attestationType:
        AttestationType.INSPECTION,

      claimURI:
        "ipfs://claims/inspection.json",

      claimHash:
        hashText(
          "inspection-claim"
        ),

      evidenceURI:
        "ipfs://evidence/inspection.pdf",

      evidenceHash:
        hashText(
          "inspection-evidence"
        ),

      expiresAt: 0,

      ...overrides,
    };
  }

  function createObjectAttestationRequest(
    overrides = {}
  ) {
    return {
      assetId: ethers.ZeroHash,
      objectId,

      attestationType:
        AttestationType.MODEL,

      claimURI:
        "ipfs://claims/model.json",

      claimHash:
        hashText(
          "model-claim"
        ),

      evidenceURI:
        "ipfs://evidence/model.json",

      evidenceHash:
        hashText(
          "model-evidence"
        ),

      expiresAt: 0,

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

    await assetRegistry.waitForDeployment();

    const ObjectRegistry =
      await ethers.getContractFactory(
        "NumenObjectRegistry"
      );

    objectRegistry =
      await ObjectRegistry.deploy();

    await objectRegistry.waitForDeployment();

    const AttestationRegistry =
      await ethers.getContractFactory(
        "NumenAttestationRegistry"
      );

    attestationRegistry =
      await AttestationRegistry.deploy(
        assetRegistry.target,
        objectRegistry.target
      );

    await attestationRegistry.waitForDeployment();

    const Asset =
      await ethers.getContractFactory(
        "NumenFungibleAsset"
      );

    asset =
      await Asset.deploy(
        createAssetConfig()
      );

    await asset.waitForDeployment();

    await asset.registerNumenAsset();

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

    for (const log of receipt.logs) {
      try {
        const parsed =
          objectRegistry.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "ObjectRegistered"
        ) {
          registeredEvent = parsed;
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
      registeredEvent.args.objectId;
  }

  async function createAssetAttestation(
    overrides = {},
    signer = attester
  ) {
    const request =
      createAssetAttestationRequest(
        overrides
      );

    const tx =
      await attestationRegistry
        .connect(signer)
        .createAttestation(
          request
        );

    const receipt =
      await tx.wait();

    let event = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          attestationRegistry.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "AttestationCreated"
        ) {
          event = parsed;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(event).to.not.equal(null);

    return {
      request,
      tx,
      receipt,
      event,
      attestationId:
        event.args.attestationId,
    };
  }

  async function createObjectAttestation(
    overrides = {},
    signer = attester
  ) {
    const request =
      createObjectAttestationRequest(
        overrides
      );

    const tx =
      await attestationRegistry
        .connect(signer)
        .createAttestation(
          request
        );

    const receipt =
      await tx.wait();

    let event = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          attestationRegistry.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "AttestationCreated"
        ) {
          event = parsed;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(event).to.not.equal(null);

    return {
      request,
      tx,
      receipt,
      event,
      attestationId:
        event.args.attestationId,
    };
  }

  beforeEach(async function () {
    [
      deployer,
      creator,
      controller,
      attester,
      secondAttester,
      attacker,
      recipient,
      metadataAuthority,
    ] = await ethers.getSigners();

    await deploySystem();
  });

  describe("Deployment", function () {
    it("deploys with correct registries", async function () {
      expect(
        await attestationRegistry.assetRegistry()
      ).to.equal(
        assetRegistry.target
      );

      expect(
        await attestationRegistry.objectRegistry()
      ).to.equal(
        objectRegistry.target
      );
    });

    it("returns correct version", async function () {
      expect(
        await attestationRegistry
          .attestationRegistryVersion()
      ).to.equal(
        hashText(
          "NUMEN_ATTESTATION_REGISTRY_V1"
        )
      );
    });

    it("starts empty", async function () {
      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(0n);
    });

    it("rejects zero asset registry", async function () {
      const Registry =
        await ethers.getContractFactory(
          "NumenAttestationRegistry"
        );

      await expect(
        Registry.deploy(
          ethers.ZeroAddress,
          objectRegistry.target
        )
      ).to.be.revertedWithCustomError(
        Registry,
        "ZeroAddress"
      );
    });

    it("rejects zero object registry", async function () {
      const Registry =
        await ethers.getContractFactory(
          "NumenAttestationRegistry"
        );

      await expect(
        Registry.deploy(
          assetRegistry.target,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        Registry,
        "ZeroAddress"
      );
    });
  });

  describe("Asset attestations", function () {
    it("creates an asset attestation", async function () {
      const {
        attestationId,
      } =
        await createAssetAttestation();

      expect(
        await attestationRegistry
          .attestationExists(
            attestationId
          )
      ).to.equal(true);

      expect(
        await attestationRegistry
          .isAttestationActive(
            attestationId
          )
      ).to.equal(true);

      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(1n);
    });

    it("stores complete asset attestation", async function () {
      const result =
        await createAssetAttestation();

      const record =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        record.attestationId
      ).to.equal(
        result.attestationId
      );

      expect(
        record.assetId
      ).to.equal(assetId);

      expect(
        record.objectId
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        record.attester
      ).to.equal(
        attester.address
      );

      expect(
        record.attestationType
      ).to.equal(
        BigInt(
          AttestationType.INSPECTION
        )
      );

      expect(
        record.claimURI
      ).to.equal(
        result.request.claimURI
      );

      expect(
        record.claimHash
      ).to.equal(
        result.request.claimHash
      );

      expect(
        record.evidenceURI
      ).to.equal(
        result.request.evidenceURI
      );

      expect(
        record.evidenceHash
      ).to.equal(
        result.request.evidenceHash
      );

      expect(
        record.createdAt
      ).to.be.greaterThan(0n);

      expect(
        record.expiresAt
      ).to.equal(0n);

      expect(
        record.revokedAt
      ).to.equal(0n);

      expect(
        record.revoked
      ).to.equal(false);
    });

    it("emits AttestationCreated for asset", async function () {
      const request =
        createAssetAttestationRequest();

      const tx =
        await attestationRegistry
          .connect(attester)
          .createAttestation(
            request
          );

      const receipt =
        await tx.wait();

      let event = null;

      for (const log of receipt.logs) {
        try {
          const parsed =
            attestationRegistry.interface
              .parseLog(log);

          if (
            parsed &&
            parsed.name ===
              "AttestationCreated"
          ) {
            event = parsed;
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      expect(event).to.not.equal(null);

      expect(
        event.args.attester
      ).to.equal(
        attester.address
      );

      expect(
        event.args.targetId
      ).to.equal(assetId);

      expect(
        event.args.targetIsAsset
      ).to.equal(true);

      expect(
        event.args.attestationType
      ).to.equal(
        BigInt(
          AttestationType.INSPECTION
        )
      );

      expect(
        event.args.claimHash
      ).to.equal(
        request.claimHash
      );
    });
  });

  describe("Object attestations", function () {
    it("creates an object attestation", async function () {
      const {
        attestationId,
      } =
        await createObjectAttestation();

      const record =
        await attestationRegistry
          .getAttestation(
            attestationId
          );

      expect(
        record.assetId
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        record.objectId
      ).to.equal(objectId);

      expect(
        record.attester
      ).to.equal(
        attester.address
      );

      expect(
        record.attestationType
      ).to.equal(
        BigInt(
          AttestationType.MODEL
        )
      );
    });

    it("emits object target correctly", async function () {
      const result =
        await createObjectAttestation();

      expect(
        result.event.args.targetId
      ).to.equal(objectId);

      expect(
        result.event.args.targetIsAsset
      ).to.equal(false);
    });
  });

  describe("Permissionless attestation", function () {
    it("allows an unrelated address to attest an asset", async function () {
      await expect(
        attestationRegistry
          .connect(attacker)
          .createAttestation(
            createAssetAttestationRequest()
          )
      ).to.not.be.reverted;
    });

    it("records the actual caller as attester", async function () {
      const result =
        await createAssetAttestation(
          {},
          attacker
        );

      const record =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        record.attester
      ).to.equal(
        attacker.address
      );
    });

    it("allows multiple independent attesters", async function () {
      const first =
        await createAssetAttestation(
          {
            claimHash:
              hashText("claim-a"),
          },
          attester
        );

      const second =
        await createAssetAttestation(
          {
            claimHash:
              hashText("claim-b"),
          },
          secondAttester
        );

      expect(
        first.attestationId
      ).to.not.equal(
        second.attestationId
      );

      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(2n);
    });
  });

  describe("Target validation", function () {
    it("rejects request with no target", async function () {
      const request =
        createAssetAttestationRequest({
          assetId:
            ethers.ZeroHash,

          objectId:
            ethers.ZeroHash,
        });

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            request
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidTarget"
      );
    });

    it("rejects request containing both asset and object", async function () {
      const request =
        createAssetAttestationRequest({
          assetId,
          objectId,
        });

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            request
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidTarget"
      );
    });

    it("rejects unknown asset", async function () {
      const unknownAsset =
        hashText(
          "unknown-asset"
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest({
              assetId:
                unknownAsset,
            })
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "AssetNotFound"
        )
        .withArgs(
          unknownAsset
        );
    });

    it("rejects inactive asset", async function () {
      await assetRegistry
        .connect(controller)
        .deactivateAsset(
          assetId
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest()
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "AssetInactive"
        )
        .withArgs(assetId);
    });

    it("rejects unknown object", async function () {
      const unknownObject =
        hashText(
          "unknown-object"
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createObjectAttestationRequest({
              objectId:
                unknownObject,
            })
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "ObjectNotFound"
        )
        .withArgs(
          unknownObject
        );
    });

    it("rejects inactive object", async function () {
      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createObjectAttestationRequest()
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "ObjectInactive"
        )
        .withArgs(objectId);
    });
  });

  describe("Claim validation", function () {
    it("rejects zero claim hash", async function () {
      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest({
              claimHash:
                ethers.ZeroHash,
            })
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "EmptyClaim"
      );
    });

    it("allows empty claim URI when claim hash exists", async function () {
      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest({
              claimURI: "",
            })
          )
      ).to.not.be.reverted;
    });

    it("allows empty evidence", async function () {
      const result =
        await createAssetAttestation({
          evidenceURI: "",
          evidenceHash:
            ethers.ZeroHash,
        });

      const record =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        record.evidenceURI
      ).to.equal("");

      expect(
        record.evidenceHash
      ).to.equal(
        ethers.ZeroHash
      );
    });
  });

  describe("Expiration", function () {
    it("allows future expiration", async function () {
      const block =
        await ethers.provider
          .getBlock("latest");

      const expiresAt =
        block.timestamp + 3600;

      const result =
        await createAssetAttestation({
          expiresAt,
        });

      const record =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        record.expiresAt
      ).to.equal(
        BigInt(expiresAt)
      );

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(true);
    });

    it("rejects expiration in the past", async function () {
      const block =
        await ethers.provider
          .getBlock("latest");

      await expect(
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest({
              expiresAt:
                block.timestamp - 1,
            })
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidExpiration"
      );
    });

    it("becomes inactive after expiration", async function () {
      const block =
        await ethers.provider
          .getBlock("latest");

      const expiresAt =
        block.timestamp + 100;

      const result =
        await createAssetAttestation({
          expiresAt,
        });

      await ethers.provider.send(
        "evm_setNextBlockTimestamp",
        [expiresAt]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(false);

      expect(
        await attestationRegistry
          .isAttestationExpired(
            result.attestationId
          )
      ).to.equal(true);
    });

    it("non-expiring attestation does not expire", async function () {
      const result =
        await createAssetAttestation({
          expiresAt: 0,
        });

      expect(
        await attestationRegistry
          .isAttestationExpired(
            result.attestationId
          )
      ).to.equal(false);

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(true);
    });
  });

  describe("Revocation", function () {
    it("allows original attester to revoke", async function () {
      const result =
        await createAssetAttestation();

      await attestationRegistry
        .connect(attester)
        .revokeAttestation(
          result.attestationId
        );

      const record =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        record.revoked
      ).to.equal(true);

      expect(
        record.revokedAt
      ).to.be.greaterThan(0n);

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(false);
    });

    it("emits AttestationRevoked", async function () {
      const result =
        await createAssetAttestation();

      const tx =
        await attestationRegistry
          .connect(attester)
          .revokeAttestation(
            result.attestationId
          );

      const receipt =
        await tx.wait();

      let event = null;

      for (const log of receipt.logs) {
        try {
          const parsed =
            attestationRegistry.interface
              .parseLog(log);

          if (
            parsed &&
            parsed.name ===
              "AttestationRevoked"
          ) {
            event = parsed;
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      expect(event).to.not.equal(null);

      expect(
        event.args.attestationId
      ).to.equal(
        result.attestationId
      );

      expect(
        event.args.attester
      ).to.equal(
        attester.address
      );

      expect(
        event.args.revokedAt
      ).to.be.greaterThan(0n);
    });

    it("rejects revocation by another address", async function () {
      const result =
        await createAssetAttestation();

      await expect(
        attestationRegistry
          .connect(attacker)
          .revokeAttestation(
            result.attestationId
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          result.attestationId
        );
    });

    it("rejects double revocation", async function () {
      const result =
        await createAssetAttestation();

      await attestationRegistry
        .connect(attester)
        .revokeAttestation(
          result.attestationId
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .revokeAttestation(
            result.attestationId
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "AttestationAlreadyRevoked"
        )
        .withArgs(
          result.attestationId
        );
    });

    it("rejects unknown attestation", async function () {
      const unknown =
        hashText(
          "unknown-attestation"
        );

      await expect(
        attestationRegistry
          .connect(attester)
          .revokeAttestation(
            unknown
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "AttestationNotFound"
        )
        .withArgs(unknown);
    });

    it("preserves revoked attestation history", async function () {
      const result =
        await createAssetAttestation();

      await attestationRegistry
        .connect(attester)
        .revokeAttestation(
          result.attestationId
        );

      expect(
        await attestationRegistry
          .attestationExists(
            result.attestationId
          )
      ).to.equal(true);

      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(1n);

      expect(
        await attestationRegistry
          .assetAttestationCount(
            assetId
          )
      ).to.equal(1n);
    });
  });

  describe("Attestation immutability", function () {
    it("keeps claim data unchanged after revocation", async function () {
      const result =
        await createAssetAttestation();

      const before =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      await attestationRegistry
        .connect(attester)
        .revokeAttestation(
          result.attestationId
        );

      const after =
        await attestationRegistry
          .getAttestation(
            result.attestationId
          );

      expect(
        after.assetId
      ).to.equal(before.assetId);

      expect(
        after.objectId
      ).to.equal(before.objectId);

      expect(
        after.attester
      ).to.equal(before.attester);

      expect(
        after.attestationType
      ).to.equal(
        before.attestationType
      );

      expect(
        after.claimURI
      ).to.equal(before.claimURI);

      expect(
        after.claimHash
      ).to.equal(before.claimHash);

      expect(
        after.evidenceURI
      ).to.equal(
        before.evidenceURI
      );

      expect(
        after.evidenceHash
      ).to.equal(
        before.evidenceHash
      );

      expect(
        after.createdAt
      ).to.equal(before.createdAt);

      expect(
        after.expiresAt
      ).to.equal(before.expiresAt);

      expect(
        after.revoked
      ).to.equal(true);
    });
  });

  describe("Global enumeration", function () {
    it("enumerates all attestations", async function () {
      const first =
        await createAssetAttestation({
          claimHash:
            hashText("claim-1"),
        });

      const second =
        await createObjectAttestation({
          claimHash:
            hashText("claim-2"),
        });

      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(2n);

      expect(
        await attestationRegistry
          .attestationIdAt(0)
      ).to.equal(
        first.attestationId
      );

      expect(
        await attestationRegistry
          .attestationIdAt(1)
      ).to.equal(
        second.attestationId
      );

      const ids =
        await attestationRegistry
          .allAttestationIds();

      expect(ids.length).to.equal(2);

      expect(
        ids[0]
      ).to.equal(
        first.attestationId
      );

      expect(
        ids[1]
      ).to.equal(
        second.attestationId
      );
    });

    it("rejects invalid global index", async function () {
      await expect(
        attestationRegistry
          .attestationIdAt(0)
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Asset enumeration", function () {
    it("enumerates attestations for asset", async function () {
      const first =
        await createAssetAttestation({
          claimHash:
            hashText("asset-claim-1"),
        });

      const second =
        await createAssetAttestation({
          claimHash:
            hashText("asset-claim-2"),
        });

      expect(
        await attestationRegistry
          .assetAttestationCount(
            assetId
          )
      ).to.equal(2n);

      expect(
        await attestationRegistry
          .assetAttestationIdAt(
            assetId,
            0
          )
      ).to.equal(
        first.attestationId
      );

      expect(
        await attestationRegistry
          .assetAttestationIdAt(
            assetId,
            1
          )
      ).to.equal(
        second.attestationId
      );

      const ids =
        await attestationRegistry
          .assetAttestationIds(
            assetId
          );

      expect(ids.length).to.equal(2);
    });

    it("does not put object attestations in asset list", async function () {
      await createObjectAttestation();

      expect(
        await attestationRegistry
          .assetAttestationCount(
            assetId
          )
      ).to.equal(0n);
    });

    it("rejects invalid asset index", async function () {
      await expect(
        attestationRegistry
          .assetAttestationIdAt(
            assetId,
            0
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Object enumeration", function () {
    it("enumerates attestations for object", async function () {
      const first =
        await createObjectAttestation({
          claimHash:
            hashText("object-claim-1"),
        });

      const second =
        await createObjectAttestation({
          claimHash:
            hashText("object-claim-2"),
        });

      expect(
        await attestationRegistry
          .objectAttestationCount(
            objectId
          )
      ).to.equal(2n);

      expect(
        await attestationRegistry
          .objectAttestationIdAt(
            objectId,
            0
          )
      ).to.equal(
        first.attestationId
      );

      expect(
        await attestationRegistry
          .objectAttestationIdAt(
            objectId,
            1
          )
      ).to.equal(
        second.attestationId
      );

      const ids =
        await attestationRegistry
          .objectAttestationIds(
            objectId
          );

      expect(ids.length).to.equal(2);
    });

    it("does not put asset attestations in object list", async function () {
      await createAssetAttestation();

      expect(
        await attestationRegistry
          .objectAttestationCount(
            objectId
          )
      ).to.equal(0n);
    });

    it("rejects invalid object index", async function () {
      await expect(
        attestationRegistry
          .objectAttestationIdAt(
            objectId,
            0
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Attester enumeration", function () {
    it("enumerates attestations by attester", async function () {
      const first =
        await createAssetAttestation({
          claimHash:
            hashText("claim-a"),
        });

      const second =
        await createObjectAttestation({
          claimHash:
            hashText("claim-b"),
        });

      expect(
        await attestationRegistry
          .attesterAttestationCount(
            attester.address
          )
      ).to.equal(2n);

      expect(
        await attestationRegistry
          .attesterAttestationIdAt(
            attester.address,
            0
          )
      ).to.equal(
        first.attestationId
      );

      expect(
        await attestationRegistry
          .attesterAttestationIdAt(
            attester.address,
            1
          )
      ).to.equal(
        second.attestationId
      );

      const ids =
        await attestationRegistry
          .attesterAttestationIds(
            attester.address
          );

      expect(ids.length).to.equal(2);
    });

    it("keeps different attesters separated", async function () {
      await createAssetAttestation(
        {
          claimHash:
            hashText("first"),
        },
        attester
      );

      await createAssetAttestation(
        {
          claimHash:
            hashText("second"),
        },
        secondAttester
      );

      expect(
        await attestationRegistry
          .attesterAttestationCount(
            attester.address
          )
      ).to.equal(1n);

      expect(
        await attestationRegistry
          .attesterAttestationCount(
            secondAttester.address
          )
      ).to.equal(1n);
    });

    it("rejects invalid attester index", async function () {
      await expect(
        attestationRegistry
          .attesterAttestationIdAt(
            attester.address,
            0
          )
      ).to.be.revertedWithCustomError(
        attestationRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Read behavior", function () {
    it("returns false for unknown attestation existence", async function () {
      const unknown =
        hashText(
          "unknown-attestation"
        );

      expect(
        await attestationRegistry
          .attestationExists(
            unknown
          )
      ).to.equal(false);
    });

    it("returns false for unknown attestation active status", async function () {
      const unknown =
        hashText(
          "unknown-attestation"
        );

      expect(
        await attestationRegistry
          .isAttestationActive(
            unknown
          )
      ).to.equal(false);
    });

    it("returns false for unknown expiration status", async function () {
      const unknown =
        hashText(
          "unknown-attestation"
        );

      expect(
        await attestationRegistry
          .isAttestationExpired(
            unknown
          )
      ).to.equal(false);
    });

    it("rejects getAttestation for unknown ID", async function () {
      const unknown =
        hashText(
          "unknown-attestation"
        );

      await expect(
        attestationRegistry
          .getAttestation(
            unknown
          )
      )
        .to.be.revertedWithCustomError(
          attestationRegistry,
          "AttestationNotFound"
        )
        .withArgs(unknown);
    });
  });

  describe("Attestation types", function () {
    it("supports all defined attestation types", async function () {
      const types = [
        AttestationType.CUSTOM,
        AttestationType.ISSUER,
        AttestationType.MANUFACTURER,
        AttestationType.OWNERSHIP,
        AttestationType.ORIGIN,
        AttestationType.INSPECTION,
        AttestationType.APPRAISAL,
        AttestationType.CUSTODY,
        AttestationType.AUDIT,
        AttestationType.LEGAL,
        AttestationType.DOCUMENT,
        AttestationType.MODEL,
        AttestationType.SCAN,
      ];

      for (
        let i = 0;
        i < types.length;
        i++
      ) {
        await createAssetAttestation({
          attestationType:
            types[i],

          claimHash:
            hashText(
              `claim-${i}`
            ),
        });
      }

      expect(
        await attestationRegistry
          .totalAttestations()
      ).to.equal(
        BigInt(types.length)
      );

      expect(
        await attestationRegistry
          .assetAttestationCount(
            assetId
          )
      ).to.equal(
        BigInt(types.length)
      );
    });
  });

  describe("Asset/Object lifecycle independence", function () {
    it("preserves existing asset attestation after asset deactivation", async function () {
      const result =
        await createAssetAttestation();

      await assetRegistry
        .connect(controller)
        .deactivateAsset(
          assetId
        );

      expect(
        await attestationRegistry
          .attestationExists(
            result.attestationId
          )
      ).to.equal(true);

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(true);
    });

    it("preserves existing object attestation after object deactivation", async function () {
      const result =
        await createObjectAttestation();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      expect(
        await attestationRegistry
          .attestationExists(
            result.attestationId
          )
      ).to.equal(true);

      expect(
        await attestationRegistry
          .isAttestationActive(
            result.attestationId
          )
      ).to.equal(true);
    });

    it("allows new asset attestation after asset reactivation", async function () {
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
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createAssetAttestationRequest()
          )
      ).to.not.be.reverted;
    });

    it("allows new object attestation after object reactivation", async function () {
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
        attestationRegistry
          .connect(attester)
          .createAttestation(
            createObjectAttestationRequest()
          )
      ).to.not.be.reverted;
    });
  });
});