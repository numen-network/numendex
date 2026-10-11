const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenObjectBinding V2", function () {
  let assetRegistry;
  let objectRegistry;
  let binding;

  let deployer;
  let assetController;
  let objectController;
  let sharedController;
  let attacker;

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

  const ObjectLinkType = {
    UNSPECIFIED: 0,
    PRIMARY: 1,
    DIGITAL_TWIN: 2,
    FRACTIONALIZATION: 3,
    CERTIFICATE: 4,
    OWNERSHIP: 5,
    USAGE_RIGHT: 6,
    PROVENANCE: 7,
    CUSTOM: 8,
  };

  beforeEach(async function () {
    [
      deployer,
      assetController,
      objectController,
      sharedController,
      attacker,
    ] = await ethers.getSigners();

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

    const Binding =
      await ethers.getContractFactory(
        "NumenObjectBinding"
      );

    binding =
      await Binding.deploy(
        assetRegistry.target,
        objectRegistry.target
      );

    await binding.waitForDeployment();
  });

  // ============================================================
  // HELPERS
  // ============================================================

  async function createAsset(
    controller = assetController
  ) {
    const MockAsset =
      await ethers.getContractFactory(
        "RegistryMockAsset"
      );

    // RegistryMockAsset constructor has NO arguments.
    const mock =
      await MockAsset.deploy();

    await mock.waitForDeployment();

    const metadataURI =
      "ipfs://asset.json";

    const metadataHash =
      ethers.keccak256(
        ethers.toUtf8Bytes(
          "asset-metadata"
        )
      );

    /*
     * Canonical self-registration:
     *
     * EOA -> RegistryMockAsset.registerSelf(...)
     * RegistryMockAsset -> NumenAssetRegistry.registerAsset(...)
     *
     * Therefore msg.sender observed by Asset Registry is the
     * asset contract itself.
     */
    const tx =
      await mock.registerSelf(
        assetRegistry.target,
        AssetClass.NON_FUNGIBLE,
        AssetStandard.ERC721,
        AssetScope.CONTRACT,
        AssetCategory.PRODUCT,
        RepresentationType.DIGITAL_TWIN,
        0,
        controller.address,
        controller.address,
        metadataURI,
        metadataHash
      );

    const receipt =
      await tx.wait();

    let assetId = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          assetRegistry.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "AssetRegistered"
        ) {
          assetId =
            parsed.args.assetId;

          break;
        }
      } catch (_) {}
    }

    expect(
      assetId
    ).to.not.equal(null);

    expect(
      await assetRegistry.assetExists(
        assetId
      )
    ).to.equal(true);

    return {
      assetId,
      mock,
    };
  }

  async function createObject(
    controller = objectController,
    suffix = "1"
  ) {
    const request = {
      creator:
        controller.address,

      controller:
        controller.address,

      modelURI:
        `ipfs://model-${suffix}.obj`,

      modelHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            `model-${suffix}`
          )
        ),

      modelFormat:
        "OBJ",

      spectralFingerprint:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            `spectrum-${suffix}`
          )
        ),

      spectralAlgorithm:
        "spectral3d",

      spectralVersion:
        "1",

      metadataURI:
        `ipfs://object-${suffix}.json`,

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            `object-${suffix}`
          )
        ),
    };

    const tx =
      await objectRegistry
        .connect(controller)
        .registerObject(
          request
        );

    const receipt =
      await tx.wait();

    let objectId = null;

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
          objectId =
            parsed.args.objectId;

          break;
        }
      } catch (_) {}
    }

    expect(
      objectId
    ).to.not.equal(null);

    expect(
      await objectRegistry.objectExists(
        objectId
      )
    ).to.equal(true);

    return {
      objectId,
      request,
    };
  }

  async function createDifferentControllerRecords() {
    const { assetId } =
      await createAsset(
        assetController
      );

    const { objectId } =
      await createObject(
        objectController
      );

    return {
      assetId,
      objectId,
    };
  }

  async function createSharedControllerRecords() {
    const { assetId } =
      await createAsset(
        sharedController
      );

    const { objectId } =
      await createObject(
        sharedController
      );

    return {
      assetId,
      objectId,
    };
  }

  async function createProposal(
    proposer = assetController,
    linkType =
      ObjectLinkType.DIGITAL_TWIN
  ) {
    const {
      assetId,
      objectId,
    } =
      await createDifferentControllerRecords();

    const bindingId =
      await binding.getBindingId(
        assetId,
        objectId,
        linkType
      );

    await binding
      .connect(proposer)
      .proposeBinding(
        assetId,
        objectId,
        linkType
      );

    return {
      assetId,
      objectId,
      bindingId,
      linkType,
    };
  }

  async function createBilateralBinding(
    proposer = assetController,
    linkType =
      ObjectLinkType.DIGITAL_TWIN
  ) {
    const result =
      await createProposal(
        proposer,
        linkType
      );

    const accepter =
      proposer.address ===
      assetController.address
        ? objectController
        : assetController;

    await binding
      .connect(accepter)
      .acceptBinding(
        result.bindingId
      );

    return result;
  }

  // ============================================================
  // DEPLOYMENT
  // ============================================================

  describe("Deployment", function () {
    it("stores Registry addresses", async function () {
      expect(
        await binding.assetRegistry()
      ).to.equal(
        assetRegistry.target
      );

      expect(
        await binding.objectRegistry()
      ).to.equal(
        objectRegistry.target
      );
    });

    it("reports V2 version", async function () {
      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_OBJECT_BINDING_V2"
          )
        );

      expect(
        await binding.objectBindingVersion()
      ).to.equal(expected);
    });

    it("rejects zero Asset Registry", async function () {
      const Binding =
        await ethers.getContractFactory(
          "NumenObjectBinding"
        );

      await expect(
        Binding.deploy(
          ethers.ZeroAddress,
          objectRegistry.target
        )
      ).to.be.revertedWithCustomError(
        Binding,
        "ZeroAddress"
      );
    });

    it("rejects zero Object Registry", async function () {
      const Binding =
        await ethers.getContractFactory(
          "NumenObjectBinding"
        );

      await expect(
        Binding.deploy(
          assetRegistry.target,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        Binding,
        "ZeroAddress"
      );
    });
  });

  // ============================================================
  // BINDING ID
  // ============================================================

  describe("Binding ID", function () {
    it("is deterministic", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      const first =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      const second =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      expect(
        first
      ).to.equal(second);
    });

    it("changes when link type changes", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      const first =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      const second =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.CERTIFICATE
        );

      expect(
        first
      ).to.not.equal(second);
    });
  });

  // ============================================================
  // DIRECT BINDING
  // ============================================================

  describe("Direct binding", function () {
    it("allows direct binding when Asset and Object share controller", async function () {
      const {
        assetId,
        objectId,
      } =
        await createSharedControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      await expect(
        binding
          .connect(sharedController)
          .bindObject(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.emit(
          binding,
          "ObjectBound"
        )
        .withArgs(
          bindingId,
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN,
          sharedController.address
        );

      expect(
        await binding.bindingExists(
          bindingId
        )
      ).to.equal(true);

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(true);
    });

    it("stores direct binding record correctly", async function () {
      const {
        assetId,
        objectId,
      } =
        await createSharedControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      await binding
        .connect(sharedController)
        .bindObject(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      const record =
        await binding.getBinding(
          bindingId
        );

      expect(
        record.bindingId
      ).to.equal(bindingId);

      expect(
        record.assetId
      ).to.equal(assetId);

      expect(
        record.objectId
      ).to.equal(objectId);

      expect(
        record.linkType
      ).to.equal(
        BigInt(
          ObjectLinkType.PRIMARY
        )
      );

      expect(
        record.createdBy
      ).to.equal(
        sharedController.address
      );

      expect(
        record.active
      ).to.equal(true);

      expect(
        record.createdAt
      ).to.be.greaterThan(0n);

      expect(
        record.updatedAt
      ).to.equal(
        record.createdAt
      );
    });

    it("rejects direct binding when caller controls only Asset", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      await expect(
        binding
          .connect(assetController)
          .bindObject(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedObjectController"
        )
        .withArgs(
          assetController.address,
          objectId
        );
    });

    it("rejects direct binding when caller controls only Object", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      await expect(
        binding
          .connect(objectController)
          .bindObject(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedAssetController"
        )
        .withArgs(
          objectController.address,
          assetId
        );
    });

    it("rejects unrelated wallet", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      await expect(
        binding
          .connect(attacker)
          .bindObject(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedAssetController"
        )
        .withArgs(
          attacker.address,
          assetId
        );
    });

    it("rejects duplicate direct binding", async function () {
      const {
        assetId,
        objectId,
      } =
        await createSharedControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      await binding
        .connect(sharedController)
        .bindObject(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      await expect(
        binding
          .connect(sharedController)
          .bindObject(
            assetId,
            objectId,
            ObjectLinkType.PRIMARY
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "BindingAlreadyExists"
        )
        .withArgs(bindingId);
    });
  });

  // ============================================================
  // BILATERAL PROPOSALS
  // ============================================================

  describe("Bilateral proposals", function () {
    it("allows Asset controller to propose", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      await expect(
        binding
          .connect(assetController)
          .proposeBinding(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.emit(
          binding,
          "BindingProposed"
        )
        .withArgs(
          bindingId,
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN,
          assetController.address,
          assetController.address,
          objectController.address
        );

      expect(
        await binding.proposalExists(
          bindingId
        )
      ).to.equal(true);

      expect(
        await binding.bindingExists(
          bindingId
        )
      ).to.equal(false);
    });

    it("allows Object controller to propose", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.CERTIFICATE
        );

      await binding
        .connect(objectController)
        .proposeBinding(
          assetId,
          objectId,
          ObjectLinkType.CERTIFICATE
        );

      const proposal =
        await binding.getProposal(
          bindingId
        );

      expect(
        proposal.proposer
      ).to.equal(
        objectController.address
      );

      expect(
        proposal.assetController
      ).to.equal(
        assetController.address
      );

      expect(
        proposal.objectController
      ).to.equal(
        objectController.address
      );
    });

    it("rejects proposal from unrelated wallet", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      await expect(
        binding
          .connect(attacker)
          .proposeBinding(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedBindingParty"
        )
        .withArgs(
          attacker.address,
          assetId,
          objectId
        );
    });

    it("requires direct bind when both sides share controller", async function () {
      const {
        assetId,
        objectId,
      } =
        await createSharedControllerRecords();

      await expect(
        binding
          .connect(sharedController)
          .proposeBinding(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      ).to.be.revertedWithCustomError(
        binding,
        "SameControllerCanBindDirectly"
      );
    });

    it("rejects duplicate pending proposal", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createProposal();

      await expect(
        binding
          .connect(objectController)
          .proposeBinding(
            assetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "ProposalAlreadyExists"
        )
        .withArgs(bindingId);
    });
  });

  // ============================================================
  // ACCEPTANCE
  // ============================================================

  describe("Proposal acceptance", function () {
    it("allows Object controller to accept Asset proposal", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await expect(
        binding
          .connect(objectController)
          .acceptBinding(
            bindingId
          )
      )
        .to.emit(
          binding,
          "BindingProposalAccepted"
        )
        .withArgs(
          bindingId,
          objectController.address
        );

      expect(
        await binding.bindingExists(
          bindingId
        )
      ).to.equal(true);

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(true);

      expect(
        await binding.proposalExists(
          bindingId
        )
      ).to.equal(false);

      const record =
        await binding.getBinding(
          bindingId
        );

      expect(
        record.assetId
      ).to.equal(assetId);

      expect(
        record.objectId
      ).to.equal(objectId);

      expect(
        record.createdBy
      ).to.equal(
        assetController.address
      );
    });

    it("allows Asset controller to accept Object proposal", async function () {
      const {
        bindingId,
      } =
        await createProposal(
          objectController
        );

      await binding
        .connect(assetController)
        .acceptBinding(
          bindingId
        );

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(true);
    });

    it("rejects proposer accepting own proposal", async function () {
      const {
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await expect(
        binding
          .connect(assetController)
          .acceptBinding(
            bindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "ProposalAlreadyAcceptedByCaller"
        )
        .withArgs(
          bindingId,
          assetController.address
        );
    });

    it("rejects unrelated wallet accepting proposal", async function () {
      const {
        objectId,
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await expect(
        binding
          .connect(attacker)
          .acceptBinding(
            bindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedObjectController"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });

    it("rejects nonexistent proposal", async function () {
      const fakeBindingId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "missing-proposal"
          )
        );

      await expect(
        binding
          .connect(assetController)
          .acceptBinding(
            fakeBindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "ProposalNotFound"
        )
        .withArgs(
          fakeBindingId
        );
    });
  });

  // ============================================================
  // CANCELLATION
  // ============================================================

  describe("Proposal cancellation", function () {
    it("allows proposer to cancel", async function () {
      const {
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await expect(
        binding
          .connect(assetController)
          .cancelBindingProposal(
            bindingId
          )
      )
        .to.emit(
          binding,
          "BindingProposalCancelled"
        )
        .withArgs(
          bindingId,
          assetController.address
        );

      expect(
        await binding.proposalExists(
          bindingId
        )
      ).to.equal(false);
    });

    it("allows opposite controller to cancel", async function () {
      const {
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await binding
        .connect(objectController)
        .cancelBindingProposal(
          bindingId
        );

      expect(
        await binding.proposalExists(
          bindingId
        )
      ).to.equal(false);
    });

    it("rejects unrelated wallet cancellation", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createProposal(
          assetController
        );

      await expect(
        binding
          .connect(attacker)
          .cancelBindingProposal(
            bindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedBindingParty"
        )
        .withArgs(
          attacker.address,
          assetId,
          objectId
        );
    });
  });

  // ============================================================
  // UNBIND
  // ============================================================

  describe("Unbinding", function () {
    it("allows Asset controller to unbind", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createBilateralBinding();

      await expect(
        binding
          .connect(assetController)
          .unbindObject(
            bindingId
          )
      )
        .to.emit(
          binding,
          "ObjectUnbound"
        )
        .withArgs(
          bindingId,
          assetId,
          objectId,
          assetController.address
        );

      expect(
        await binding.bindingExists(
          bindingId
        )
      ).to.equal(true);

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(false);
    });

    it("allows Object controller to unbind", async function () {
      const {
        bindingId,
      } =
        await createBilateralBinding();

      await binding
        .connect(objectController)
        .unbindObject(
          bindingId
        );

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(false);
    });

    it("rejects unrelated wallet", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createBilateralBinding();

      await expect(
        binding
          .connect(attacker)
          .unbindObject(
            bindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "UnauthorizedBindingParty"
        )
        .withArgs(
          attacker.address,
          assetId,
          objectId
        );
    });

    it("rejects second unbind", async function () {
      const {
        bindingId,
      } =
        await createBilateralBinding();

      await binding
        .connect(assetController)
        .unbindObject(
          bindingId
        );

      await expect(
        binding
          .connect(objectController)
          .unbindObject(
            bindingId
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "BindingAlreadyInactive"
        )
        .withArgs(bindingId);
    });
  });

  // ============================================================
  // REBIND
  // ============================================================

  describe("Rebinding", function () {
    it("requires bilateral consent when controllers differ", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createBilateralBinding();

      await binding
        .connect(assetController)
        .unbindObject(
          bindingId
        );

      await binding
        .connect(assetController)
        .proposeBinding(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(false);

      await expect(
        binding
          .connect(objectController)
          .acceptBinding(
            bindingId
          )
      )
        .to.emit(
          binding,
          "ObjectRebound"
        )
        .withArgs(
          bindingId,
          assetId,
          objectId,
          objectController.address
        );

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(true);
    });

    it("allows direct rebind when controller is shared", async function () {
      const {
        assetId,
        objectId,
      } =
        await createSharedControllerRecords();

      const bindingId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      await binding
        .connect(sharedController)
        .bindObject(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        );

      await binding
        .connect(sharedController)
        .unbindObject(
          bindingId
        );

      await expect(
        binding
          .connect(sharedController)
          .rebindObject(
            bindingId
          )
      )
        .to.emit(
          binding,
          "ObjectRebound"
        )
        .withArgs(
          bindingId,
          assetId,
          objectId,
          sharedController.address
        );

      expect(
        await binding.isBindingActive(
          bindingId
        )
      ).to.equal(true);
    });

    it("rejects direct rebind when controllers differ", async function () {
      const {
        bindingId,
      } =
        await createBilateralBinding();

      await binding
        .connect(assetController)
        .unbindObject(
          bindingId
        );

      await expect(
        binding
          .connect(assetController)
          .rebindObject(
            bindingId
          )
      ).to.be.revertedWithCustomError(
        binding,
        "UnauthorizedObjectController"
      );
    });
  });

  // ============================================================
  // ENUMERATION
  // ============================================================

  describe("Enumeration", function () {
    it("enumerates global bindings", async function () {
      const result =
        await createBilateralBinding();

      expect(
        await binding.totalBindings()
      ).to.equal(1n);

      expect(
        await binding.bindingIdAt(0)
      ).to.equal(
        result.bindingId
      );

      expect(
        await binding.allBindingIds()
      ).to.deep.equal([
        result.bindingId,
      ]);
    });

    it("enumerates multiple link types for an Asset", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      const firstId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      await binding
        .connect(assetController)
        .proposeBinding(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      await binding
        .connect(objectController)
        .acceptBinding(
          firstId
        );

      const secondId =
        await binding.getBindingId(
          assetId,
          objectId,
          ObjectLinkType.CERTIFICATE
        );

      await binding
        .connect(assetController)
        .proposeBinding(
          assetId,
          objectId,
          ObjectLinkType.CERTIFICATE
        );

      await binding
        .connect(objectController)
        .acceptBinding(
          secondId
        );

      expect(
        await binding.assetBindingCount(
          assetId
        )
      ).to.equal(2n);

      expect(
        await binding.assetBindingIdAt(
          assetId,
          0
        )
      ).to.equal(firstId);

      expect(
        await binding.assetBindingIdAt(
          assetId,
          1
        )
      ).to.equal(secondId);

      expect(
        await binding.assetBindingIds(
          assetId
        )
      ).to.deep.equal([
        firstId,
        secondId,
      ]);

      expect(
        await binding.objectBindingCount(
          objectId
        )
      ).to.equal(2n);
    });

    it("does not duplicate indexes after rebind", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createBilateralBinding();

      await binding
        .connect(assetController)
        .unbindObject(
          bindingId
        );

      await binding
        .connect(assetController)
        .proposeBinding(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        );

      await binding
        .connect(objectController)
        .acceptBinding(
          bindingId
        );

      expect(
        await binding.totalBindings()
      ).to.equal(1n);

      expect(
        await binding.assetBindingCount(
          assetId
        )
      ).to.equal(1n);

      expect(
        await binding.objectBindingCount(
          objectId
        )
      ).to.equal(1n);
    });

    it("rejects invalid global index", async function () {
      await expect(
        binding.bindingIdAt(0)
      ).to.be.revertedWithCustomError(
        binding,
        "InvalidIndex"
      );
    });
  });

  // ============================================================
  // RELATIONSHIP LOOKUP
  // ============================================================

  describe("Relationship lookup", function () {
    it("distinguishes existence from active state", async function () {
      const {
        assetId,
        objectId,
        bindingId,
      } =
        await createBilateralBinding();

      expect(
        await binding.relationshipExists(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        )
      ).to.equal(true);

      expect(
        await binding.isRelationshipActive(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        )
      ).to.equal(true);

      await binding
        .connect(assetController)
        .unbindObject(
          bindingId
        );

      expect(
        await binding.relationshipExists(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        )
      ).to.equal(true);

      expect(
        await binding.isRelationshipActive(
          assetId,
          objectId,
          ObjectLinkType.DIGITAL_TWIN
        )
      ).to.equal(false);
    });

    it("returns false for nonexistent relationship", async function () {
      const {
        assetId,
        objectId,
      } =
        await createDifferentControllerRecords();

      expect(
        await binding.relationshipExists(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        )
      ).to.equal(false);

      expect(
        await binding.isRelationshipActive(
          assetId,
          objectId,
          ObjectLinkType.PRIMARY
        )
      ).to.equal(false);
    });
  });

  // ============================================================
  // RECORD VALIDATION
  // ============================================================

  describe("Record validation", function () {
    it("rejects unknown Asset", async function () {
      const fakeAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "fake-asset"
          )
        );

      const {
        objectId,
      } =
        await createObject(
          objectController
        );

      await expect(
        binding
          .connect(objectController)
          .proposeBinding(
            fakeAssetId,
            objectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "AssetNotFound"
        )
        .withArgs(
          fakeAssetId
        );
    });

    it("rejects unknown Object", async function () {
      const {
        assetId,
      } =
        await createAsset(
          assetController
        );

      const fakeObjectId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "fake-object"
          )
        );

      await expect(
        binding
          .connect(assetController)
          .proposeBinding(
            assetId,
            fakeObjectId,
            ObjectLinkType.DIGITAL_TWIN
          )
      )
        .to.be.revertedWithCustomError(
          binding,
          "ObjectNotFound"
        )
        .withArgs(
          fakeObjectId
        );
    });
  });
});