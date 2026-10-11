const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenAssetRegistry", function () {
  let registry;
  let mockAsset;

  let deployer;
  let creator;
  let controller;
  let newController;
  let unauthorized;

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

  async function deployFixture() {
    [
      deployer,
      creator,
      controller,
      newController,
      unauthorized,
    ] = await ethers.getSigners();

    const Registry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    registry =
      await Registry.deploy();

    await registry.waitForDeployment();

    const MockAsset =
      await ethers.getContractFactory(
        "RegistryMockAsset"
      );

    mockAsset =
      await MockAsset.deploy();

    await mockAsset.waitForDeployment();
  }

  function createRequest(overrides = {}) {
    return {
      assetClass:
        AssetClass.FUNGIBLE,

      standard:
        AssetStandard.ERC20,

      scope:
        AssetScope.CONTRACT,

      category:
        AssetCategory.UTILITY,

      representation:
        RepresentationType.DIGITAL_ASSET,

      tokenId: 0,

      creator:
        creator.address,

      controller:
        controller.address,

      metadataURI:
        "ipfs://numen-test-metadata",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "numen-test-metadata"
          )
        ),

      ...overrides,
    };
  }

  async function registerWithMock(
    request
  ) {
    const tx =
      await mockAsset.registerSelf(
        registry.target,
        request.assetClass,
        request.standard,
        request.scope,
        request.category,
        request.representation,
        request.tokenId,
        request.creator,
        request.controller,
        request.metadataURI,
        request.metadataHash
      );

    await tx.wait();

    return registry.getAssetId(
      mockAsset.target,
      request.scope,
      request.tokenId
    );
  }

  async function registerDefaultAsset() {
    const request =
      createRequest();

    const assetId =
      await registerWithMock(
        request
      );

    return {
      request,
      assetId,
    };
  }

  beforeEach(async function () {
    await deployFixture();
  });

  describe("Deployment", function () {
    it("starts with zero registered assets", async function () {
      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });

    it("returns the expected registry version", async function () {
      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ASSET_REGISTRY_V2"
          )
        );

      expect(
        await registry.registryVersion()
      ).to.equal(expected);
    });
  });

  describe("Canonical self-registration", function () {
    it("registers a fungible ERC20 contract-scoped asset", async function () {
      const request =
        createRequest();

      await expect(
        mockAsset.registerSelf(
          registry.target,
          request.assetClass,
          request.standard,
          request.scope,
          request.category,
          request.representation,
          request.tokenId,
          request.creator,
          request.controller,
          request.metadataURI,
          request.metadataHash
        )
      ).to.emit(
        registry,
        "AssetRegistered"
      );

      const assetId =
        await registry.getAssetId(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        );

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.assetExists(
          assetId
        )
      ).to.equal(true);

      expect(
        await registry.isAssetActive(
          assetId
        )
      ).to.equal(true);

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);

      expect(
        await registry.totalAssets()
      ).to.equal(1n);
    });

    it("rejects direct EOA registration for another contract", async function () {
      const request =
        createRequest();

      const directRequest = {
        assetClass:
          request.assetClass,

        standard:
          request.standard,

        scope:
          request.scope,

        category:
          request.category,

        representation:
          request.representation,

        assetContract:
          mockAsset.target,

        tokenId:
          request.tokenId,

        creator:
          request.creator,

        controller:
          request.controller,

        metadataURI:
          request.metadataURI,

        metadataHash:
          request.metadataHash,
      };

      await expect(
        registry
          .connect(creator)
          .registerAsset(
            directRequest
          )
      )
        .to.be.revertedWithCustomError(
          registry,
          "UnauthorizedAssetRegistration"
        )
        .withArgs(
          creator.address,
          mockAsset.target
        );
    });

    it("stores the complete scoped asset record", async function () {
      const {
        request,
        assetId,
      } =
        await registerDefaultAsset();

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.assetId
      ).to.equal(assetId);

      expect(
        record.assetClass
      ).to.equal(
        BigInt(
          request.assetClass
        )
      );

      expect(
        record.standard
      ).to.equal(
        BigInt(
          request.standard
        )
      );

      expect(
        record.scope
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
      );

      expect(
        record.category
      ).to.equal(
        BigInt(
          request.category
        )
      );

      expect(
        record.representation
      ).to.equal(
        BigInt(
          request.representation
        )
      );

      expect(
        record.assetContract
      ).to.equal(
        mockAsset.target
      );

      expect(
        record.tokenId
      ).to.equal(0n);

      expect(
        record.creator
      ).to.equal(
        creator.address
      );

      expect(
        record.controller
      ).to.equal(
        controller.address
      );

      expect(
        record.metadataURI
      ).to.equal(
        request.metadataURI
      );

      expect(
        record.metadataHash
      ).to.equal(
        request.metadataHash
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

    it("adds the asset to global enumeration", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      expect(
        await registry.assetIdAt(
          0
        )
      ).to.equal(assetId);
    });

    it("adds the asset to creator enumeration", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      expect(
        await registry.creatorAssetCount(
          creator.address
        )
      ).to.equal(1n);

      expect(
        await registry.creatorAssetIdAt(
          creator.address,
          0
        )
      ).to.equal(assetId);
    });

    it("adds the asset to controller enumeration", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      expect(
        await registry.controllerAssetCount(
          controller.address
        )
      ).to.equal(1n);

      expect(
        await registry.controllerAssetIdAt(
          controller.address,
          0
        )
      ).to.equal(assetId);
    });

    it("rejects duplicate contract/scope/tokenId registration", async function () {
      const request =
        createRequest();

      await registerWithMock(
        request
      );

      await expect(
        mockAsset.registerSelf(
          registry.target,
          request.assetClass,
          request.standard,
          request.scope,
          request.category,
          request.representation,
          request.tokenId,
          request.creator,
          request.controller,
          request.metadataURI,
          request.metadataHash
        )
      )
        .to.be.revertedWithCustomError(
          registry,
          "AssetAlreadyRegistered"
        )
        .withArgs(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        );
    });
  });

  describe("Scope rules", function () {
    it("rejects ERC20 TOKEN scope", async function () {
      const request =
        createRequest({
          scope:
            AssetScope.TOKEN,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidScopeTokenCombination"
      );
    });

    it("rejects ERC20 CONTRACT scope with non-zero tokenId", async function () {
      const request =
        createRequest({
          tokenId: 1,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidScopeTokenCombination"
      );
    });

    it("allows ERC721 collection CONTRACT scope with tokenId zero", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.CONTRACT,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const assetId =
        await registerWithMock(
          request
        );

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);
    });

    it("allows ERC721 TOKEN scope with tokenId zero", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.TOKEN,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const assetId =
        await registerWithMock(
          request
        );

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(true);
    });

    it("keeps ERC721 collection CONTRACT/0 and NFT TOKEN/0 as different identities", async function () {
      const collectionRequest =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.CONTRACT,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const tokenRequest =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.TOKEN,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const collectionAssetId =
        await registerWithMock(
          collectionRequest
        );

      const tokenAssetId =
        await registerWithMock(
          tokenRequest
        );

      expect(
        collectionAssetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        tokenAssetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        collectionAssetId
      ).to.not.equal(
        tokenAssetId
      );

      expect(
        await registry.getAssetId(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(
        collectionAssetId
      );

      expect(
        await registry.getAssetId(
          mockAsset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(
        tokenAssetId
      );

      expect(
        await registry.totalAssets()
      ).to.equal(2n);
    });

    it("allows ERC721 TOKEN scope with non-zero tokenId", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.TOKEN,

          tokenId: 42,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const assetId =
        await registerWithMock(
          request
        );

      expect(
        await registry.getAssetId(
          mockAsset.target,
          AssetScope.TOKEN,
          42
        )
      ).to.equal(assetId);
    });

    it("rejects ERC721 CONTRACT scope with non-zero tokenId", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC721,

          scope:
            AssetScope.CONTRACT,

          tokenId: 42,

          category:
            AssetCategory.COLLECTIBLE,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidScopeTokenCombination"
      );
    });

    it("allows ERC1155 collection CONTRACT/0 and TOKEN/0 as different identities", async function () {
      const collectionRequest =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC1155,

          scope:
            AssetScope.CONTRACT,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const tokenRequest =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC1155,

          scope:
            AssetScope.TOKEN,

          tokenId: 0,

          category:
            AssetCategory.COLLECTIBLE,
        });

      const collectionAssetId =
        await registerWithMock(
          collectionRequest
        );

      const tokenAssetId =
        await registerWithMock(
          tokenRequest
        );

      expect(
        collectionAssetId
      ).to.not.equal(
        tokenAssetId
      );

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(true);
    });
  });

  describe("Registration validation", function () {
    it("rejects zero creator", async function () {
      const request =
        createRequest({
          creator:
            ethers.ZeroAddress,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "ZeroAddress"
      );
    });

    it("rejects zero controller", async function () {
      const request =
        createRequest({
          controller:
            ethers.ZeroAddress,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "ZeroAddress"
      );
    });

    it("rejects NONE asset standard", async function () {
      const request =
        createRequest({
          standard:
            AssetStandard.NONE,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidAssetStandard"
      );
    });

    it("rejects fungible ERC721 combination", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.FUNGIBLE,

          standard:
            AssetStandard.ERC721,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidClassStandardCombination"
      );
    });

    it("rejects non-fungible ERC20 combination", async function () {
      const request =
        createRequest({
          assetClass:
            AssetClass.NON_FUNGIBLE,

          standard:
            AssetStandard.ERC20,
        });

      await expect(
        registerWithMock(
          request
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidClassStandardCombination"
      );
    });

    it("rejects an EOA as assetContract", async function () {
      const request =
        createRequest();

      const directRequest = {
        assetClass:
          request.assetClass,

        standard:
          request.standard,

        scope:
          request.scope,

        category:
          request.category,

        representation:
          request.representation,

        assetContract:
          unauthorized.address,

        tokenId:
          request.tokenId,

        creator:
          request.creator,

        controller:
          request.controller,

        metadataURI:
          request.metadataURI,

        metadataHash:
          request.metadataHash,
      };

      await expect(
        registry.registerAsset(
          directRequest
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidAssetContract"
      );
    });
  });

  describe("Metadata", function () {
    it("allows controller to update metadata", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      const newURI =
        "ipfs://updated-numen-metadata";

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "updated-numen-metadata"
          )
        );

      await expect(
        registry
          .connect(controller)
          .updateMetadata(
            assetId,
            newURI,
            newHash
          )
      )
        .to.emit(
          registry,
          "AssetMetadataUpdated"
        )
        .withArgs(
          assetId,
          newURI,
          newHash,
          controller.address
        );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.metadataURI
      ).to.equal(newURI);

      expect(
        record.metadataHash
      ).to.equal(newHash);
    });

    it("rejects metadata update from unauthorized account", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(unauthorized)
          .updateMetadata(
            assetId,
            "ipfs://unauthorized",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });
  });

  describe("Classification", function () {
    it("allows controller to update classification", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .updateClassification(
            assetId,
            AssetCategory.COMMODITY,
            RepresentationType
              .FRACTIONAL_INTEREST
          )
      )
        .to.emit(
          registry,
          "AssetClassificationUpdated"
        )
        .withArgs(
          assetId,
          AssetCategory.COMMODITY,
          RepresentationType
            .FRACTIONAL_INTEREST,
          controller.address
        );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.category
      ).to.equal(
        BigInt(
          AssetCategory.COMMODITY
        )
      );

      expect(
        record.representation
      ).to.equal(
        BigInt(
          RepresentationType
            .FRACTIONAL_INTEREST
        )
      );
    });

    it("rejects classification update from unauthorized account", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(unauthorized)
          .updateClassification(
            assetId,
            AssetCategory.COMMODITY,
            RepresentationType
              .FRACTIONAL_INTEREST
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });
  });

  describe("Controller transfer", function () {
    async function proposeAndAccept(assetId) {
      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await registry
        .connect(newController)
        .acceptAssetController(
          assetId
        );
    }

    it("proposes a new controller without immediately transferring authority", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .proposeAssetController(
            assetId,
            newController.address
          )
      )
        .to.emit(
          registry,
          "AssetControllerTransferProposed"
        )
        .withArgs(
          assetId,
          controller.address,
          newController.address
        );

      expect(
        await registry.pendingAssetController(
          assetId
        )
      ).to.equal(
        newController.address
      );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.controller
      ).to.equal(
        controller.address
      );

      expect(
        await registry.controllerAssetCount(
          controller.address
        )
      ).to.equal(1n);

      expect(
        await registry.controllerAssetCount(
          newController.address
        )
      ).to.equal(0n);
    });

    it("keeps current controller permissions while transfer is pending", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(controller)
          .updateMetadata(
            assetId,
            "ipfs://still-current-controller",
            ethers.ZeroHash
          )
      ).to.not.be.reverted;

      await expect(
        registry
          .connect(newController)
          .updateMetadata(
            assetId,
            "ipfs://not-controller-yet",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });

    it("accepts a proposed controller transfer", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(newController)
          .acceptAssetController(
            assetId
          )
      )
        .to.emit(
          registry,
          "AssetControllerTransferred"
        )
        .withArgs(
          assetId,
          controller.address,
          newController.address
        );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.controller
      ).to.equal(
        newController.address
      );

      expect(
        await registry.pendingAssetController(
          assetId
        )
      ).to.equal(
        ethers.ZeroAddress
      );
    });

    it("updates controller indexes only after acceptance", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      expect(
        await registry.controllerAssetCount(
          controller.address
        )
      ).to.equal(1n);

      expect(
        await registry.controllerAssetCount(
          newController.address
        )
      ).to.equal(0n);

      await registry
        .connect(newController)
        .acceptAssetController(
          assetId
        );

      expect(
        await registry.controllerAssetCount(
          controller.address
        )
      ).to.equal(0n);

      expect(
        await registry.controllerAssetCount(
          newController.address
        )
      ).to.equal(1n);

      expect(
        await registry.controllerAssetIdAt(
          newController.address,
          0
        )
      ).to.equal(assetId);
    });

    it("does not change historical creator after controller transfer", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await proposeAndAccept(
        assetId
      );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.creator
      ).to.equal(
        creator.address
      );

      expect(
        await registry.creatorAssetCount(
          creator.address
        )
      ).to.equal(1n);
    });

    it("old controller loses permissions after acceptance", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await proposeAndAccept(
        assetId
      );

      await expect(
        registry
          .connect(controller)
          .updateMetadata(
            assetId,
            "ipfs://old-controller",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });

    it("new controller receives permissions after acceptance", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await proposeAndAccept(
        assetId
      );

      await expect(
        registry
          .connect(newController)
          .updateMetadata(
            assetId,
            "ipfs://new-controller",
            ethers.ZeroHash
          )
      ).to.not.be.reverted;
    });

    it("rejects zero-address controller proposal", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .proposeAssetController(
            assetId,
            ethers.ZeroAddress
          )
      ).to.be.revertedWithCustomError(
        registry,
        "ZeroAddress"
      );
    });

    it("rejects proposal to current controller", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .proposeAssetController(
            assetId,
            controller.address
          )
      ).to.be.revertedWithCustomError(
        registry,
        "SameController"
      );
    });

    it("rejects controller proposal from unauthorized account", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(unauthorized)
          .proposeAssetController(
            assetId,
            newController.address
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });

    it("rejects acceptance when no controller transfer is pending", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(newController)
          .acceptAssetController(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "NoPendingControllerTransfer"
      );
    });

    it("rejects acceptance from an address other than the proposed controller", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(unauthorized)
          .acceptAssetController(
            assetId
          )
      )
        .to.be.revertedWithCustomError(
          registry,
          "UnauthorizedPendingController"
        )
        .withArgs(
          assetId,
          unauthorized.address,
          newController.address
        );
    });

    it("allows current controller to replace a pending proposal", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(controller)
          .proposeAssetController(
            assetId,
            unauthorized.address
          )
      )
        .to.emit(
          registry,
          "AssetControllerTransferProposed"
        )
        .withArgs(
          assetId,
          controller.address,
          unauthorized.address
        );

      expect(
        await registry.pendingAssetController(
          assetId
        )
      ).to.equal(
        unauthorized.address
      );

      await expect(
        registry
          .connect(newController)
          .acceptAssetController(
            assetId
          )
      )
        .to.be.revertedWithCustomError(
          registry,
          "UnauthorizedPendingController"
        )
        .withArgs(
          assetId,
          newController.address,
          unauthorized.address
        );

      await registry
        .connect(unauthorized)
        .acceptAssetController(
          assetId
        );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.controller
      ).to.equal(
        unauthorized.address
      );
    });

    it("allows current controller to cancel a pending proposal", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(controller)
          .cancelAssetControllerTransfer(
            assetId
          )
      )
        .to.emit(
          registry,
          "AssetControllerTransferCancelled"
        )
        .withArgs(
          assetId,
          controller.address,
          newController.address
        );

      expect(
        await registry.pendingAssetController(
          assetId
        )
      ).to.equal(
        ethers.ZeroAddress
      );

      await expect(
        registry
          .connect(newController)
          .acceptAssetController(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "NoPendingControllerTransfer"
      );
    });

    it("rejects cancellation when no proposal is pending", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .cancelAssetControllerTransfer(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "NoPendingControllerTransfer"
      );
    });

    it("rejects cancellation from unauthorized account", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await expect(
        registry
          .connect(unauthorized)
          .cancelAssetControllerTransfer(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "Unauthorized"
      );
    });

    it("rejects pending controller lookup for an unknown asset", async function () {
      const fakeAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown-controller-transfer"
          )
        );

      await expect(
        registry.pendingAssetController(
          fakeAssetId
        )
      ).to.be.revertedWithCustomError(
        registry,
        "AssetNotFound"
      );
    });
  });

  describe("Activation", function () {
    it("allows controller to deactivate an asset", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .deactivateAsset(
            assetId
          )
      )
        .to.emit(
          registry,
          "AssetDeactivated"
        )
        .withArgs(
          assetId,
          controller.address
        );

      expect(
        await registry.isAssetActive(
          assetId
        )
      ).to.equal(false);

      expect(
        await registry.assetExists(
          assetId
        )
      ).to.equal(true);
    });

    it("allows controller to reactivate an asset", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(
          assetId
        );

      await expect(
        registry
          .connect(controller)
          .reactivateAsset(
            assetId
          )
      )
        .to.emit(
          registry,
          "AssetReactivated"
        )
        .withArgs(
          assetId,
          controller.address
        );

      expect(
        await registry.isAssetActive(
          assetId
        )
      ).to.equal(true);
    });

    it("rejects double deactivation", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(
          assetId
        );

      await expect(
        registry
          .connect(controller)
          .deactivateAsset(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "AssetAlreadyInactive"
      );
    });

    it("rejects reactivation of active asset", async function () {
      const {
        assetId,
      } =
        await registerDefaultAsset();

      await expect(
        registry
          .connect(controller)
          .reactivateAsset(
            assetId
          )
      ).to.be.revertedWithCustomError(
        registry,
        "AssetAlreadyActive"
      );
    });
  });

  describe("Inactive asset hardening", function () {
    it("rejects metadata updates while the asset is inactive", async function () {
      const { assetId } = await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(assetId);

      await expect(
        registry
          .connect(controller)
          .updateMetadata(
            assetId,
            "ipfs://inactive-metadata",
            ethers.keccak256(
              ethers.toUtf8Bytes("inactive-metadata")
            )
          )
      )
        .to.be.revertedWithCustomError(
          registry,
          "AssetInactive"
        )
        .withArgs(assetId);
    });

    it("rejects classification updates while the asset is inactive", async function () {
      const { assetId } = await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(assetId);

      await expect(
        registry
          .connect(controller)
          .updateClassification(
            assetId,
            AssetCategory.COMMODITY,
            RepresentationType.PHYSICAL_REFERENCE
          )
      )
        .to.be.revertedWithCustomError(
          registry,
          "AssetInactive"
        )
        .withArgs(assetId);
    });

    it("allows metadata and classification updates again after reactivation", async function () {
      const { assetId } = await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(assetId);

      await registry
        .connect(controller)
        .reactivateAsset(assetId);

      const newURI = "ipfs://reactivated-metadata";
      const newHash = ethers.keccak256(
        ethers.toUtf8Bytes("reactivated-metadata")
      );

      await expect(
        registry
          .connect(controller)
          .updateMetadata(
            assetId,
            newURI,
            newHash
          )
      ).to.not.be.reverted;

      await expect(
        registry
          .connect(controller)
          .updateClassification(
            assetId,
            AssetCategory.COMMODITY,
            RepresentationType.PHYSICAL_REFERENCE
          )
      ).to.not.be.reverted;

      const record = await registry.getAsset(assetId);

      expect(record.metadataURI).to.equal(newURI);
      expect(record.metadataHash).to.equal(newHash);
      expect(record.category).to.equal(
        BigInt(AssetCategory.COMMODITY)
      );
      expect(record.representation).to.equal(
        BigInt(RepresentationType.PHYSICAL_REFERENCE)
      );
    });

    it("allows controller transfer while the asset is inactive", async function () {
      const { assetId } = await registerDefaultAsset();

      await registry
        .connect(controller)
        .deactivateAsset(assetId);

      await expect(
        registry
          .connect(controller)
          .proposeAssetController(
            assetId,
            newController.address
          )
      )
        .to.emit(
          registry,
          "AssetControllerTransferProposed"
        )
        .withArgs(
          assetId,
          controller.address,
          newController.address
        );

      await expect(
        registry
          .connect(newController)
          .acceptAssetController(assetId)
      )
        .to.emit(
          registry,
          "AssetControllerTransferred"
        )
        .withArgs(
          assetId,
          controller.address,
          newController.address
        );

      const record = await registry.getAsset(assetId);

      expect(record.controller).to.equal(
        newController.address
      );
      expect(record.active).to.equal(false);

      expect(
        await registry.pendingAssetController(assetId)
      ).to.equal(ethers.ZeroAddress);

      await expect(
        registry
          .connect(newController)
          .reactivateAsset(assetId)
      )
        .to.emit(
          registry,
          "AssetReactivated"
        )
        .withArgs(
          assetId,
          newController.address
        );

      expect(
        await registry.isAssetActive(assetId)
      ).to.equal(true);
    });
  });

  describe("Unknown assets and indexes", function () {
    it("rejects getAsset for unknown asset", async function () {
      const fakeAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown"
          )
        );

      await expect(
        registry.getAsset(
          fakeAssetId
        )
      ).to.be.revertedWithCustomError(
        registry,
        "AssetNotFound"
      );
    });

    it("returns false for unknown asset active state", async function () {
      const fakeAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown"
          )
        );

      expect(
        await registry.isAssetActive(
          fakeAssetId
        )
      ).to.equal(false);
    });

    it("returns zero hash for an unregistered scoped identity", async function () {
      expect(
        await registry.getAssetId(
          mockAsset.target,
          AssetScope.TOKEN,
          999
        )
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.isRegisteredAsset(
          mockAsset.target,
          AssetScope.TOKEN,
          999
        )
      ).to.equal(false);
    });

    it("rejects invalid global enumeration index", async function () {
      await expect(
        registry.assetIdAt(0)
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidIndex"
      );
    });
  });
});