const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenProvenanceRegistry", function () {
  let assetRegistry;
  let provenanceRegistry;
  let mockAsset;

  let creator;
  let controller;
  let recorder1;
  let recorder2;
  let other;

  const AssetClass = {
    FUNGIBLE: 0,
    NON_FUNGIBLE: 1,
  };

  const AssetStandard = {
    NONE: 0,
    ERC20: 1,
    ERC721: 2,
    ERC1155: 3,
  };

  const AssetScope = {
    CONTRACT: 0,
    TOKEN: 1,
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

  const EVENT_CREATED = ethers.id("CREATED");
  const EVENT_TRANSFERRED = ethers.id("TRANSFERRED");
  const EVENT_INSPECTED = ethers.id("INSPECTED");
  const EVENT_REPAIRED = ethers.id("REPAIRED");

  beforeEach(async function () {
    [
      creator,
      controller,
      recorder1,
      recorder2,
      other,
    ] = await ethers.getSigners();

    const AssetRegistry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    assetRegistry =
      await AssetRegistry.deploy();

    await assetRegistry.waitForDeployment();

    const MockAsset =
      await ethers.getContractFactory(
        "RegistryMockAsset"
      );

    mockAsset =
      await MockAsset.deploy();

    await mockAsset.waitForDeployment();

    const ProvenanceRegistry =
      await ethers.getContractFactory(
        "NumenProvenanceRegistry"
      );

    provenanceRegistry =
      await ProvenanceRegistry.deploy(
        assetRegistry.target
      );

    await provenanceRegistry.waitForDeployment();
  });

  async function registerAsset(overrides = {}) {
    const config = {
      assetClass:
        AssetClass.FUNGIBLE,

      standard:
        AssetStandard.ERC20,

      scope:
        AssetScope.CONTRACT,

      category:
        AssetCategory.PRODUCT,

      representation:
        RepresentationType.PHYSICAL_REFERENCE,

      tokenId: 0,

      creator:
        creator.address,

      controller:
        controller.address,

      metadataURI:
        "ipfs://numen-test-asset",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "numen-test-asset"
          )
        ),

      ...overrides,
    };

    const tx =
      await mockAsset
        .connect(creator)
        .registerSelf(
          assetRegistry.target,
          config.assetClass,
          config.standard,
          config.scope,
          config.category,
          config.representation,
          config.tokenId,
          config.creator,
          config.controller,
          config.metadataURI,
          config.metadataHash
        );

    const receipt = await tx.wait();

    let assetId = ethers.ZeroHash;

    for (const log of receipt.logs) {
      try {
        const parsed =
          assetRegistry.interface.parseLog(log);

        if (
          parsed &&
          parsed.name === "AssetRegistered"
        ) {
          assetId = parsed.args.assetId;
          break;
        }
      } catch (_) {}
    }

    expect(assetId).to.not.equal(
      ethers.ZeroHash
    );

    return {
      assetId,
      config,
    };
  }

  describe("Deployment", function () {
    it("deploys with correct Asset Registry", async function () {
      expect(
        await provenanceRegistry.assetRegistry()
      ).to.equal(
        assetRegistry.target
      );
    });

    it("rejects zero Asset Registry address", async function () {
      const ProvenanceRegistry =
        await ethers.getContractFactory(
          "NumenProvenanceRegistry"
        );

      await expect(
        ProvenanceRegistry.deploy(
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        ProvenanceRegistry,
        "ZeroAddress"
      );
    });

    it("reports expected provenance version", async function () {
      expect(
        await provenanceRegistry.provenanceVersion()
      ).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_PROVENANCE_REGISTRY_V1"
          )
        )
      );
    });

    it("starts entry IDs from 1", async function () {
      expect(
        await provenanceRegistry.nextEntryId()
      ).to.equal(1n);
    });
  });

  describe("Recording provenance", function () {
    it("records provenance for active registered asset", async function () {
      const { assetId } =
        await registerAsset();

      const dataURI =
        "ipfs://provenance-created";

      const dataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "provenance-created"
          )
        );

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            assetId,
            EVENT_CREATED,
            ethers.ZeroAddress,
            dataURI,
            dataHash
          )
      ).to.emit(
        provenanceRegistry,
        "ProvenanceRecorded"
      );

      expect(
        await provenanceRegistry.nextEntryId()
      ).to.equal(2n);
    });

    it("stores complete provenance entry", async function () {
      const { assetId } =
        await registerAsset();

      const dataURI =
        "ipfs://inspection-report";

      const dataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "inspection-report"
          )
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          other.address,
          dataURI,
          dataHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.entryId).to.equal(1n);

      expect(entry.assetId).to.equal(
        assetId
      );

      expect(entry.eventType).to.equal(
        EVENT_INSPECTED
      );

      expect(entry.recorder).to.equal(
        recorder1.address
      );

      expect(
        entry.relatedAddress
      ).to.equal(
        other.address
      );

      expect(entry.recordedAt).to.be.gt(
        0n
      );

      expect(entry.dataURI).to.equal(
        dataURI
      );

      expect(entry.dataHash).to.equal(
        dataHash
      );
    });

    it("stores msg.sender as recorder", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://record",
          ethers.ZeroHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.recorder).to.equal(
        recorder2.address
      );
    });

    it("allows unrelated addresses to submit provenance claims", async function () {
      const { assetId } =
        await registerAsset();

      await expect(
        provenanceRegistry
          .connect(other)
          .recordProvenance(
            assetId,
            EVENT_INSPECTED,
            ethers.ZeroAddress,
            "ipfs://third-party-claim",
            ethers.ZeroHash
          )
      ).to.emit(
        provenanceRegistry,
        "ProvenanceRecorded"
      );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.recorder).to.equal(
        other.address
      );
    });

    it("allows URI-only provenance data", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://uri-only",
          ethers.ZeroHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.dataURI).to.equal(
        "ipfs://uri-only"
      );

      expect(entry.dataHash).to.equal(
        ethers.ZeroHash
      );
    });

    it("allows hash-only provenance data", async function () {
      const { assetId } =
        await registerAsset();

      const dataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "hash-only"
          )
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "",
          dataHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.dataURI).to.equal("");

      expect(entry.dataHash).to.equal(
        dataHash
      );
    });

    it("allows both URI and hash", async function () {
      const { assetId } =
        await registerAsset();

      const dataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "combined-data"
          )
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://combined-data",
          dataHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.dataURI).to.equal(
        "ipfs://combined-data"
      );

      expect(entry.dataHash).to.equal(
        dataHash
      );
    });

    it("supports optional related address", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_TRANSFERRED,
          other.address,
          "ipfs://transfer",
          ethers.ZeroHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(
        entry.relatedAddress
      ).to.equal(
        other.address
      );
    });

    it("supports zero related address", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://created",
          ethers.ZeroHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(
        entry.relatedAddress
      ).to.equal(
        ethers.ZeroAddress
      );
    });
  });

  describe("Validation", function () {
    it("rejects zero Asset ID", async function () {
      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            ethers.ZeroHash,
            EVENT_CREATED,
            ethers.ZeroAddress,
            "ipfs://data",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        provenanceRegistry,
        "InvalidAssetId"
      );
    });

    it("rejects zero event type", async function () {
      const { assetId } =
        await registerAsset();

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            assetId,
            ethers.ZeroHash,
            ethers.ZeroAddress,
            "ipfs://data",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        provenanceRegistry,
        "EmptyEventType"
      );
    });

    it("rejects empty URI and zero hash together", async function () {
      const { assetId } =
        await registerAsset();

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            assetId,
            EVENT_CREATED,
            ethers.ZeroAddress,
            "",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        provenanceRegistry,
        "EmptyData"
      );
    });

    it("rejects unknown Asset ID", async function () {
      const unknownAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown-asset"
          )
        );

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            unknownAssetId,
            EVENT_CREATED,
            ethers.ZeroAddress,
            "ipfs://data",
            ethers.ZeroHash
          )
      ).to.be.reverted;
    });

    it("rejects inactive asset", async function () {
      const { assetId } =
        await registerAsset();

      await assetRegistry
        .connect(controller)
        .deactivateAsset(assetId);

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            assetId,
            EVENT_CREATED,
            ethers.ZeroAddress,
            "ipfs://inactive",
            ethers.ZeroHash
          )
      )
        .to.be.revertedWithCustomError(
          provenanceRegistry,
          "AssetNotActive"
        )
        .withArgs(assetId);
    });

    it("rejects nonexistent provenance entry", async function () {
      await expect(
        provenanceRegistry
          .getProvenanceEntry(999)
      )
        .to.be.revertedWithCustomError(
          provenanceRegistry,
          "ProvenanceEntryNotFound"
        )
        .withArgs(999);
    });
  });

  describe("Append-only history", function () {
    it("creates sequential entry IDs", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://1",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://2",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_REPAIRED,
          ethers.ZeroAddress,
          "ipfs://3",
          ethers.ZeroHash
        );

      expect(
        await provenanceRegistry.nextEntryId()
      ).to.equal(4n);

      const first =
        await provenanceRegistry
          .getProvenanceEntry(1);

      const second =
        await provenanceRegistry
          .getProvenanceEntry(2);

      const third =
        await provenanceRegistry
          .getProvenanceEntry(3);

      expect(first.entryId).to.equal(1n);
      expect(second.entryId).to.equal(2n);
      expect(third.entryId).to.equal(3n);
    });

    it("preserves earlier entries after new entries are added", async function () {
      const { assetId } =
        await registerAsset();

      const firstHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "first-event"
          )
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://first",
          firstHash
        );

      const before =
        await provenanceRegistry
          .getProvenanceEntry(1);

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          other.address,
          "ipfs://second",
          ethers.ZeroHash
        );

      const after =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(after.entryId).to.equal(
        before.entryId
      );

      expect(after.assetId).to.equal(
        before.assetId
      );

      expect(after.eventType).to.equal(
        before.eventType
      );

      expect(after.recorder).to.equal(
        before.recorder
      );

      expect(
        after.relatedAddress
      ).to.equal(
        before.relatedAddress
      );

      expect(after.recordedAt).to.equal(
        before.recordedAt
      );

      expect(after.dataURI).to.equal(
        before.dataURI
      );

      expect(after.dataHash).to.equal(
        before.dataHash
      );
    });

    it("has no update or delete mechanism in ABI", async function () {
      expect(
        provenanceRegistry.interface
          .getFunction(
            "updateProvenance"
          )
      ).to.equal(null);

      expect(
        provenanceRegistry.interface
          .getFunction(
            "deleteProvenance"
          )
      ).to.equal(null);
    });
  });

  describe("Asset indexing", function () {
    it("indexes all entries belonging to an asset", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://1",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://2",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_REPAIRED,
          ethers.ZeroAddress,
          "ipfs://3",
          ethers.ZeroHash
        );

      const ids =
        await provenanceRegistry
          .getAssetEntryIds(assetId);

      expect(ids).to.deep.equal([
        1n,
        2n,
        3n,
      ]);

      expect(
        await provenanceRegistry
          .getAssetEntryCount(assetId)
      ).to.equal(3n);

      expect(
        await provenanceRegistry
          .getAssetEntryIdAt(
            assetId,
            0
          )
      ).to.equal(1n);

      expect(
        await provenanceRegistry
          .getAssetEntryIdAt(
            assetId,
            1
          )
      ).to.equal(2n);

      expect(
        await provenanceRegistry
          .getAssetEntryIdAt(
            assetId,
            2
          )
      ).to.equal(3n);
    });

    it("keeps histories of different assets separate", async function () {
      const first =
        await registerAsset();

      const MockAsset =
        await ethers.getContractFactory(
          "RegistryMockAsset"
        );

      const secondMockAsset =
        await MockAsset.deploy();

      await secondMockAsset
        .waitForDeployment();

      const tx =
        await secondMockAsset
          .connect(creator)
          .registerSelf(
            assetRegistry.target,
            AssetClass.FUNGIBLE,
            AssetStandard.ERC20,
            AssetScope.CONTRACT,
            AssetCategory.PRODUCT,
            RepresentationType
              .PHYSICAL_REFERENCE,
            0,
            creator.address,
            controller.address,
            "ipfs://second-asset",
            ethers.keccak256(
              ethers.toUtf8Bytes(
                "second-asset"
              )
            )
          );

      const receipt = await tx.wait();

      let secondAssetId =
        ethers.ZeroHash;

      for (const log of receipt.logs) {
        try {
          const parsed =
            assetRegistry.interface
              .parseLog(log);

          if (
            parsed &&
            parsed.name ===
              "AssetRegistered"
          ) {
            secondAssetId =
              parsed.args.assetId;

            break;
          }
        } catch (_) {}
      }

      expect(
        secondAssetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          first.assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://first",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          secondAssetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://second",
          ethers.ZeroHash
        );

      const firstIds =
        await provenanceRegistry
          .getAssetEntryIds(
            first.assetId
          );

      const secondIds =
        await provenanceRegistry
          .getAssetEntryIds(
            secondAssetId
          );

      expect(firstIds).to.deep.equal([
        1n,
      ]);

      expect(secondIds).to.deep.equal([
        2n,
      ]);
    });
  });

  describe("Recorder indexing", function () {
    it("indexes entries by recorder", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://1",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://2",
          ethers.ZeroHash
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_REPAIRED,
          ethers.ZeroAddress,
          "ipfs://3",
          ethers.ZeroHash
        );

      const recorder1Ids =
        await provenanceRegistry
          .getRecorderEntryIds(
            recorder1.address
          );

      const recorder2Ids =
        await provenanceRegistry
          .getRecorderEntryIds(
            recorder2.address
          );

      expect(
        recorder1Ids
      ).to.deep.equal([
        1n,
        3n,
      ]);

      expect(
        recorder2Ids
      ).to.deep.equal([
        2n,
      ]);

      expect(
        await provenanceRegistry
          .getRecorderEntryCount(
            recorder1.address
          )
      ).to.equal(2n);

      expect(
        await provenanceRegistry
          .getRecorderEntryCount(
            recorder2.address
          )
      ).to.equal(1n);

      expect(
        await provenanceRegistry
          .getRecorderEntryIdAt(
            recorder1.address,
            0
          )
      ).to.equal(1n);

      expect(
        await provenanceRegistry
          .getRecorderEntryIdAt(
            recorder1.address,
            1
          )
      ).to.equal(3n);
    });
  });

  describe("Historical behavior", function () {
    it("keeps old provenance readable after asset becomes inactive", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_CREATED,
          ethers.ZeroAddress,
          "ipfs://historical",
          ethers.ZeroHash
        );

      await assetRegistry
        .connect(controller)
        .deactivateAsset(assetId);

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.assetId).to.equal(
        assetId
      );

      expect(entry.dataURI).to.equal(
        "ipfs://historical"
      );

      expect(
        await provenanceRegistry
          .getAssetEntryCount(assetId)
      ).to.equal(1n);
    });

    it("allows new provenance after asset is reactivated", async function () {
      const { assetId } =
        await registerAsset();

      await assetRegistry
        .connect(controller)
        .deactivateAsset(assetId);

      await assetRegistry
        .connect(controller)
        .reactivateAsset(assetId);

      await expect(
        provenanceRegistry
          .connect(recorder1)
          .recordProvenance(
            assetId,
            EVENT_CREATED,
            ethers.ZeroAddress,
            "ipfs://reactivated",
            ethers.ZeroHash
          )
      ).to.emit(
        provenanceRegistry,
        "ProvenanceRecorded"
      );
    });
  });

  describe("Permissionless claim model", function () {
    it("does not give Asset controller exclusive provenance rights", async function () {
      const { assetId } =
        await registerAsset();

      await provenanceRegistry
        .connect(other)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://independent-inspection",
          ethers.ZeroHash
        );

      const entry =
        await provenanceRegistry
          .getProvenanceEntry(1);

      expect(entry.recorder).to.equal(
        other.address
      );

      expect(entry.recorder).to.not.equal(
        controller.address
      );
    });

    it("records conflicting claims independently instead of overwriting history", async function () {
      const { assetId } =
        await registerAsset();

      const firstHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "claim-A"
          )
        );

      const secondHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "claim-B"
          )
        );

      await provenanceRegistry
        .connect(recorder1)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://claim-a",
          firstHash
        );

      await provenanceRegistry
        .connect(recorder2)
        .recordProvenance(
          assetId,
          EVENT_INSPECTED,
          ethers.ZeroAddress,
          "ipfs://claim-b",
          secondHash
        );

      const first =
        await provenanceRegistry
          .getProvenanceEntry(1);

      const second =
        await provenanceRegistry
          .getProvenanceEntry(2);

      expect(first.recorder).to.equal(
        recorder1.address
      );

      expect(second.recorder).to.equal(
        recorder2.address
      );

      expect(first.dataHash).to.equal(
        firstHash
      );

      expect(second.dataHash).to.equal(
        secondHash
      );

      expect(first.dataHash).to.not.equal(
        second.dataHash
      );

      expect(
        await provenanceRegistry
          .getAssetEntryCount(assetId)
      ).to.equal(2n);
    });
  });
});