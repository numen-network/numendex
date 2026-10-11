const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenFungibleFactory", function () {
  let factory;
  let registry;

  let deployer;
  let creator;
  let admin;
  let recipient;
  let minter;
  let pauser;
  let metadataAuthority;
  let attacker;

  const SupplyModel = {
    NOT_APPLICABLE: 0,
    FIXED: 1,
    CAPPED: 2,
    UNCAPPED: 3,
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
      admin,
      recipient,
      minter,
      pauser,
      metadataAuthority,
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
        "NumenFungibleFactory"
      );

    factory =
      await Factory.deploy();

    await factory.waitForDeployment();
  }

  function createConfig(overrides = {}) {
    return {
      name: "Factory Test Asset",
      symbol: "FTA",
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
      objectBindingEnabled: false,

      category:
        AssetCategory.UTILITY,

      representation:
        RepresentationType.DIGITAL_ASSET,

      metadataURI:
        "ipfs://factory-test-asset",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "factory-test-asset"
          )
        ),

      creator:
        creator.address,

      admin:
        admin.address,

      initialRecipient:
        recipient.address,

      mintAuthority:
        ethers.ZeroAddress,

      pauseAuthority:
        ethers.ZeroAddress,

      metadataAuthority:
        metadataAuthority.address,

      registry:
        registry.target,

      ...overrides,
    };
  }

  async function createAsset(
    overrides = {},
    signer = creator
  ) {
    const config =
      createConfig(overrides);

    const tx =
      await factory
        .connect(signer)
        .createFungibleAsset(
          config
        );

    const receipt =
      await tx.wait();

    const event =
      receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(
              log
            );
          } catch {
            return null;
          }
        })
        .find(
          (parsed) =>
            parsed &&
            parsed.name ===
              "FungibleAssetCreated"
        );

    expect(event).to.not.equal(
      undefined
    );

    const assetAddress =
      event.args.asset;

    const assetId =
      event.args.assetId;

    const asset =
      await ethers.getContractAt(
        "NumenFungibleAsset",
        assetAddress
      );

    return {
      config,
      tx,
      receipt,
      event,
      asset,
      assetAddress,
      assetId,
    };
  }

  beforeEach(async function () {
    await deployFixture();
  });

  describe("Deployment", function () {
    it("deploys the factory", async function () {
      expect(
        factory.target
      ).to.not.equal(
        ethers.ZeroAddress
      );
    });

    it("returns the expected factory version", async function () {
      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_FUNGIBLE_FACTORY_V1"
          )
        );

      expect(
        await factory.factoryVersion()
      ).to.equal(expected);
    });
  });

  describe("Asset creation", function () {
    it("creates a Numen fungible asset", async function () {
      const {
        asset,
        assetAddress,
      } =
        await createAsset();

      expect(
        assetAddress
      ).to.not.equal(
        ethers.ZeroAddress
      );

      expect(
        await asset.name()
      ).to.equal(
        "Factory Test Asset"
      );

      expect(
        await asset.symbol()
      ).to.equal(
        "FTA"
      );

      expect(
        await asset.decimals()
      ).to.equal(18n);
    });

    it("emits FungibleAssetCreated", async function () {
      const config =
        createConfig();

      await expect(
        factory
          .connect(creator)
          .createFungibleAsset(
            config
          )
      ).to.emit(
        factory,
        "FungibleAssetCreated"
      );
    });

    it("preserves creator identity", async function () {
      const {
        asset,
      } =
        await createAsset();

      expect(
        await asset.numenCreator()
      ).to.equal(
        creator.address
      );
    });

    it("preserves selected admin", async function () {
      const {
        asset,
      } =
        await createAsset();

      expect(
        await asset.numenAdmin()
      ).to.equal(
        admin.address
      );

      expect(
        await asset
          .initialRegistryController()
      ).to.equal(
        admin.address
      );
    });

    it("mints initial supply to selected recipient", async function () {
      const {
        asset,
        config,
      } =
        await createAsset();

      expect(
        await asset.totalSupply()
      ).to.equal(
        config.initialSupply
      );

      expect(
        await asset.balanceOf(
          recipient.address
        )
      ).to.equal(
        config.initialSupply
      );
    });

    it("preserves metadata and classification", async function () {
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
    });
  });

  describe("Creator protection", function () {
    it("requires config.creator to equal transaction caller", async function () {
      const config =
        createConfig();

      await expect(
        factory
          .connect(attacker)
          .createFungibleAsset(
            config
          )
      )
        .to.be.revertedWithCustomError(
          factory,
          "CreatorMustBeCaller"
        )
        .withArgs(
          creator.address,
          attacker.address
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
          .createFungibleAsset(
            config
          )
      ).to.be.revertedWithCustomError(
        factory,
        "ZeroAddress"
      );
    });

    it("allows another wallet to create its own asset", async function () {
      const config =
        createConfig({
          creator:
            attacker.address,

          admin:
            attacker.address,

          initialRecipient:
            attacker.address,

          metadataAuthority:
            attacker.address,
        });

      await expect(
        factory
          .connect(attacker)
          .createFungibleAsset(
            config
          )
      ).to.emit(
        factory,
        "FungibleAssetCreated"
      );
    });
  });

  describe("Atomic registry registration", function () {
    it("automatically registers the created asset", async function () {
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

      expect(
        await registry.assetExists(
          assetId
        )
      ).to.equal(true);
    });

    it("registers ERC20 with CONTRACT scope and tokenId zero", async function () {
      const {
        asset,
        assetId,
      } =
        await createAsset();

      expect(
        await asset.numenRegistryScope()
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
      );

      const registryAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        );

      expect(
        registryAssetId
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

    it("does not create a TOKEN-scoped identity for ERC20", async function () {
      const {
        asset,
      } =
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
      ).to.equal(0n);

      expect(
        record.standard
      ).to.equal(1n);

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

      expect(
        record.active
      ).to.equal(true);
    });

    it("returns the same Asset ID from factory event, token and registry", async function () {
      const {
        asset,
        assetId,
      } =
        await createAsset();

      const tokenAssetId =
        await asset.numenAssetId();

      const registryAssetId =
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        );

      expect(
        assetId
      ).to.equal(
        tokenAssetId
      );

      expect(
        assetId
      ).to.equal(
        registryAssetId
      );
    });

    it("registers exactly one registry asset per factory creation", async function () {
      expect(
        await registry.totalAssets()
      ).to.equal(0n);

      await createAsset();

      expect(
        await registry.totalAssets()
      ).to.equal(1n);
    });

    it("registers two independently created assets as different identities", async function () {
      const first =
        await createAsset({
          name:
            "Factory Asset One",
          symbol:
            "FA1",
        });

      const second =
        await createAsset({
          name:
            "Factory Asset Two",
          symbol:
            "FA2",
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

      expect(
        await registry.getAssetId(
          first.asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(
        first.assetId
      );

      expect(
        await registry.getAssetId(
          second.asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(
        second.assetId
      );
    });
  });

  describe("Factory without registry", function () {
    it("can create an asset when registry is zero", async function () {
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
        await asset.numenRegistry()
      ).to.equal(
        ethers.ZeroAddress
      );

      expect(
        await asset.isNumenRegistered()
      ).to.equal(false);
    });

    it("does not change registry count when registry is zero", async function () {
      await createAsset({
        registry:
          ethers.ZeroAddress,
      });

      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });
  });

  describe("Authorities", function () {
    it("does not make factory token admin", async function () {
      const {
        asset,
      } =
        await createAsset();

      const adminRole =
        await asset.DEFAULT_ADMIN_ROLE();

      expect(
        await asset.hasRole(
          adminRole,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          adminRole,
          admin.address
        )
      ).to.equal(true);
    });

    it("does not make factory metadata authority", async function () {
      const {
        asset,
      } =
        await createAsset();

      const metadataRole =
        await asset.METADATA_ROLE();

      expect(
        await asset.hasRole(
          metadataRole,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          metadataRole,
          metadataAuthority.address
        )
      ).to.equal(true);
    });

    it("preserves optional mint and pause authorities", async function () {
      const {
        asset,
      } =
        await createAsset({
          supplyModel:
            SupplyModel.CAPPED,

          initialSupply:
            ethers.parseUnits(
              "1000",
              18
            ),

          maxSupply:
            ethers.parseUnits(
              "2000",
              18
            ),

          mintable: true,

          mintAuthority:
            minter.address,

          pausable: true,

          pauseAuthority:
            pauser.address,
        });

      const minterRole =
        await asset.MINTER_ROLE();

      const pauserRole =
        await asset.PAUSER_ROLE();

      expect(
        await asset.hasRole(
          minterRole,
          minter.address
        )
      ).to.equal(true);

      expect(
        await asset.hasRole(
          pauserRole,
          pauser.address
        )
      ).to.equal(true);

      expect(
        await asset.hasRole(
          minterRole,
          factory.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          pauserRole,
          factory.target
        )
      ).to.equal(false);
    });
  });

  describe("Atomicity", function () {
    it("reverts the whole creation if token configuration is invalid", async function () {
      const config =
        createConfig({
          decimals: 19,
        });

      await expect(
        factory
          .connect(creator)
          .createFungibleAsset(
            config
          )
      ).to.be.reverted;

      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });

    it("reverts the whole creation if registration cannot complete", async function () {
      /*
       * An EOA is deliberately supplied as registry.
       *
       * The deployed token attempts registerNumenAsset()
       * during the same factory transaction.
       *
       * Because the registry call cannot successfully return a
       * bytes32 Asset ID, the whole factory transaction must revert,
       * including deployment of the newly-created token.
       */
      const config =
        createConfig({
          registry:
            attacker.address,
        });

      await expect(
        factory
          .connect(creator)
          .createFungibleAsset(
            config
          )
      ).to.be.reverted;

      expect(
        await registry.totalAssets()
      ).to.equal(0n);
    });
  });
});