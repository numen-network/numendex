const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenFungibleAsset", function () {
  let deployer;
  let creator;
  let admin;
  let recipient;
  let minter;
  let pauser;
  let metadataAuthority;
  let user;
  let spender;
  let attacker;

  let registry;

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

  async function getSigners() {
    [
      deployer,
      creator,
      admin,
      recipient,
      minter,
      pauser,
      metadataAuthority,
      user,
      spender,
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
      name: "Numen Test Asset",
      symbol: "NTA",
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
        "ipfs://numen-test-asset",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "numen-test-asset"
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
        registry
          ? registry.target
          : ethers.ZeroAddress,

      ...overrides,
    };
  }

  async function deployAsset(
    overrides = {}
  ) {
    const Asset =
      await ethers.getContractFactory(
        "NumenFungibleAsset"
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

  beforeEach(async function () {
    await getSigners();
    await deployRegistry();
  });

  describe("Deployment", function () {
    it("deploys with correct ERC20 identity", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.name()
      ).to.equal(
        "Numen Test Asset"
      );

      expect(
        await asset.symbol()
      ).to.equal("NTA");

      expect(
        await asset.decimals()
      ).to.equal(18n);
    });

    it("mints initial supply to selected recipient", async function () {
      const { asset, config } =
        await deployAsset();

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

    it("stores Numen identity information", async function () {
      const { asset, config } =
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
        await asset.numenAssetClass()
      ).to.equal(0n);

      expect(
        await asset.numenAssetStandard()
      ).to.equal(1n);

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

    it("stores metadata", async function () {
      const { asset, config } =
        await deployAsset();

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

    it("starts without an assigned Numen Asset ID", async function () {
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

    it("stores configured registry", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenRegistry()
      ).to.equal(
        registry.target
      );
    });

    it("uses initial admin as initial registry controller", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.initialRegistryController()
      ).to.equal(
        admin.address
      );
    });

    it("reports CONTRACT as registry scope", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenRegistryScope()
      ).to.equal(
        BigInt(
          AssetScope.CONTRACT
        )
      );
    });

    it("reports feature configuration", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.numenMintable()
      ).to.equal(false);

      expect(
        await asset.numenBurnable()
      ).to.equal(true);

      expect(
        await asset.numenPausable()
      ).to.equal(false);

      expect(
        await asset.numenPermitEnabled()
      ).to.equal(true);

      expect(
        await asset.numenVotesEnabled()
      ).to.equal(true);

      expect(
        await asset
          .numenObjectBindingEnabled()
      ).to.equal(false);
    });
  });

  describe("Supply configuration", function () {
    it("rejects decimals above 18", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          decimals: 19,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidDecimals"
      );
    });

    it("rejects NOT_APPLICABLE supply model", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          supplyModel:
            SupplyModel.NOT_APPLICABLE,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidSupplyConfiguration"
      );
    });

    it("rejects mintable fixed supply", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          mintable: true,
          mintAuthority:
            minter.address,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidSupplyConfiguration"
      );
    });

    it("rejects fixed supply when max supply differs from initial supply", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          maxSupply:
            ethers.parseUnits(
              "2000000",
              18
            ),
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidSupplyConfiguration"
      );
    });

    it("rejects capped supply when initial supply exceeds cap", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          supplyModel:
            SupplyModel.CAPPED,

          initialSupply:
            ethers.parseUnits(
              "2000",
              18
            ),

          maxSupply:
            ethers.parseUnits(
              "1000",
              18
            ),

          mintable: true,

          mintAuthority:
            minter.address,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InitialSupplyExceedsMaximum"
      );
    });

    it("rejects capped supply with zero maximum", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          supplyModel:
            SupplyModel.CAPPED,

          initialSupply: 0n,
          maxSupply: 0n,

          mintable: true,

          mintAuthority:
            minter.address,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidSupplyConfiguration"
      );
    });

    it("rejects uncapped supply with non-zero max supply", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          supplyModel:
            SupplyModel.UNCAPPED,

          maxSupply: 1n,

          mintable: true,

          mintAuthority:
            minter.address,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "InvalidSupplyConfiguration"
      );
    });

    it("accepts uncapped supply with zero maximum", async function () {
      const { asset } =
        await deployAsset({
          supplyModel:
            SupplyModel.UNCAPPED,

          initialSupply:
            ethers.parseUnits(
              "1000",
              18
            ),

          maxSupply: 0n,

          mintable: true,

          mintAuthority:
            minter.address,
        });

      expect(
        await asset.maximumSupply()
      ).to.equal(0n);

      expect(
        await asset.supplyModel()
      ).to.equal(
        BigInt(
          SupplyModel.UNCAPPED
        )
      );
    });
  });

  describe("Authorities", function () {
    it("rejects zero creator", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          creator:
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });

    it("rejects zero admin", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          admin:
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });

    it("rejects zero initial recipient", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          initialRecipient:
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });

    it("rejects zero mint authority when minting enabled", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
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
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });

    it("rejects zero pause authority when pausing enabled", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          pausable: true,

          pauseAuthority:
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });

    it("rejects zero metadata authority", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenFungibleAsset"
        );

      const config =
        createConfig({
          metadataAuthority:
            ethers.ZeroAddress,
        });

      await expect(
        Asset.deploy(config)
      ).to.be.revertedWithCustomError(
        Asset,
        "ZeroAddress"
      );
    });
  });

  describe("Minting", function () {
    it("allows authorized minting for capped asset", async function () {
      const initial =
        ethers.parseUnits(
          "1000",
          18
        );

      const maximum =
        ethers.parseUnits(
          "2000",
          18
        );

      const { asset } =
        await deployAsset({
          supplyModel:
            SupplyModel.CAPPED,

          initialSupply:
            initial,

          maxSupply:
            maximum,

          mintable: true,

          mintAuthority:
            minter.address,
        });

      const amount =
        ethers.parseUnits(
          "500",
          18
        );

      await asset
        .connect(minter)
        .mint(
          user.address,
          amount
        );

      expect(
        await asset.balanceOf(
          user.address
        )
      ).to.equal(amount);

      expect(
        await asset.totalSupply()
      ).to.equal(
        initial + amount
      );
    });

    it("allows authorized minting for uncapped asset", async function () {
      const { asset } =
        await deployAsset({
          supplyModel:
            SupplyModel.UNCAPPED,

          initialSupply:
            ethers.parseUnits(
              "1000",
              18
            ),

          maxSupply: 0n,

          mintable: true,

          mintAuthority:
            minter.address,
        });

      const amount =
        ethers.parseUnits(
          "5000",
          18
        );

      await asset
        .connect(minter)
        .mint(
          user.address,
          amount
        );

      expect(
        await asset.balanceOf(
          user.address
        )
      ).to.equal(amount);
    });

    it("rejects unauthorized minting", async function () {
      const { asset } =
        await deployAsset({
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
        });

      await expect(
        asset
          .connect(user)
          .mint(
            user.address,
            1n
          )
      ).to.be.reverted;
    });

    it("enforces maximum supply", async function () {
      const { asset } =
        await deployAsset({
          supplyModel:
            SupplyModel.CAPPED,

          initialSupply:
            ethers.parseUnits(
              "1000",
              18
            ),

          maxSupply:
            ethers.parseUnits(
              "1100",
              18
            ),

          mintable: true,

          mintAuthority:
            minter.address,
        });

      await expect(
        asset
          .connect(minter)
          .mint(
            user.address,
            ethers.parseUnits(
              "101",
              18
            )
          )
      ).to.be.revertedWithCustomError(
        asset,
        "MaximumSupplyExceeded"
      );
    });
  });

  describe("Burning", function () {
    it("allows holder to burn tokens when enabled", async function () {
      const { asset } =
        await deployAsset();

      const amount =
        ethers.parseUnits(
          "100",
          18
        );

      const before =
        await asset.totalSupply();

      await asset
        .connect(recipient)
        .burn(amount);

      expect(
        await asset.totalSupply()
      ).to.equal(
        before - amount
      );
    });

    it("rejects burning when disabled", async function () {
      const { asset } =
        await deployAsset({
          burnable: false,
        });

      await expect(
        asset
          .connect(recipient)
          .burn(1n)
      ).to.be.revertedWithCustomError(
        asset,
        "BurningDisabled"
      );
    });

    it("supports burnFrom with allowance", async function () {
      const { asset } =
        await deployAsset();

      const amount =
        ethers.parseUnits(
          "25",
          18
        );

      await asset
        .connect(recipient)
        .approve(
          spender.address,
          amount
        );

      await asset
        .connect(spender)
        .burnFrom(
          recipient.address,
          amount
        );

      expect(
        await asset.allowance(
          recipient.address,
          spender.address
        )
      ).to.equal(0n);
    });
  });

  describe("Pausing", function () {
    async function deployPausableAsset() {
      return deployAsset({
        pausable: true,

        pauseAuthority:
          pauser.address,
      });
    }

    it("allows pause authority to pause and unpause", async function () {
      const { asset } =
        await deployPausableAsset();

      await asset
        .connect(pauser)
        .pause();

      expect(
        await asset.paused()
      ).to.equal(true);

      await asset
        .connect(pauser)
        .unpause();

      expect(
        await asset.paused()
      ).to.equal(false);
    });

    it("rejects unauthorized pausing", async function () {
      const { asset } =
        await deployPausableAsset();

      await expect(
        asset
          .connect(user)
          .pause()
      ).to.be.reverted;
    });

    it("blocks transfers while paused", async function () {
      const { asset } =
        await deployPausableAsset();

      await asset
        .connect(pauser)
        .pause();

      await expect(
        asset
          .connect(recipient)
          .transfer(
            user.address,
            1n
          )
      ).to.be.reverted;
    });

    it("allows transfers after unpause", async function () {
      const { asset } =
        await deployPausableAsset();

      await asset
        .connect(pauser)
        .pause();

      await asset
        .connect(pauser)
        .unpause();

      await expect(
        asset
          .connect(recipient)
          .transfer(
            user.address,
            1n
          )
      ).to.not.be.reverted;
    });
  });

  describe("Metadata and classification", function () {
    it("allows metadata authority to update metadata", async function () {
      const { asset } =
        await deployAsset();

      const newURI =
        "ipfs://updated-asset";

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "updated-asset"
          )
        );

      await expect(
        asset
          .connect(metadataAuthority)
          .setNumenMetadata(
            newURI,
            newHash
          )
      )
        .to.emit(
          asset,
          "NumenMetadataUpdated"
        )
        .withArgs(
          newURI,
          newHash,
          metadataAuthority.address
        );

      expect(
        await asset.numenMetadataURI()
      ).to.equal(newURI);

      expect(
        await asset.numenMetadataHash()
      ).to.equal(newHash);
    });

    it("rejects unauthorized metadata update", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(user)
          .setNumenMetadata(
            "ipfs://unauthorized",
            ethers.ZeroHash
          )
      ).to.be.reverted;
    });

    it("allows classification updates", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(metadataAuthority)
        .setNumenClassification(
          AssetCategory.COMMODITY,
          RepresentationType
            .FRACTIONAL_INTEREST
        );

      expect(
        await asset
          .numenAssetCategory()
      ).to.equal(
        BigInt(
          AssetCategory.COMMODITY
        )
      );

      expect(
        await asset
          .numenRepresentation()
      ).to.equal(
        BigInt(
          RepresentationType
            .FRACTIONAL_INTEREST
        )
      );
    });

    it("rejects unauthorized classification update", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(user)
          .setNumenClassification(
            AssetCategory.COMMODITY,
            RepresentationType
              .FRACTIONAL_INTEREST
          )
      ).to.be.reverted;
    });
  });

  describe("Canonical self-registration", function () {
    it("self-registers in the real NumenAssetRegistry", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset.registerNumenAsset()
      ).to.emit(
        asset,
        "NumenAssetRegistered"
      );

      const assetId =
        await asset.numenAssetId();

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.isNumenRegistered()
      ).to.equal(true);

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
    });

    it("stores the same Asset ID in asset and scoped registry identity", async function () {
      const { asset } =
        await deployAsset();

      await asset.registerNumenAsset();

      const assetIdFromToken =
        await asset.numenAssetId();

      const assetIdFromRegistry =
        await registry.getAssetId(
          asset.target,
          AssetScope.CONTRACT,
          0
        );

      expect(
        assetIdFromToken
      ).to.equal(
        assetIdFromRegistry
      );
    });

    it("registers correct canonical asset data and scope", async function () {
      const { asset, config } =
        await deployAsset();

      await asset.registerNumenAsset();

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
        record.assetClass
      ).to.equal(0n);

      expect(
        record.standard
      ).to.equal(1n);

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

    it("allows any account to trigger safe self-registration", async function () {
      const { asset } =
        await deployAsset();

      const tx =
        await asset
          .connect(attacker)
          .registerNumenAsset();

      const receipt =
        await tx.wait();

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

      const registrationEvent =
        receipt.logs
          .map((log) => {
            try {
              return asset.interface.parseLog(
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
                "NumenAssetRegistered"
          );

      expect(
        registrationEvent
      ).to.not.equal(
        undefined
      );

      expect(
        registrationEvent.args.assetId
      ).to.equal(
        assetId
      );

      expect(
        registrationEvent.args.registry
      ).to.equal(
        registry.target
      );

      expect(
        registrationEvent.args.triggeredBy
      ).to.equal(
        attacker.address
      );
    });

    it("does not let trigger caller become creator or controller", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(attacker)
        .registerNumenAsset();

      const assetId =
        await asset.numenAssetId();

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
        record.controller
      ).to.equal(
        admin.address
      );

      expect(
        record.creator
      ).to.not.equal(
        attacker.address
      );

      expect(
        record.controller
      ).to.not.equal(
        attacker.address
      );
    });

    it("uses metadata state controlled by the asset at registration time", async function () {
      const { asset } =
        await deployAsset();

      const newURI =
        "ipfs://metadata-before-registration";

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "metadata-before-registration"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setNumenMetadata(
          newURI,
          newHash
        );

      await asset
        .connect(attacker)
        .registerNumenAsset();

      const assetId =
        await asset.numenAssetId();

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

    it("uses classification state controlled by the asset at registration time", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(metadataAuthority)
        .setNumenClassification(
          AssetCategory.COMMODITY,
          RepresentationType
            .FRACTIONAL_INTEREST
        );

      await asset
        .connect(attacker)
        .registerNumenAsset();

      const assetId =
        await asset.numenAssetId();

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

    it("rejects a second registration attempt", async function () {
      const { asset } =
        await deployAsset();

      await asset.registerNumenAsset();

      await expect(
        asset.registerNumenAsset()
      ).to.be.revertedWithCustomError(
        asset,
        "AssetAlreadyRegistered"
      );

      expect(
        await registry.totalAssets()
      ).to.equal(1n);
    });

    it("rejects registration when registry is not configured", async function () {
      const { asset } =
        await deployAsset({
          registry:
            ethers.ZeroAddress,
        });

      expect(
        await asset.numenRegistry()
      ).to.equal(
        ethers.ZeroAddress
      );

      await expect(
        asset.registerNumenAsset()
      ).to.be.revertedWithCustomError(
        asset,
        "RegistryNotConfigured"
      );
    });

    it("does not grant token roles to registry", async function () {
      const { asset } =
        await deployAsset({
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

      const adminRole =
        await asset.DEFAULT_ADMIN_ROLE();

      const minterRole =
        await asset.MINTER_ROLE();

      const pauserRole =
        await asset.PAUSER_ROLE();

      const metadataRole =
        await asset.METADATA_ROLE();

      expect(
        await asset.hasRole(
          adminRole,
          registry.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          minterRole,
          registry.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          pauserRole,
          registry.target
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          metadataRole,
          registry.target
        )
      ).to.equal(false);
    });

    it("prevents external wallets from directly registering the token contract", async function () {
      const { asset, config } =
        await deployAsset();

      const request = {
        assetClass: 0,
        standard: 1,
        scope:
          AssetScope.CONTRACT,

        category:
          config.category,

        representation:
          config.representation,

        assetContract:
          asset.target,

        tokenId: 0,

        creator:
          attacker.address,

        controller:
          attacker.address,

        metadataURI:
          "ipfs://malicious",

        metadataHash:
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "malicious"
            )
          ),
      };

      await expect(
        registry
          .connect(attacker)
          .registerAsset(request)
      )
        .to.be.revertedWithCustomError(
          registry,
          "UnauthorizedAssetRegistration"
        )
        .withArgs(
          attacker.address,
          asset.target
        );

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(false);

      await asset.registerNumenAsset();

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.CONTRACT,
          0
        )
      ).to.equal(true);
    });

    it("cannot register ERC20 as TOKEN scoped identity", async function () {
      const { asset } =
        await deployAsset();

      await asset.registerNumenAsset();

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
      ).to.equal(false);
    });
  });

  describe("Descriptor", function () {
    it("returns the complete Numen descriptor before registration", async function () {
      const { asset, config } =
        await deployAsset();

      const descriptor =
        await asset
          .numenAssetDescriptor();

      expect(
        descriptor.assetId
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        descriptor.creator
      ).to.equal(
        creator.address
      );

      expect(
        descriptor.admin
      ).to.equal(
        admin.address
      );

      expect(
        descriptor.assetClass
      ).to.equal(0n);

      expect(
        descriptor.standard
      ).to.equal(1n);

      expect(
        descriptor.category
      ).to.equal(
        BigInt(
          config.category
        )
      );

      expect(
        descriptor.representation
      ).to.equal(
        BigInt(
          config.representation
        )
      );

      expect(
        descriptor.metadataURI
      ).to.equal(
        config.metadataURI
      );

      expect(
        descriptor.metadataHash
      ).to.equal(
        config.metadataHash
      );

      expect(
        descriptor
          .objectBindingEnabled
      ).to.equal(false);
    });

    it("returns registered Asset ID in descriptor after registration", async function () {
      const { asset } =
        await deployAsset();

      await asset.registerNumenAsset();

      const assetId =
        await asset.numenAssetId();

      const descriptor =
        await asset
          .numenAssetDescriptor();

      expect(
        descriptor.assetId
      ).to.equal(assetId);
    });
  });

  describe("ERC20 behavior", function () {
    it("supports standard transfers", async function () {
      const { asset } =
        await deployAsset();

      const amount =
        ethers.parseUnits(
          "50",
          18
        );

      await asset
        .connect(recipient)
        .transfer(
          user.address,
          amount
        );

      expect(
        await asset.balanceOf(
          user.address
        )
      ).to.equal(amount);
    });

    it("supports approve and transferFrom", async function () {
      const { asset } =
        await deployAsset();

      const amount =
        ethers.parseUnits(
          "50",
          18
        );

      await asset
        .connect(recipient)
        .approve(
          spender.address,
          amount
        );

      await asset
        .connect(spender)
        .transferFrom(
          recipient.address,
          user.address,
          amount
        );

      expect(
        await asset.balanceOf(
          user.address
        )
      ).to.equal(amount);
    });
  });

  describe("Capability restrictions", function () {
    it("rejects permit when permit feature is disabled", async function () {
      const { asset } =
        await deployAsset({
          permitEnabled: false,
        });

      await expect(
        asset.permit(
          recipient.address,
          spender.address,
          1n,
          0n,
          27,
          ethers.ZeroHash,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(
        asset,
        "PermitDisabled"
      );
    });

    it("rejects delegation when votes feature is disabled", async function () {
      const { asset } =
        await deployAsset({
          votesEnabled: false,
        });

      await expect(
        asset
          .connect(recipient)
          .delegate(
            user.address
          )
      ).to.be.revertedWithCustomError(
        asset,
        "VotesDisabled"
      );
    });
  });
});