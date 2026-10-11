const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenERC721Factory", function () {
  let registry;
  let factory;

  let deployer;
  let creator;
  let admin;
  let minter;
  let pauser;
  let metadataAuthority;
  let owner;
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

  async function deployFixture() {
    [
      deployer,
      creator,
      admin,
      minter,
      pauser,
      metadataAuthority,
      owner,
      attacker,
    ] = await ethers.getSigners();

    const Registry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    registry =
      await Registry.deploy();

    await registry.waitForDeployment();

    const Factory =
      await ethers.getContractFactory(
        "NumenERC721Factory"
      );

    factory =
      await Factory.deploy();

    await factory.waitForDeployment();
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

  async function createAsset(
    overrides = {}
  ) {
    const config =
      createConfig(overrides);

    const tx =
      await factory
        .connect(creator)
        .createERC721Asset(
          config
        );

    const receipt =
      await tx.wait();

    let event = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          factory.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "ERC721AssetCreated"
        ) {
          event = parsed;
          break;
        }
      } catch (_) {}
    }

    expect(event).to.not.equal(
      null
    );

    const assetAddress =
      event.args.asset;

    const assetId =
      event.args.assetId;

    const Asset =
      await ethers.getContractFactory(
        "NumenERC721Asset"
      );

    const asset =
      Asset.attach(
        assetAddress
      );

    return {
      asset,
      assetAddress,
      assetId,
      config,
      receipt,
      event,
    };
  }

  beforeEach(async function () {
    await deployFixture();
  });

  describe("Deployment", function () {
    it("deploys factory", async function () {
      expect(
        factory.target
      ).to.not.equal(
        ethers.ZeroAddress
      );
    });

    it("reports correct factory version", async function () {
      expect(
        await factory.factoryVersion()
      ).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ERC721_FACTORY_V1"
          )
        )
      );
    });
  });

  describe("Asset creation", function () {
    it("creates ERC721 collection", async function () {
      const {
        asset,
        config,
      } =
        await createAsset();

      expect(
        await asset.name()
      ).to.equal(
        config.name
      );

      expect(
        await asset.symbol()
      ).to.equal(
        config.symbol
      );
    });

    it("emits ERC721AssetCreated", async function () {
      const config =
        createConfig();

      await expect(
        factory
          .connect(creator)
          .createERC721Asset(
            config
          )
      ).to.emit(
        factory,
        "ERC721AssetCreated"
      );
    });

    it("preserves creator", async function () {
      const { asset } =
        await createAsset();

      expect(
        await asset.numenCreator()
      ).to.equal(
        creator.address
      );
    });

    it("preserves admin", async function () {
      const { asset } =
        await createAsset();

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

    it("preserves classification", async function () {
      const {
        asset,
        config,
      } =
        await createAsset();

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

    it("preserves collection metadata", async function () {
      const {
        asset,
        config,
      } =
        await createAsset();

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

    it("preserves maximum supply", async function () {
      const { asset } =
        await createAsset({
          maxSupply: 250,
        });

      expect(
        await asset.maximumSupply()
      ).to.equal(250n);
    });
  });

  describe("Creator protection", function () {
    it("requires configured creator to equal caller", async function () {
      const config =
        createConfig({
          creator:
            attacker.address,
        });

      await expect(
        factory
          .connect(creator)
          .createERC721Asset(
            config
          )
      )
        .to.be.revertedWithCustomError(
          factory,
          "CreatorMustBeCaller"
        )
        .withArgs(
          attacker.address,
          creator.address
        );
    });

    it("rejects zero creator", async function () {
      const config =
        createConfig({
          creator:
            ethers.ZeroAddress,
        });

      await expect(
        factory
          .connect(creator)
          .createERC721Asset(
            config
          )
      ).to.be.revertedWithCustomError(
        factory,
        "ZeroAddress"
      );
    });

    it("allows another wallet to create its own collection", async function () {
      const config =
        createConfig({
          creator:
            attacker.address,
        });

      const tx =
        await factory
          .connect(attacker)
          .createERC721Asset(
            config
          );

      const receipt =
        await tx.wait();

      let assetAddress =
        ethers.ZeroAddress;

      for (
        const log of
        receipt.logs
      ) {
        try {
          const parsed =
            factory.interface.parseLog(
              log
            );

          if (
            parsed &&
            parsed.name ===
              "ERC721AssetCreated"
          ) {
            assetAddress =
              parsed.args.asset;

            break;
          }
        } catch (_) {}
      }

      expect(
        assetAddress
      ).to.not.equal(
        ethers.ZeroAddress
      );

      const asset =
        await ethers.getContractAt(
          "NumenERC721Asset",
          assetAddress
        );

      expect(
        await asset.numenCreator()
      ).to.equal(
        attacker.address
      );
    });
  });

  describe("Atomic registry registration", function () {
    it("automatically registers collection", async function () {
      const {
        asset,
        assetId,
      } =
        await createAsset();

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.numenAssetId()
      ).to.equal(
        assetId
      );

      expect(
        await asset.isNumenRegistered()
      ).to.equal(true);
    });

    it("registers collection as CONTRACT / 0", async function () {
      const {
        asset,
        assetId,
      } =
        await createAsset();

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

    it("does not create TOKEN / 0 record automatically", async function () {
      const { asset } =
        await createAsset();

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(false);

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(
        ethers.ZeroHash
      );
    });

    it("stores correct registry record", async function () {
      const {
        asset,
        assetId,
        config,
      } =
        await createAsset();

      const record =
        await registry.getAsset(
          assetId
        );

      expect(
        record.assetId
      ).to.equal(
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

      expect(
        record.metadataURI
      ).to.equal(
        config.metadataURI
      );

      expect(
        record.metadataHash
      ).to.equal(
        config.metadataHash
      );
    });

    it("uses same Asset ID in event, collection and registry", async function () {
      const {
        asset,
        assetId,
        event,
      } =
        await createAsset();

      const registryAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        );

      expect(
        event.args.assetId
      ).to.equal(
        assetId
      );

      expect(
        await asset.numenAssetId()
      ).to.equal(
        assetId
      );

      expect(
        registryAssetId
      ).to.equal(
        assetId
      );
    });

    it("creates exactly one registry record per collection", async function () {
      expect(
        await registry.totalAssets()
      ).to.equal(0n);

      await createAsset();

      expect(
        await registry.totalAssets()
      ).to.equal(1n);
    });

    it("creates unique contracts and Asset IDs", async function () {
      const first =
        await createAsset({
          name:
            "Collection One",
          symbol: "ONE",
        });

      const second =
        await createAsset({
          name:
            "Collection Two",
          symbol: "TWO",
        });

      expect(
        first.asset.target
      ).to.not.equal(
        second.asset.target
      );

      expect(
        first.assetId
      ).to.not.equal(
        second.assetId
      );

      expect(
        await registry.totalAssets()
      ).to.equal(2n);
    });
  });

  describe("Individual NFT registration after factory creation", function () {
    it("allows token registration as TOKEN / tokenId", async function () {
      const { asset } =
        await createAsset();

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "factory-token-7"
          )
        );

      await asset
        .connect(minter)
        .mint(
          owner.address,
          7,
          "ipfs://factory-token-7",
          hash
        );

      await asset
        .registerNumenToken(7);

      const tokenAssetId =
        await asset.numenTokenAssetId(
          7
        );

      expect(
        tokenAssetId
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
        tokenAssetId
      );
    });

    it("keeps collection and token zero separate", async function () {
      const {
        asset,
        assetId:
          collectionAssetId,
      } =
        await createAsset();

      await asset
        .connect(minter)
        .mint(
          owner.address,
          0,
          "ipfs://token-zero",
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "token-zero"
            )
          )
        );

      await asset
        .registerNumenToken(0);

      const tokenAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          0
        );

      expect(
        tokenAssetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        tokenAssetId
      ).to.not.equal(
        collectionAssetId
      );

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(
        collectionAssetId
      );
    });
  });

  describe("Factory without Registry", function () {
    it("creates standalone collection when registry is zero", async function () {
      const {
        asset,
        assetId,
      } =
        await createAsset({
          registry:
            ethers.ZeroAddress,
        });

      expect(
        asset.target
      ).to.not.equal(
        ethers.ZeroAddress
      );

      expect(
        assetId
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.numenAssetId()
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.isNumenRegistered()
      ).to.equal(false);
    });

    it("does not create Registry record when registry is zero", async function () {
      expect(
        await registry.totalAssets()
      ).to.equal(0n);

      await createAsset({
        registry:
          ethers.ZeroAddress,
      });

      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });
  });

  describe("Authority isolation", function () {
    it("factory is not collection admin", async function () {
      const { asset } =
        await createAsset();

      const role =
        await asset.DEFAULT_ADMIN_ROLE();

      expect(
        await asset.hasRole(
          role,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          role,
          admin.address
        )
      ).to.equal(true);
    });

    it("factory is not minter", async function () {
      const { asset } =
        await createAsset();

      const role =
        await asset.MINTER_ROLE();

      expect(
        await asset.hasRole(
          role,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          role,
          minter.address
        )
      ).to.equal(true);
    });

    it("factory is not pauser", async function () {
      const { asset } =
        await createAsset();

      const role =
        await asset.PAUSER_ROLE();

      expect(
        await asset.hasRole(
          role,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          role,
          pauser.address
        )
      ).to.equal(true);
    });

    it("factory is not metadata authority", async function () {
      const { asset } =
        await createAsset();

      const role =
        await asset.METADATA_ROLE();

      expect(
        await asset.hasRole(
          role,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          role,
          metadataAuthority.address
        )
      ).to.equal(true);
    });
  });

  describe("Feature preservation", function () {
    it("preserves mintable configuration", async function () {
      const { asset } =
        await createAsset({
          mintable: false,
          mintAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.numenMintable()
      ).to.equal(false);

      const role =
        await asset.MINTER_ROLE();

      expect(
        await asset.hasRole(
          role,
          minter.address
        )
      ).to.equal(false);
    });

    it("preserves pausable configuration", async function () {
      const { asset } =
        await createAsset({
          pausable: false,
          pauseAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.numenPausable()
      ).to.equal(false);

      const role =
        await asset.PAUSER_ROLE();

      expect(
        await asset.hasRole(
          role,
          pauser.address
        )
      ).to.equal(false);
    });

    it("preserves burnable configuration", async function () {
      const { asset } =
        await createAsset({
          burnable: false,
        });

      expect(
        await asset.numenBurnable()
      ).to.equal(false);
    });

    it("preserves object binding configuration", async function () {
      const { asset } =
        await createAsset({
          objectBindingEnabled:
            false,
        });

      expect(
        await asset.numenObjectBindingEnabled()
      ).to.equal(false);
    });
  });

  describe("Atomicity", function () {
    it("reverts whole creation when registry registration fails", async function () {
      const config =
        createConfig({
          registry:
            attacker.address,
        });

      expect(
        await registry.totalAssets()
      ).to.equal(0n);

      await expect(
        factory
          .connect(creator)
          .createERC721Asset(
            config
          )
      ).to.be.reverted;

      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });
  });
});