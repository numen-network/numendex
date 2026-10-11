const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenERC721Asset", function () {
  let registry;

  let deployer;
  let creator;
  let admin;
  let minter;
  let pauser;
  let metadataAuthority;
  let owner;
  let receiver;
  let attacker;

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

  async function getSigners() {
    [
      deployer,
      creator,
      admin,
      minter,
      pauser,
      metadataAuthority,
      owner,
      receiver,
      attacker,
    ] = await ethers.getSigners();
  }

  async function deployRegistry() {
    const Registry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    registry =
      await Registry.deploy();

    await registry.waitForDeployment();

    return registry;
  }

  function createConfig(overrides = {}) {
    return {
      name: "Numen NFT Collection",
      symbol: "NNFT",

      maxSupply: 100,

      mintable: true,
      burnable: true,
      pausable: true,
      objectBindingEnabled: true,

      category:
        AssetCategory.COLLECTIBLE,

      representation:
        RepresentationType.DIGITAL_ASSET,

      metadataURI:
        "ipfs://numen-collection",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "numen-collection"
          )
        ),

      baseURI:
        "ipfs://numen-tokens/",

      creator:
        creator.address,

      admin:
        admin.address,

      mintAuthority:
        minter.address,

      pauseAuthority:
        pauser.address,

      metadataAuthority:
        metadataAuthority.address,

      registry:
        registry.target,

      ...overrides,
    };
  }

  async function deployAsset(
    overrides = {}
  ) {
    const Asset =
      await ethers.getContractFactory(
        "NumenERC721Asset"
      );

    const config =
      createConfig(overrides);

    const asset =
      await Asset.deploy(config);

    await asset.waitForDeployment();

    return {
      asset,
      config,
    };
  }

  async function mintToken(
    asset,
    tokenId = 1,
    tokenOwner = owner,
    tokenURI = "",
    metadataHash = ethers.ZeroHash
  ) {
    const tx =
      await asset
        .connect(minter)
        .mint(
          tokenOwner.address,
          tokenId,
          tokenURI,
          metadataHash
        );

    await tx.wait();

    return tx;
  }

  beforeEach(async function () {
    await getSigners();
    await deployRegistry();
  });

  describe("Deployment", function () {
    it("deploys with correct ERC721 identity", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.name()
      ).to.equal(
        "Numen NFT Collection"
      );

      expect(
        await asset.symbol()
      ).to.equal("NNFT");
    });

    it("stores Numen creator and admin", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenCreator()
      ).to.equal(
        creator.address
      );

      expect(
        await asset.numenAdmin()
      ).to.equal(
        admin.address
      );

      expect(
        await asset.initialRegistryController()
      ).to.equal(
        admin.address
      );
    });

    it("reports NON_FUNGIBLE and ERC721", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenAssetClass()
      ).to.equal(1n);

      expect(
        await asset.numenAssetStandard()
      ).to.equal(2n);
    });

    it("reports correct collection and token scopes", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenCollectionScope()
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
      );

      expect(
        await asset.numenTokenScope()
      ).to.equal(
        BigInt(
          AssetScope.TOKEN
        )
      );
    });

    it("stores selected features", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenMintable()
      ).to.equal(true);

      expect(
        await asset.numenBurnable()
      ).to.equal(true);

      expect(
        await asset.numenPausable()
      ).to.equal(true);

      expect(
        await asset.numenObjectBindingEnabled()
      ).to.equal(true);

      expect(
        await asset.maximumSupply()
      ).to.equal(100n);
    });

    it("stores classification", async function () {
      const {
        asset,
        config,
      } = await deployAsset();

      expect(
        await asset.numenAssetCategory()
      ).to.equal(
        BigInt(
          config.category
        )
      );

      expect(
        await asset.numenRepresentation()
      ).to.equal(
        BigInt(
          config.representation
        )
      );
    });

    it("stores collection metadata", async function () {
      const {
        asset,
        config,
      } = await deployAsset();

      expect(
        await asset.numenMetadataURI()
      ).to.equal(
        config.metadataURI
      );

      expect(
        await asset.numenMetadataHash()
      ).to.equal(
        config.metadataHash
      );

      expect(
        await asset.baseURI()
      ).to.equal(
        config.baseURI
      );
    });

    it("starts without Numen registration", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenAssetId()
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.isNumenRegistered()
      ).to.equal(false);
    });

    it("reports V2 implementation version", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenImplementationVersion()
      ).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ERC721_ASSET_V2"
          )
        )
      );
    });
  });

  describe("Roles", function () {
    it("assigns admin role only to selected admin", async function () {
      const { asset } =
        await deployAsset();

      const role =
        await asset.DEFAULT_ADMIN_ROLE();

      expect(
        await asset.hasRole(
          role,
          admin.address
        )
      ).to.equal(true);

      expect(
        await asset.hasRole(
          role,
          creator.address
        )
      ).to.equal(false);
    });

    it("assigns minter role", async function () {
      const { asset } =
        await deployAsset();

      const role =
        await asset.MINTER_ROLE();

      expect(
        await asset.hasRole(
          role,
          minter.address
        )
      ).to.equal(true);

      expect(
        await asset.hasRole(
          role,
          attacker.address
        )
      ).to.equal(false);
    });

    it("assigns pauser role", async function () {
      const { asset } =
        await deployAsset();

      const role =
        await asset.PAUSER_ROLE();

      expect(
        await asset.hasRole(
          role,
          pauser.address
        )
      ).to.equal(true);
    });

    it("assigns metadata role", async function () {
      const { asset } =
        await deployAsset();

      const role =
        await asset.METADATA_ROLE();

      expect(
        await asset.hasRole(
          role,
          metadataAuthority.address
        )
      ).to.equal(true);
    });
  });

  describe("Minting", function () {
    it("mints an NFT", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      expect(
        await asset.ownerOf(1)
      ).to.equal(
        owner.address
      );

      expect(
        await asset.totalMinted()
      ).to.equal(1n);

      expect(
        await asset.tokenEverMinted(1)
      ).to.equal(true);

      expect(
        await asset.tokenExists(1)
      ).to.equal(true);
    });

    it("stores explicit token URI and metadata hash", async function () {
      const { asset } =
        await deployAsset();

      const metadataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "token-1"
          )
        );

      await mintToken(
        asset,
        1,
        owner,
        "ipfs://token-1",
        metadataHash
      );

      expect(
        await asset.tokenURI(1)
      ).to.equal(
        "ipfs://token-1"
      );

      expect(
        await asset.tokenMetadataHash(
          1
        )
      ).to.equal(
        metadataHash
      );
    });

    it("uses base URI when explicit token URI is empty", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        25
      );

      expect(
        await asset.tokenURI(25)
      ).to.equal(
        "ipfs://numen-tokens/25"
      );
    });

    it("allows tokenId zero", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        0
      );

      expect(
        await asset.ownerOf(0)
      ).to.equal(
        owner.address
      );

      expect(
        await asset.tokenEverMinted(0)
      ).to.equal(true);
    });

    it("rejects unauthorized minting", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(attacker)
          .mint(
            attacker.address,
            1,
            "",
            ethers.ZeroHash
          )
      ).to.be.reverted;
    });

    it("enforces maximum supply", async function () {
      const { asset } =
        await deployAsset({
          maxSupply: 1,
        });

      await mintToken(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            2,
            "",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        asset,
        "MaximumSupplyExceeded"
      );
    });

    it("supports unlimited supply when maxSupply is zero", async function () {
      const { asset } =
        await deployAsset({
          maxSupply: 0,
        });

      await mintToken(
        asset,
        1
      );

      await mintToken(
        asset,
        2
      );

      expect(
        await asset.totalMinted()
      ).to.equal(2n);
    });

    it("rejects reuse of an existing tokenId", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        77
      );

      await expect(
        asset
          .connect(minter)
          .mint(
            receiver.address,
            77,
            "",
            ethers.ZeroHash
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenIdAlreadyUsed"
        )
        .withArgs(77);
    });
  });

  describe("Burning and permanent identity", function () {
    it("allows owner to burn when enabled", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      await asset
        .connect(owner)
        .burn(1);

      await expect(
        asset.ownerOf(1)
      ).to.be.reverted;

      expect(
        await asset.tokenExists(1)
      ).to.equal(false);

      expect(
        await asset.tokenEverMinted(1)
      ).to.equal(true);
    });

    it("rejects burn when disabled", async function () {
      const { asset } =
        await deployAsset({
          burnable: false,
        });

      await mintToken(
        asset,
        1
      );

      await expect(
        asset
          .connect(owner)
          .burn(1)
      ).to.be.revertedWithCustomError(
        asset,
        "BurningDisabled"
      );
    });

    it("does not decrease lifetime totalMinted after burn", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      expect(
        await asset.totalMinted()
      ).to.equal(1n);

      await asset
        .connect(owner)
        .burn(1);

      expect(
        await asset.totalMinted()
      ).to.equal(1n);
    });

    it("does not allow a burned tokenId to be minted again", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        42
      );

      await asset
        .connect(owner)
        .burn(42);

      await expect(
        asset
          .connect(minter)
          .mint(
            receiver.address,
            42,
            "ipfs://replacement",
            ethers.ZeroHash
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenIdAlreadyUsed"
        )
        .withArgs(42);
    });

    it("burning does not restore maximum supply capacity", async function () {
      const { asset } =
        await deployAsset({
          maxSupply: 1,
        });

      await mintToken(
        asset,
        1
      );

      await asset
        .connect(owner)
        .burn(1);

      await expect(
        asset
          .connect(minter)
          .mint(
            receiver.address,
            2,
            "",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        asset,
        "MaximumSupplyExceeded"
      );

      expect(
        await asset.totalMinted()
      ).to.equal(1n);
    });

    it("retains historical URI and metadata hash after burn", async function () {
      const { asset } =
        await deployAsset();

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "historical-token"
          )
        );

      await mintToken(
        asset,
        15,
        owner,
        "ipfs://historical-token",
        hash
      );

      await asset
        .connect(owner)
        .burn(15);

      await expect(
        asset.tokenURI(15)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenDoesNotExist"
        )
        .withArgs(15);

      expect(
        await asset.historicalTokenURI(
          15
        )
      ).to.equal(
        "ipfs://historical-token"
      );

      expect(
        await asset.tokenMetadataHash(
          15
        )
      ).to.equal(hash);
    });

    it("allows metadata authority to maintain historical metadata after burn", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        20,
        owner,
        "ipfs://token-20",
        ethers.ZeroHash
      );

      await asset
        .connect(owner)
        .burn(20);

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "token-20-historical"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setTokenMetadata(
          20,
          "ipfs://token-20-historical",
          newHash
        );

      expect(
        await asset.historicalTokenURI(
          20
        )
      ).to.equal(
        "ipfs://token-20-historical"
      );

      expect(
        await asset.tokenMetadataHash(
          20
        )
      ).to.equal(newHash);
    });

    it("rejects historical metadata lookup for tokenId never created", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset.historicalTokenURI(999)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenNeverCreated"
        )
        .withArgs(999);

      await expect(
        asset.tokenMetadataHash(999)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenNeverCreated"
        )
        .withArgs(999);
    });
  });

  describe("Pausing", function () {
    it("pauses and unpauses transfers", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      await asset
        .connect(pauser)
        .pause();

      await expect(
        asset
          .connect(owner)
          .transferFrom(
            owner.address,
            receiver.address,
            1
          )
      ).to.be.reverted;

      await asset
        .connect(pauser)
        .unpause();

      await asset
        .connect(owner)
        .transferFrom(
          owner.address,
          receiver.address,
          1
        );

      expect(
        await asset.ownerOf(1)
      ).to.equal(
        receiver.address
      );
    });

    it("rejects pause when feature is disabled", async function () {
      const { asset } =
        await deployAsset({
          pausable: false,
          pauseAuthority:
            ethers.ZeroAddress,
        });

      await expect(
        asset
          .connect(pauser)
          .pause()
      ).to.be.reverted;
    });
  });

  describe("Metadata", function () {
    it("updates collection metadata", async function () {
      const { asset } =
        await deployAsset();

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "new-collection"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setNumenMetadata(
          "ipfs://new-collection",
          hash
        );

      expect(
        await asset.numenMetadataURI()
      ).to.equal(
        "ipfs://new-collection"
      );

      expect(
        await asset.numenMetadataHash()
      ).to.equal(hash);
    });

    it("updates classification", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(metadataAuthority)
        .setNumenClassification(
          AssetCategory.ARTWORK,
          RepresentationType.DIGITAL_TWIN
        );

      expect(
        await asset.numenAssetCategory()
      ).to.equal(
        BigInt(
          AssetCategory.ARTWORK
        )
      );

      expect(
        await asset.numenRepresentation()
      ).to.equal(
        BigInt(
          RepresentationType.DIGITAL_TWIN
        )
      );
    });

    it("updates token metadata", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "updated-token"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setTokenMetadata(
          1,
          "ipfs://updated-token",
          hash
        );

      expect(
        await asset.tokenURI(1)
      ).to.equal(
        "ipfs://updated-token"
      );

      expect(
        await asset.tokenMetadataHash(
          1
        )
      ).to.equal(hash);
    });

    it("rejects token metadata update for tokenId never created", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(metadataAuthority)
          .setTokenMetadata(
            999,
            "ipfs://never-created",
            ethers.ZeroHash
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenNeverCreated"
        )
        .withArgs(999);
    });

    it("rejects metadata update from unauthorized wallet", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(attacker)
          .setNumenMetadata(
            "ipfs://attack",
            ethers.ZeroHash
          )
      ).to.be.reverted;
    });
  });

  describe("Collection registration", function () {
    it("registers collection as CONTRACT / 0", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(attacker)
          .registerNumenCollection()
      ).to.emit(
        asset,
        "NumenCollectionRegistered"
      );

      const assetId =
        await asset.numenAssetId();

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(
        assetId
      );

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);
    });

    it("stores correct collection registry record", async function () {
      const {
        asset,
        config,
      } = await deployAsset();

      await asset
        .registerNumenCollection();

      const assetId =
        await asset.numenAssetId();

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.assetContract
      ).to.equal(
        asset.target
      );

      expect(
        record.assetClass
      ).to.equal(1n);

      expect(
        record.standard
      ).to.equal(2n);

      expect(
        record.scope
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
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
        admin.address
      );

      expect(
        record.category
      ).to.equal(
        BigInt(
          config.category
        )
      );

      expect(
        record.representation
      ).to.equal(
        BigInt(
          config.representation
        )
      );
    });

    it("rejects duplicate collection registration", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .registerNumenCollection();

      await expect(
        asset
          .registerNumenCollection()
      ).to.be.revertedWithCustomError(
        asset,
        "CollectionAlreadyRegistered"
      );
    });

    it("rejects collection registration without registry", async function () {
      const { asset } =
        await deployAsset({
          registry:
            ethers.ZeroAddress,
        });

      await expect(
        asset
          .registerNumenCollection()
      ).to.be.revertedWithCustomError(
        asset,
        "RegistryNotConfigured"
      );
    });
  });

  describe("Individual NFT registration", function () {
    it("registers NFT as TOKEN / tokenId", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        7,
        owner,
        "ipfs://token-7",
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "token-7"
          )
        )
      );

      await expect(
        asset
          .connect(attacker)
          .registerNumenToken(7)
      ).to.emit(
        asset,
        "NumenTokenRegistered"
      );

      const assetId =
        await asset.numenTokenAssetId(
          7
        );

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          7
        )
      ).to.equal(
        assetId
      );

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.TOKEN,
          7
        )
      ).to.equal(true);
    });

    it("stores token URI and metadata hash in registry record", async function () {
      const { asset } =
        await deployAsset();

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "token-registry-data"
          )
        );

      await mintToken(
        asset,
        10,
        owner,
        "ipfs://token-10",
        hash
      );

      await asset
        .registerNumenToken(10);

      const assetId =
        await asset.numenTokenAssetId(
          10
        );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.scope
      ).to.equal(
        BigInt(
          AssetScope.TOKEN
        )
      );

      expect(
        record.tokenId
      ).to.equal(10n);

      expect(
        record.metadataURI
      ).to.equal(
        "ipfs://token-10"
      );

      expect(
        record.metadataHash
      ).to.equal(hash);
    });

    it("rejects registration of tokenId never created", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .registerNumenToken(999)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenNeverCreated"
        )
        .withArgs(999);
    });

    it("rejects duplicate token registration", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        5
      );

      await asset
        .registerNumenToken(5);

      await expect(
        asset
          .registerNumenToken(5)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenAlreadyRegistered"
        )
        .withArgs(5);
    });

    it("allows a burned historical token to be registered", async function () {
      const { asset } =
        await deployAsset();

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "burned-token"
          )
        );

      await mintToken(
        asset,
        55,
        owner,
        "ipfs://burned-token",
        hash
      );

      await asset
        .connect(owner)
        .burn(55);

      expect(
        await asset.tokenExists(55)
      ).to.equal(false);

      expect(
        await asset.tokenEverMinted(55)
      ).to.equal(true);

      await expect(
        asset
          .connect(attacker)
          .registerNumenToken(55)
      ).to.emit(
        asset,
        "NumenTokenRegistered"
      );

      const assetId =
        await asset.numenTokenAssetId(
          55
        );

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.tokenId
      ).to.equal(55n);

      expect(
        record.metadataURI
      ).to.equal(
        "ipfs://burned-token"
      );

      expect(
        record.metadataHash
      ).to.equal(hash);
    });

    it("retains registered Numen Asset ID after burn", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        66,
        owner,
        "ipfs://token-66",
        ethers.ZeroHash
      );

      await asset
        .registerNumenToken(66);

      const assetIdBefore =
        await asset.numenTokenAssetId(
          66
        );

      await asset
        .connect(owner)
        .burn(66);

      const assetIdAfter =
        await asset.numenTokenAssetId(
          66
        );

      expect(
        assetIdAfter
      ).to.equal(
        assetIdBefore
      );

      expect(
        await asset.isNumenTokenRegistered(
          66
        )
      ).to.equal(true);
    });
  });

  describe("CONTRACT / TOKEN identity separation", function () {
    it("allows collection CONTRACT / 0 and NFT TOKEN / 0 simultaneously", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .registerNumenCollection();

      await mintToken(
        asset,
        0,
        owner,
        "ipfs://token-zero",
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "token-zero"
          )
        )
      );

      await asset
        .registerNumenToken(0);

      const collectionAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        );

      const tokenAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          0
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
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(true);
    });

    it("creates separate registry records for collection and NFT zero", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .registerNumenCollection();

      await mintToken(
        asset,
        0
      );

      await asset
        .registerNumenToken(0);

      const collectionAssetId =
        await asset.numenAssetId();

      const tokenAssetId =
        await asset.numenTokenAssetId(
          0
        );

      const collectionRecord =
        await registry.getAsset(
          collectionAssetId
        );

      const tokenRecord =
        await registry.getAsset(
          tokenAssetId
        );

      expect(
        collectionRecord.scope
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
      );

      expect(
        collectionRecord.tokenId
      ).to.equal(0n);

      expect(
        tokenRecord.scope
      ).to.equal(
        BigInt(
          AssetScope.TOKEN
        )
      );

      expect(
        tokenRecord.tokenId
      ).to.equal(0n);

      expect(
        collectionRecord.assetContract
      ).to.equal(
        tokenRecord.assetContract
      );

      expect(
        collectionRecord.assetId
      ).to.not.equal(
        tokenRecord.assetId
      );
    });
  });

  describe("ERC721 behavior", function () {
    it("transfers normally", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      await asset
        .connect(owner)
        .transferFrom(
          owner.address,
          receiver.address,
          1
        );

      expect(
        await asset.ownerOf(1)
      ).to.equal(
        receiver.address
      );
    });

    it("supports approvals", async function () {
      const { asset } =
        await deployAsset();

      await mintToken(
        asset,
        1
      );

      await asset
        .connect(owner)
        .approve(
          receiver.address,
          1
        );

      expect(
        await asset.getApproved(1)
      ).to.equal(
        receiver.address
      );
    });

    it("supports ERC721 interface", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.supportsInterface(
          "0x80ac58cd"
        )
      ).to.equal(true);
    });

    it("supports ERC165", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.supportsInterface(
          "0x01ffc9a7"
        )
      ).to.equal(true);
    });
  });
});