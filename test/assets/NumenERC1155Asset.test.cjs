const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenERC1155Asset V2", function () {
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

    const Registry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    registry =
      await Registry.deploy();

    await registry.waitForDeployment();
  });

  // ============================================================
  // HELPERS
  // ============================================================

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

  async function deployAsset(
    overrides = {}
  ) {
    const Asset =
      await ethers.getContractFactory(
        "NumenERC1155Asset"
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

  function tokenHash(
    tokenId
  ) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(
        `token-${tokenId}-metadata`
      )
    );
  }

  function tokenURI(
    tokenId
  ) {
    return `ipfs://token-${tokenId}.json`;
  }

  async function createTokenType(
    asset,
    tokenId = 1,
    initialAmount = 0,
    maxSupply = 100,
    tokenOwner = owner
  ) {
    const to =
      initialAmount === 0
        ? ethers.ZeroAddress
        : tokenOwner.address;

    await asset
      .connect(minter)
      .createTokenType(
        to,
        tokenId,
        initialAmount,
        maxSupply,
        tokenURI(tokenId),
        tokenHash(tokenId),
        "0x"
      );
  }

  async function mintExisting(
    asset,
    tokenId,
    amount,
    tokenOwner = owner
  ) {
    await asset
      .connect(minter)
      .mint(
        tokenOwner.address,
        tokenId,
        amount,
        "0x"
      );
  }

  // ============================================================
  // DEPLOYMENT
  // ============================================================

  describe("Deployment", function () {
    it("stores creator, admin and registry controller", async function () {
      const { asset } =
        await deployAsset();

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
    });

    it("stores Registry", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.registry()
      ).to.equal(
        registry.target
      );

      expect(
        await asset.assetRegistry()
      ).to.equal(
        registry.target
      );
    });

    it("reports protocol ID", async function () {
      const { asset } =
        await deployAsset();

      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ASSET_PROTOCOL"
          )
        );

      expect(
        await asset.protocolId()
      ).to.equal(expected);
    });

    it("reports ERC1155 V2 version", async function () {
      const { asset } =
        await deployAsset();

      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_ERC1155_ASSET_V2"
          )
        );

      expect(
        await asset.assetVersion()
      ).to.equal(expected);
    });

    it("reports NON_FUNGIBLE class", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.assetClass()
      ).to.equal(1n);
    });

    it("reports ERC1155 standard", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.assetStandard()
      ).to.equal(3n);
    });

    it("stores selected classification", async function () {
      const {
        asset,
        config,
      } =
        await deployAsset();

      expect(
        await asset.category()
      ).to.equal(
        BigInt(
          config.category
        )
      );

      expect(
        await asset.representation()
      ).to.equal(
        BigInt(
          config.representation
        )
      );
    });

    it("stores feature flags", async function () {
      const { asset } =
        await deployAsset();

      const features =
        await asset.features();

      expect(
        features[0]
      ).to.equal(true);

      expect(
        features[1]
      ).to.equal(true);

      expect(
        features[2]
      ).to.equal(true);

      expect(
        features[3]
      ).to.equal(true);
    });

    it("stores collection metadata", async function () {
      const {
        asset,
        config,
      } =
        await deployAsset();

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

    it("starts with no collection Asset ID", async function () {
      const { asset } =
        await deployAsset();

      expect(
        await asset.collectionAssetId()
      ).to.equal(
        ethers.ZeroHash
      );
    });

    it("rejects zero creator", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenERC1155Asset"
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
          "NumenERC1155Asset"
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

    it("rejects zero metadata authority", async function () {
      const Asset =
        await ethers.getContractFactory(
          "NumenERC1155Asset"
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

    it("allows zero mint authority when minting is disabled", async function () {
      const { asset } =
        await deployAsset({
          mintable: false,
          mintAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.mintable()
      ).to.equal(false);
    });

    it("allows zero pause authority when pausing is disabled", async function () {
      const { asset } =
        await deployAsset({
          pausable: false,
          pauseAuthority:
            ethers.ZeroAddress,
        });

      expect(
        await asset.pausable()
      ).to.equal(false);
    });
  });

  // ============================================================
  // ROLES
  // ============================================================

  describe("Roles", function () {
    it("assigns DEFAULT_ADMIN_ROLE", async function () {
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

    it("assigns MINTER_ROLE only to selected authority", async function () {
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
          metadataAuthority.address
        )
      ).to.equal(false);
    });

    it("assigns PAUSER_ROLE", async function () {
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

    it("assigns METADATA_ROLE", async function () {
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

      expect(
        await asset.hasRole(
          role,
          minter.address
        )
      ).to.equal(false);
    });
  });

  // ============================================================
  // TOKEN TYPE CREATION
  // ============================================================

  describe("Token type creation", function () {
    it("creates a permanent token type without initial supply", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            0,
            100,
            tokenURI(1),
            tokenHash(1),
            "0x"
          )
      )
        .to.emit(
          asset,
          "TokenTypeCreated"
        )
        .withArgs(
          1,
          0,
          100,
          tokenURI(1),
          tokenHash(1)
        );

      expect(
        await asset.tokenTypeExists(1)
      ).to.equal(true);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(0n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(0n);

      expect(
        await asset.tokenMaxSupply(1)
      ).to.equal(100n);
    });

    it("creates token type with initial supply", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        7,
        25,
        100
      );

      expect(
        await asset.balanceOf(
          owner.address,
          7
        )
      ).to.equal(25n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](7)
      ).to.equal(25n);

      expect(
        await asset.tokenTotalMinted(7)
      ).to.equal(25n);
    });

    it("supports tokenId zero", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        0,
        10,
        100
      );

      expect(
        await asset.tokenTypeExists(0)
      ).to.equal(true);

      expect(
        await asset.balanceOf(
          owner.address,
          0
        )
      ).to.equal(10n);
    });

    it("stores immutable initial maximum supply", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        20,
        100
      );

      expect(
        await asset.tokenMaxSupply(1)
      ).to.equal(100n);
    });

    it("supports unlimited lifetime issuance with maxSupply zero", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        0,
        0
      );

      expect(
        await asset.tokenMaxSupply(1)
      ).to.equal(0n);

      await mintExisting(
        asset,
        1,
        100
      );

      await mintExisting(
        asset,
        1,
        200
      );

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(300n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(300n);
    });

    it("stores token URI and metadata hash on creation", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        5,
        1,
        100
      );

      expect(
        await asset.uri(5)
      ).to.equal(
        tokenURI(5)
      );

      expect(
        await asset.tokenMetadataHash(5)
      ).to.equal(
        tokenHash(5)
      );
    });

    it("rejects duplicate token type creation", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            0,
            100,
            "ipfs://other.json",
            ethers.ZeroHash,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenTypeAlreadyExists"
        )
        .withArgs(1);
    });

    it("rejects empty token URI", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            0,
            100,
            "",
            ethers.ZeroHash,
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "EmptyTokenURI"
      );
    });

    it("rejects initial supply above maximum supply", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            owner.address,
            1,
            101,
            100,
            tokenURI(1),
            tokenHash(1),
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "InvalidMaximumSupply"
        )
        .withArgs(
          1,
          100,
          101
        );
    });

    it("rejects zero recipient when initial supply is nonzero", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            1,
            100,
            tokenURI(1),
            tokenHash(1),
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "ZeroAddress"
      );
    });

    it("rejects unauthorized token type creation", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(attacker)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            0,
            100,
            tokenURI(1),
            tokenHash(1),
            "0x"
          )
      ).to.be.reverted;
    });
  });

  // ============================================================
  // MINTING
  // ============================================================

  describe("Minting existing token types", function () {
    it("mints additional supply", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await mintExisting(
        asset,
        1,
        25
      );

      expect(
        await asset.balanceOf(
          owner.address,
          1
        )
      ).to.equal(35n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(35n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(35n);
    });

    it("rejects minting nonexistent token type", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            999,
            1,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenDoesNotExist"
        )
        .withArgs(999);
    });

    it("rejects zero amount", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            1,
            0,
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "InvalidAmount"
      );
    });

    it("rejects zero recipient", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mint(
            ethers.ZeroAddress,
            1,
            1,
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "ZeroAddress"
      );
    });

    it("rejects unauthorized minting", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(attacker)
          .mint(
            attacker.address,
            1,
            1,
            "0x"
          )
      ).to.be.reverted;
    });

    it("rejects minting when feature is disabled", async function () {
      const { asset } =
        await deployAsset({
          mintable: false,
          mintAuthority:
            ethers.ZeroAddress,
        });

      const minterRole =
        await asset.MINTER_ROLE();

      await asset
        .connect(admin)
        .grantRole(
          minterRole,
          minter.address
        );

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            ethers.ZeroAddress,
            1,
            0,
            100,
            tokenURI(1),
            tokenHash(1),
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "MintingDisabled"
      );
    });
  });

  // ============================================================
  // LIFETIME SUPPLY CAP
  // ============================================================

  describe("Lifetime supply cap", function () {
    it("enforces maximum lifetime issuance", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        75,
        100
      );

      await mintExisting(
        asset,
        1,
        25
      );

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(100n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(100n);

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            1,
            1,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          1,
          100
        );
    });

    it("burning does not restore mint capacity", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        100,
        100
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          1,
          50
        );

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(50n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(100n);

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            1,
            1,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          1,
          100
        );
    });

    it("fully burning supply does not restore mint capacity", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        42,
        10,
        10
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          42,
          10
        );

      expect(
        await asset[
          "totalSupply(uint256)"
        ](42)
      ).to.equal(0n);

      expect(
        await asset.exists(42)
      ).to.equal(false);

      expect(
        await asset.tokenTypeExists(42)
      ).to.equal(true);

      expect(
        await asset.tokenTotalMinted(42)
      ).to.equal(10n);

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            42,
            1,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          42,
          10
        );
    });
  });

  // ============================================================
  // PERMANENT TOKEN TYPE IDENTITY
  // ============================================================

  describe("Permanent token type identity", function () {
    it("token type survives complete burn", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        7,
        5,
        10
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          7,
          5
        );

      expect(
        await asset.exists(7)
      ).to.equal(false);

      expect(
        await asset.tokenTypeExists(7)
      ).to.equal(true);

      expect(
        await asset.tokenMaxSupply(7)
      ).to.equal(10n);

      expect(
        await asset.tokenMetadataHash(7)
      ).to.equal(
        tokenHash(7)
      );

      expect(
        await asset.uri(7)
      ).to.equal(
        tokenURI(7)
      );
    });

    it("fully burned token type cannot be recreated", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        7,
        5,
        10
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          7,
          5
        );

      await expect(
        asset
          .connect(minter)
          .createTokenType(
            owner.address,
            7,
            1,
            10,
            "ipfs://replacement.json",
            ethers.ZeroHash,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenTypeAlreadyExists"
        )
        .withArgs(7);
    });
  });

  // ============================================================
  // METADATA AUTHORITY SEPARATION
  // ============================================================

  describe("Metadata authority separation", function () {
    it("minter cannot alter metadata while minting", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        1,
        100
      );

      const originalURI =
        await asset.uri(1);

      const originalHash =
        await asset.tokenMetadataHash(1);

      await mintExisting(
        asset,
        1,
        10
      );

      expect(
        await asset.uri(1)
      ).to.equal(
        originalURI
      );

      expect(
        await asset.tokenMetadataHash(1)
      ).to.equal(
        originalHash
      );
    });

    it("MINTER_ROLE alone cannot call setTokenMetadata", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .setTokenMetadata(
            1,
            "ipfs://malicious.json",
            ethers.keccak256(
              ethers.toUtf8Bytes(
                "malicious"
              )
            )
          )
      ).to.be.reverted;
    });

    it("metadata authority can update token metadata", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "updated-token"
          )
        );

      await expect(
        asset
          .connect(metadataAuthority)
          .setTokenMetadata(
            1,
            "ipfs://updated-token.json",
            newHash
          )
      )
        .to.emit(
          asset,
          "TokenMetadataUpdated"
        )
        .withArgs(
          1,
          "ipfs://updated-token.json",
          newHash
        );

      expect(
        await asset.uri(1)
      ).to.equal(
        "ipfs://updated-token.json"
      );

      expect(
        await asset.tokenMetadataHash(1)
      ).to.equal(newHash);
    });

    it("metadata remains editable after complete burn", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        5,
        10
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          1,
          5
        );

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "post-burn-metadata"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setTokenMetadata(
          1,
          "ipfs://post-burn.json",
          newHash
        );

      expect(
        await asset.uri(1)
      ).to.equal(
        "ipfs://post-burn.json"
      );

      expect(
        await asset.tokenMetadataHash(1)
      ).to.equal(newHash);
    });

    it("rejects metadata update for nonexistent token type", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(metadataAuthority)
          .setTokenMetadata(
            999,
            "ipfs://unknown.json",
            ethers.ZeroHash
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenDoesNotExist"
        )
        .withArgs(999);
    });

    it("rejects empty token metadata URI", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(metadataAuthority)
          .setTokenMetadata(
            1,
            "",
            ethers.ZeroHash
          )
      ).to.be.revertedWithCustomError(
        asset,
        "EmptyTokenURI"
      );
    });
  });

  // ============================================================
  // BATCH MINT SECURITY
  // ============================================================

  describe("Batch mint security", function () {
    beforeEach(async function () {});

    it("mints several existing token types", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        0,
        100
      );

      await createTokenType(
        asset,
        2,
        0,
        100
      );

      await createTokenType(
        asset,
        3,
        0,
        100
      );

      await asset
        .connect(minter)
        .mintBatch(
          owner.address,
          [1, 2, 3],
          [10, 20, 30],
          "0x"
        );

      expect(
        await asset.balanceOf(
          owner.address,
          1
        )
      ).to.equal(10n);

      expect(
        await asset.balanceOf(
          owner.address,
          2
        )
      ).to.equal(20n);

      expect(
        await asset.balanceOf(
          owner.address,
          3
        )
      ).to.equal(30n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(10n);

      expect(
        await asset.tokenTotalMinted(2)
      ).to.equal(20n);

      expect(
        await asset.tokenTotalMinted(3)
      ).to.equal(30n);
    });

    it("rejects duplicate token IDs", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        0,
        10
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [1, 1],
            [6, 6],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "DuplicateTokenId"
        )
        .withArgs(1);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(0n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(0n);
    });

    it("rejects batch amount exceeding lifetime cap", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        8,
        10
      );

      await createTokenType(
        asset,
        2,
        0,
        100
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [1, 2],
            [3, 10],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          1,
          10
        );

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(8n);

      expect(
        await asset.tokenTotalMinted(2)
      ).to.equal(0n);
    });

    it("rejects nonexistent token type in batch", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [1, 999],
            [1, 1],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenDoesNotExist"
        )
        .withArgs(999);
    });

    it("rejects zero amount in batch", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await createTokenType(
        asset,
        2
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [1, 2],
            [1, 0],
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "InvalidAmount"
      );
    });

    it("rejects mismatched batch arrays", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [1],
            [1, 2],
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "ArrayLengthMismatch"
      );
    });

    it("rejects empty batch", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [],
            [],
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "ArrayLengthMismatch"
      );
    });

    it("rejects zero recipient in batch", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            ethers.ZeroAddress,
            [1],
            [1],
            "0x"
          )
      ).to.be.revertedWithCustomError(
        asset,
        "ZeroAddress"
      );
    });
  });

  // ============================================================
  // BURNING
  // ============================================================

  describe("Burning", function () {
    it("allows holder to burn", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          1,
          4
        );

      expect(
        await asset.balanceOf(
          owner.address,
          1
        )
      ).to.equal(6n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(6n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(10n);
    });

    it("allows batch burn", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await createTokenType(
        asset,
        2,
        20,
        100
      );

      await asset
        .connect(owner)
        .burnBatch(
          owner.address,
          [1, 2],
          [5, 10]
        );

      expect(
        await asset.balanceOf(
          owner.address,
          1
        )
      ).to.equal(5n);

      expect(
        await asset.balanceOf(
          owner.address,
          2
        )
      ).to.equal(10n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(10n);

      expect(
        await asset.tokenTotalMinted(2)
      ).to.equal(20n);
    });

    it("rejects burn when disabled", async function () {
      const { asset } =
        await deployAsset({
          burnable: false,
        });

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await expect(
        asset
          .connect(owner)
          .burn(
            owner.address,
            1,
            1
          )
      ).to.be.revertedWithCustomError(
        asset,
        "BurningDisabled"
      );
    });
  });

  // ============================================================
  // PAUSING
  // ============================================================

  describe("Pausing", function () {
    it("pauses and unpauses transfers", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await asset
        .connect(pauser)
        .pause();

      await expect(
        asset
          .connect(owner)
          .safeTransferFrom(
            owner.address,
            receiver.address,
            1,
            5,
            "0x"
          )
      ).to.be.reverted;

      await asset
        .connect(pauser)
        .unpause();

      await asset
        .connect(owner)
        .safeTransferFrom(
          owner.address,
          receiver.address,
          1,
          5,
          "0x"
        );

      expect(
        await asset.balanceOf(
          receiver.address,
          1
        )
      ).to.equal(5n);
    });

    it("prevents minting while paused", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await asset
        .connect(pauser)
        .pause();

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            1,
            1,
            "0x"
          )
      ).to.be.reverted;
    });

    it("rejects pause from unauthorized wallet", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(attacker)
          .pause()
      ).to.be.reverted;
    });
  });

  // ============================================================
  // COLLECTION METADATA
  // ============================================================

  describe("Collection metadata", function () {
    it("metadata authority updates collection metadata", async function () {
      const { asset } =
        await deployAsset();

      const newHash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "new-collection"
          )
        );

      await asset
        .connect(metadataAuthority)
        .setCollectionMetadata(
          "ipfs://new-collection",
          newHash
        );

      const metadata =
        await asset.collectionMetadata();

      expect(
        metadata[0]
      ).to.equal(
        "ipfs://new-collection"
      );

      expect(
        metadata[1]
      ).to.equal(newHash);
    });

    it("metadata authority updates classification", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(metadataAuthority)
        .setClassification(
          AssetCategory.PRODUCT,
          RepresentationType.DIGITAL_TWIN
        );

      expect(
        await asset.category()
      ).to.equal(
        BigInt(
          AssetCategory.PRODUCT
        )
      );

      expect(
        await asset.representation()
      ).to.equal(
        BigInt(
          RepresentationType.DIGITAL_TWIN
        )
      );
    });

    it("metadata authority updates base URI", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(metadataAuthority)
        .setBaseURI(
          "ipfs://new-base/{id}.json"
        );

      expect(
        await asset.baseURI()
      ).to.equal(
        "ipfs://new-base/{id}.json"
      );
    });

    it("rejects metadata changes from minter", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset
          .connect(minter)
          .setCollectionMetadata(
            "ipfs://bad",
            ethers.ZeroHash
          )
      ).to.be.reverted;
    });
  });

  // ============================================================
  // COLLECTION REGISTRATION
  // ============================================================

  describe("Numen collection registration", function () {
    it("registers collection using CONTRACT scope", async function () {
      const { asset } =
        await deployAsset();

      await asset
        .connect(attacker)
        .registerNumenCollection();

      const assetId =
        await asset.collectionAssetId();

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
        record.tokenId
      ).to.equal(0n);

      expect(
        record.scope
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
    });

    it("registration trigger is permissionless", async function () {
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
  });

  // ============================================================
  // TOKEN REGISTRATION
  // ============================================================

  describe("Numen token registration", function () {
    it("registers created token type", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        77,
        10,
        100
      );

      await asset
        .connect(attacker)
        .registerNumenToken(77);

      const assetId =
        await asset.tokenAssetIds(77);

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
        record.tokenId
      ).to.equal(77n);

      expect(
        record.scope
      ).to.equal(1n);
    });

    it("can register token type after all supply is burned", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        77,
        10,
        10
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          77,
          10
        );

      expect(
        await asset.exists(77)
      ).to.equal(false);

      expect(
        await asset.tokenTypeExists(77)
      ).to.equal(true);

      await asset
        .connect(attacker)
        .registerNumenToken(77);

      expect(
        await asset.tokenAssetIds(77)
      ).to.not.equal(
        ethers.ZeroHash
      );
    });

    it("can register token type that was created with zero initial supply", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        9,
        0,
        100
      );

      expect(
        await asset.exists(9)
      ).to.equal(false);

      expect(
        await asset.tokenTypeExists(9)
      ).to.equal(true);

      await asset
        .registerNumenToken(9);

      expect(
        await asset.tokenAssetIds(9)
      ).to.not.equal(
        ethers.ZeroHash
      );
    });

    it("rejects registration of nonexistent token type", async function () {
      const { asset } =
        await deployAsset();

      await expect(
        asset.registerNumenToken(
          999
        )
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenDoesNotExist"
        )
        .withArgs(999);
    });

    it("rejects duplicate token registration", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1
      );

      await asset
        .registerNumenToken(1);

      await expect(
        asset.registerNumenToken(1)
      )
        .to.be.revertedWithCustomError(
          asset,
          "TokenAlreadyRegistered"
        )
        .withArgs(1);
    });
  });

  // ============================================================
  // ERC1155 TRANSFERS
  // ============================================================

  describe("ERC1155 transfers", function () {
    it("transfers tokens normally", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        10,
        100
      );

      await asset
        .connect(owner)
        .safeTransferFrom(
          owner.address,
          receiver.address,
          1,
          4,
          "0x"
        );

      expect(
        await asset.balanceOf(
          owner.address,
          1
        )
      ).to.equal(6n);

      expect(
        await asset.balanceOf(
          receiver.address,
          1
        )
      ).to.equal(4n);

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(10n);
    });

    it("transfers do not affect lifetime issuance", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        1,
        100,
        100
      );

      await asset
        .connect(owner)
        .safeTransferFrom(
          owner.address,
          receiver.address,
          1,
          50,
          "0x"
        );

      expect(
        await asset.tokenTotalMinted(1)
      ).to.equal(100n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](1)
      ).to.equal(100n);
    });
  });

  // ============================================================
  // CRITICAL SECURITY REGRESSION TESTS
  // ============================================================

  describe("Critical V2 security guarantees", function () {
    it("SECURITY: burn cannot reopen a capped edition", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        100,
        100,
        100
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          100,
          100
        );

      expect(
        await asset[
          "totalSupply(uint256)"
        ](100)
      ).to.equal(0n);

      expect(
        await asset.tokenTotalMinted(100)
      ).to.equal(100n);

      await expect(
        asset
          .connect(minter)
          .mint(
            owner.address,
            100,
            100,
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          100,
          100
        );
    });

    it("SECURITY: fully burned token type keeps identity", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        101,
        1,
        1
      );

      await asset
        .connect(owner)
        .burn(
          owner.address,
          101,
          1
        );

      expect(
        await asset.exists(101)
      ).to.equal(false);

      expect(
        await asset.tokenTypeExists(101)
      ).to.equal(true);

      expect(
        await asset.uri(101)
      ).to.equal(
        tokenURI(101)
      );

      expect(
        await asset.tokenMetadataHash(101)
      ).to.equal(
        tokenHash(101)
      );

      expect(
        await asset.tokenTotalMinted(101)
      ).to.equal(1n);

      expect(
        await asset.tokenMaxSupply(101)
      ).to.equal(1n);
    });

    it("SECURITY: duplicate batch IDs cannot bypass cap", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        102,
        0,
        10
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [102, 102],
            [6, 6],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "DuplicateTokenId"
        )
        .withArgs(102);

      expect(
        await asset.tokenTotalMinted(102)
      ).to.equal(0n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](102)
      ).to.equal(0n);
    });

    it("SECURITY: minter cannot overwrite existing metadata", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        103,
        1,
        100
      );

      const originalURI =
        await asset.uri(103);

      const originalHash =
        await asset.tokenMetadataHash(
          103
        );

      await asset
        .connect(minter)
        .mint(
          owner.address,
          103,
          10,
          "0x"
        );

      expect(
        await asset.uri(103)
      ).to.equal(
        originalURI
      );

      expect(
        await asset.tokenMetadataHash(
          103
        )
      ).to.equal(
        originalHash
      );

      await expect(
        asset
          .connect(minter)
          .setTokenMetadata(
            103,
            "ipfs://unauthorized-change.json",
            ethers.keccak256(
              ethers.toUtf8Bytes(
                "unauthorized-change"
              )
            )
          )
      ).to.be.reverted;
    });

    it("SECURITY: failed capped batch leaves all counters unchanged", async function () {
      const { asset } =
        await deployAsset();

      await createTokenType(
        asset,
        200,
        8,
        10
      );

      await createTokenType(
        asset,
        201,
        5,
        100
      );

      await expect(
        asset
          .connect(minter)
          .mintBatch(
            owner.address,
            [201, 200],
            [20, 3],
            "0x"
          )
      )
        .to.be.revertedWithCustomError(
          asset,
          "MaximumSupplyExceeded"
        )
        .withArgs(
          200,
          10
        );

      expect(
        await asset.tokenTotalMinted(200)
      ).to.equal(8n);

      expect(
        await asset.tokenTotalMinted(201)
      ).to.equal(5n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](200)
      ).to.equal(8n);

      expect(
        await asset[
          "totalSupply(uint256)"
        ](201)
      ).to.equal(5n);
    });
  });
});