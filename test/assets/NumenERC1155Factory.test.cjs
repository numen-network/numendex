const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenERC1155Factory", function () {
  let registry;
  let factory;

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

  beforeEach(async function () {
    [
      ,
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
        "NumenERC1155Factory"
      );

    factory =
      await Factory.deploy();

    await factory.waitForDeployment();
  });

  function createConfig(overrides = {}) {
    return {
      baseURI:
        "ipfs://numen-erc1155/{id}.json",

      mintable: true,
      burnable: true,
      pausable: true,
      objectBindingEnabled: true,

      category:
        AssetCategory.COLLECTIBLE,

      representation:
        RepresentationType.DIGITAL_ASSET,

      metadataURI:
        "ipfs://numen-erc1155-collection",

      metadataHash:
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "numen-erc1155-collection"
          )
        ),

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
    overrides = {},
    signer = creator
  ) {
    const config =
      createConfig(overrides);

    const tx =
      await factory
        .connect(signer)
        .createERC1155Asset(config);

    const receipt =
      await tx.wait();

    let createdEvent = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          factory.interface.parseLog(log);

        if (
          parsed &&
          parsed.name ===
            "ERC1155AssetCreated"
        ) {
          createdEvent = parsed;
          break;
        }
      } catch (_) {}
    }

    expect(
      createdEvent
    ).to.not.equal(null);

    const assetAddress =
      createdEvent.args.asset;

    const assetId =
      createdEvent.args.assetId;

    const asset =
      await ethers.getContractAt(
        "NumenERC1155Asset",
        assetAddress
      );

    return {
      asset,
      assetAddress,
      assetId,
      config,
      receipt,
      createdEvent,
    };
  }

  describe("Deployment", function () {
    it("deploys the factory", async function () {
      expect(
        factory.target
      ).to.not.equal(
        ethers.ZeroAddress
      );
    });

    it("reports expected factory version", async function () {
      expect(
        await factory.factoryVersion()
      ).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ERC1155_FACTORY_V1"
          )
        )
      );
    });
  });

  describe("Asset creation", function () {
    it("creates ERC1155 V2 asset", async function () {
      const {
        asset,
        assetAddress,
      } = await createAsset();

      expect(
        assetAddress
      ).to.not.equal(
        ethers.ZeroAddress
      );

      expect(
        await asset.creator()
      ).to.equal(
        creator.address
      );

      expect(
        await asset.initialAdmin()
      ).to.equal(
        admin.address
      );

      expect(
        await asset.registryController()
      ).to.equal(
        admin.address
      );

      expect(
        await asset.assetVersion()
      ).to.equal(
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ERC1155_ASSET_V2"
          )
        )
      );
    });

    it("emits ERC1155AssetCreated", async function () {
      const config =
        createConfig();

      await expect(
        factory
          .connect(creator)
          .createERC1155Asset(config)
      ).to.emit(
        factory,
        "ERC1155AssetCreated"
      );
    });

    it("preserves classification", async function () {
      const {
        asset,
        config,
      } = await createAsset({
        category:
          AssetCategory.PRODUCT,

        representation:
          RepresentationType
            .DIGITAL_TWIN,
      });

      expect(
        await asset.category()
      ).to.equal(
        BigInt(config.category)
      );

      expect(
        await asset.representation()
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
      } = await createAsset();

      const metadata =
        await asset.collectionMetadata();

      expect(
        metadata[0]
      ).to.equal(
        config.metadataURI
      );

      expect(
        metadata[1]
      ).to.equal(
        config.metadataHash
      );

      expect(
        await asset.baseURI()
      ).to.equal(
        config.baseURI
      );
    });

    it("preserves feature configuration", async function () {
      const { asset } =
        await createAsset({
          mintable: true,
          burnable: false,
          pausable: true,
          objectBindingEnabled: false,
        });

      const features =
        await asset.features();

      expect(
        features[0]
      ).to.equal(true);

      expect(
        features[1]
      ).to.equal(false);

      expect(
        features[2]
      ).to.equal(true);

      expect(
        features[3]
      ).to.equal(false);
    });

    it("creates ERC1155-compatible collection", async function () {
      const { asset } =
        await createAsset();

      expect(
        await asset.supportsInterface(
          "0xd9b67a26"
        )
      ).to.equal(true);

      expect(
        await asset.supportsInterface(
          "0x01ffc9a7"
        )
      ).to.equal(true);
    });
  });

  describe("Creator protection", function () {
    it("requires creator to be caller", async function () {
      const config =
        createConfig();

      await expect(
        factory
          .connect(attacker)
          .createERC1155Asset(config)
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
          .createERC1155Asset(config)
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

          admin:
            attacker.address,

          mintAuthority:
            attacker.address,

          pauseAuthority:
            attacker.address,

          metadataAuthority:
            attacker.address,
        });

      const tx =
        await factory
          .connect(attacker)
          .createERC1155Asset(config);

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
              "ERC1155AssetCreated"
          ) {
            event = parsed;
            break;
          }
        } catch (_) {}
      }

      expect(event).to.not.equal(null);

      const asset =
        await ethers.getContractAt(
          "NumenERC1155Asset",
          event.args.asset
        );

      expect(
        await asset.creator()
      ).to.equal(
        attacker.address
      );

      expect(
        await asset.initialAdmin()
      ).to.equal(
        attacker.address
      );
    });
  });

  describe("Atomic Registry registration", function () {
    it("automatically registers collection as CONTRACT / 0", async function () {
      const {
        asset,
        assetId,
      } = await createAsset();

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.collectionAssetId()
      ).to.equal(
        assetId
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

    it("does not automatically register TOKEN / 0", async function () {
      const {
        asset,
        assetId,
      } = await createAsset();

      expect(
        assetId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await registry.isRegisteredAsset(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(false);
    });

    it("stores complete collection Registry record", async function () {
      const {
        asset,
        assetId,
        config,
      } = await createAsset({
        category:
          AssetCategory.PRODUCT,

        representation:
          RepresentationType
            .PHYSICAL_REFERENCE,
      });

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
      ).to.equal(3n);

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

    it("returns same collection Asset ID through event, asset and registry", async function () {
      const {
        asset,
        assetId,
        createdEvent,
      } = await createAsset();

      expect(
        createdEvent.args.assetId
      ).to.equal(
        assetId
      );

      expect(
        await asset.collectionAssetId()
      ).to.equal(
        assetId
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
    });

    it("creates unique Registry record for every collection", async function () {
      const first =
        await createAsset();

      const second =
        await createAsset();

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

  describe("Individual token registration", function () {
    it("creates and registers ERC1155 token type after factory deployment", async function () {
      const { asset } =
        await createAsset();

      const tokenId = 7;
      const amount = 100;
      const maxSupply = 1000;

      const metadataURI =
        "ipfs://edition-seven.json";

      const metadataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "edition-seven"
          )
        );

      await asset
        .connect(minter)
        .createTokenType(
          owner.address,
          tokenId,
          amount,
          maxSupply,
          metadataURI,
          metadataHash,
          "0x"
        );

      expect(
        await asset.tokenTypeExists(
          tokenId
        )
      ).to.equal(true);

      expect(
        await asset.tokenTotalMinted(
          tokenId
        )
      ).to.equal(
        BigInt(amount)
      );

      await asset
        .registerNumenToken(
          tokenId
        );

      const tokenAssetId =
        await asset.tokenAssetIds(
          tokenId
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
          tokenId
        )
      ).to.equal(
        tokenAssetId
      );

      const record =
        await registry.getAsset(
          tokenAssetId
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
      ).to.equal(
        BigInt(tokenId)
      );

      expect(
        record.metadataURI
      ).to.equal(
        metadataURI
      );

      expect(
        record.metadataHash
      ).to.equal(
        metadataHash
      );
    });

    it("keeps CONTRACT / 0 and TOKEN / 0 separate", async function () {
      const {
        asset,
        assetId:
          collectionAssetId,
      } = await createAsset();

      const metadataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "edition-zero"
          )
        );

      await asset
        .connect(minter)
        .createTokenType(
          owner.address,
          0,
          100,
          1000,
          "ipfs://edition-zero.json",
          metadataHash,
          "0x"
        );

      await asset
        .registerNumenToken(0);

      const tokenAssetId =
        await asset.tokenAssetIds(0);

      expect(
        collectionAssetId
      ).to.not.equal(
        tokenAssetId
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

      expect(
        await registry.getAssetId(
          asset.target,
          AssetScope.TOKEN,
          0
        )
      ).to.equal(
        tokenAssetId
      );
    });

    it("supports registering token type with zero initial supply", async function () {
      const { asset } =
        await createAsset();

      const metadataHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "zero-supply-edition"
          )
        );

      await asset
        .connect(minter)
        .createTokenType(
          ethers.ZeroAddress,
          99,
          0,
          100,
          "ipfs://edition-99.json",
          metadataHash,
          "0x"
        );

      expect(
        await asset["totalSupply(uint256)"](99)
      ).to.equal(0n);

      expect(
        await asset.tokenTypeExists(99)
      ).to.equal(true);

      await asset
        .registerNumenToken(99);

      expect(
        await asset.tokenAssetIds(99)
      ).to.not.equal(
        ethers.ZeroHash
      );
    });
  });

  describe("Standalone deployment", function () {
    it("creates collection without Registry when registry is zero", async function () {
      const {
        asset,
        assetId,
      } = await createAsset({
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
        await asset.collectionAssetId()
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        await asset.assetRegistry()
      ).to.equal(
        ethers.ZeroAddress
      );

      await expect(
        asset.registerNumenCollection()
      ).to.be.revertedWithCustomError(
        asset,
        "RegistryNotConfigured"
      );
    });
  });

  describe("Authority isolation", function () {
    it("factory does not become admin", async function () {
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

    it("factory does not receive MINTER_ROLE", async function () {
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

    it("factory does not receive PAUSER_ROLE", async function () {
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

    it("factory does not receive METADATA_ROLE", async function () {
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

    it("creator does not automatically receive admin privileges", async function () {
      const { asset } =
        await createAsset();

      const role =
        await asset.DEFAULT_ADMIN_ROLE();

      expect(
        await asset.hasRole(
          role,
          creator.address
        )
      ).to.equal(false);

      expect(
        await asset.hasRole(
          role,
          admin.address
        )
      ).to.equal(true);
    });
  });

  describe("Feature configuration", function () {
    it("supports collection with minting disabled", async function () {
      const { asset } =
        await createAsset({
          mintable: false,
          mintAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.mintable()
      ).to.equal(false);

      expect(
        await asset.hasRole(
          await asset.MINTER_ROLE(),
          minter.address
        )
      ).to.equal(false);
    });

    it("supports collection with pausing disabled", async function () {
      const { asset } =
        await createAsset({
          pausable: false,
          pauseAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.pausable()
      ).to.equal(false);

      expect(
        await asset.hasRole(
          await asset.PAUSER_ROLE(),
          pauser.address
        )
      ).to.equal(false);
    });

    it("supports collection with burning disabled", async function () {
      const { asset } =
        await createAsset({
          burnable: false,
      });

      expect(
        await asset.burnable()
      ).to.equal(false);
    });

    it("supports collection without object binding", async function () {
      const { asset } =
        await createAsset({
          objectBindingEnabled:
            false,
        });

      expect(
        await asset
          .objectBindingEnabled()
      ).to.equal(false);
    });
  });

  describe("V2 token security through Factory", function () {
    it("deployed collection uses permanent token type identity", async function () {
      const { asset } =
        await createAsset();

      await asset
        .connect(minter)
        .createTokenType(
          owner.address,
          55,
          10,
          10,
          "ipfs://55.json",
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "55"
            )
          ),
          "0x"
        );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          55,
          10
        );

      expect(
        await asset[
          "totalSupply(uint256)"
        ](55)
      ).to.equal(0n);

      expect(
        await asset.tokenTypeExists(55)
      ).to.equal(true);

      expect(
        await asset.tokenTotalMinted(55)
      ).to.equal(10n);
    });

    it("deployed collection enforces lifetime supply cap", async function () {
      const { asset } =
        await createAsset();

      await asset
        .connect(minter)
        .createTokenType(
          owner.address,
          56,
          10,
          10,
          "ipfs://56.json",
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "56"
            )
          ),
          "0x"
        );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          56,
          10
        );

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            56,
            1,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          56,
          10
        );
    });

    it("deployed collection rejects duplicate token IDs in batch mint", async function () {
      const { asset } =
        await createAsset();

      await asset
        .connect(minter)
        .createTokenType(
          ethers.ZeroAddress,
          57,
          0,
          10,
          "ipfs://57.json",
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "57"
            )
          ),
          "0x"
        );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [57, 57],
            [6, 6],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "DuplicateTokenId"
        )
        .withArgs(57);
    });

    it("deployed collection keeps metadata authority separate from minter", async function () {
      const { asset } =
        await createAsset();

      await asset
        .connect(minter)
        .createTokenType(
          owner.address,
          58,
          1,
          100,
          "ipfs://58.json",
          ethers.keccak256(
            ethers.toUtf8Bytes(
              "58"
            )
          ),
          "0x"
        );

      await expect(
        asset
          .connect(minter)
          .setTokenMetadata(
            58,
            "ipfs://malicious.json",
            ethers.ZeroHash
          )
      ).to.be.reverted;

      await expect(
        asset
          .connect(metadataAuthority)
          .setTokenMetadata(
            58,
            "ipfs://58-updated.json",
            ethers.keccak256(
              ethers.toUtf8Bytes(
                "58-updated"
              )
            )
          )
      ).to.emit(
        asset,
        "TokenMetadataUpdated"
      );
    });
  });

  describe("Atomicity", function () {
    it("reverts creation when Registry address is not a Registry contract", async function () {
      const config =
        createConfig({
          registry:
            attacker.address,
        });

      await expect(
        factory
          .connect(creator)
          .createERC1155Asset(config)
      ).to.be.reverted;
    });

    it("allows standalone creation when Registry is explicitly zero", async function () {
      const config =
        createConfig({
          registry:
            ethers.ZeroAddress,
        });

      await expect(
        factory
          .connect(creator)
          .createERC1155Asset(config)
      ).to.emit(
        factory,
        "ERC1155AssetCreated"
      );
    });
  });
});
