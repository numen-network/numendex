const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenMetadataRegistry", function () {
  let creator;
  let admin;
  let recipient;
  let metadataAuthority;
  let newController;
  let attacker;

  let assetRegistry;
  let metadataRegistry;
  let asset;

  let assetId;

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

  const PropertyValueType = {
    TEXT: 0,
    INTEGER: 1,
    DECIMAL: 2,
    BOOLEAN: 3,
    DATE: 4,
    URI: 5,
    HASH: 6,
    ADDRESS: 7,
    BYTES: 8,
  };

  function encodeText(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [value]
    );
  }

  function encodeInteger(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256"],
      [value]
    );
  }

  function encodeDecimal(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [value]
    );
  }

  function encodeBoolean(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["bool"],
      [value]
    );
  }

  function encodeDate(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256"],
      [value]
    );
  }

  function encodeUri(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [value]
    );
  }

  function encodeHash(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [value]
    );
  }

  function encodeAddress(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [value]
    );
  }

  function encodeBytes(value) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes"],
      [value]
    );
  }

  function decodeText(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["string"],
      value
    )[0];
  }

  function decodeInteger(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["int256"],
      value
    )[0];
  }

  function decodeDecimal(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["string"],
      value
    )[0];
  }

  function decodeBoolean(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      value
    )[0];
  }

  function decodeDate(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["uint256"],
      value
    )[0];
  }

  function decodeUri(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["string"],
      value
    )[0];
  }

  function decodeHash(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes32"],
      value
    )[0];
  }

  function decodeAddress(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["address"],
      value
    )[0];
  }

  function decodeBytes(value) {
    return ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes"],
      value
    )[0];
  }

  function createAssetConfig(overrides = {}) {
    return {
      name: "Metadata Test Asset",
      symbol: "MTA",
      decimals: 18,

      initialSupply: ethers.parseUnits(
        "1000000",
        18
      ),

      maxSupply: ethers.parseUnits(
        "1000000",
        18
      ),

      supplyModel: SupplyModel.FIXED,

      mintable: false,
      burnable: true,
      pausable: false,
      permitEnabled: true,
      votesEnabled: true,
      objectBindingEnabled: true,

      category: AssetCategory.PRODUCT,

      representation:
        RepresentationType.PHYSICAL_REFERENCE,

      metadataURI:
        "ipfs://metadata-test-asset",

      metadataHash: ethers.keccak256(
        ethers.toUtf8Bytes(
          "metadata-test-asset"
        )
      ),

      creator: creator.address,
      admin: admin.address,

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

  async function deploySystem() {
    const AssetRegistry =
      await ethers.getContractFactory(
        "NumenAssetRegistry"
      );

    assetRegistry =
      await AssetRegistry.deploy();

    await assetRegistry.waitForDeployment();

    const MetadataRegistry =
      await ethers.getContractFactory(
        "NumenMetadataRegistry"
      );

    metadataRegistry =
      await MetadataRegistry.deploy(
        assetRegistry.target
      );

    await metadataRegistry.waitForDeployment();

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
  }

  async function createProperty({
    key = "Weight",
    valueType = PropertyValueType.DECIMAL,
    value = encodeDecimal("2.40"),
    unit = "kg",
    signer = admin,
  } = {}) {
    const propertyId =
      await metadataRegistry.getPropertyId(
        assetId,
        key
      );

    const tx =
      await metadataRegistry
        .connect(signer)
        .createProperty(
          assetId,
          key,
          valueType,
          value,
          unit
        );

    await tx.wait();

    return propertyId;
  }

  beforeEach(async function () {
    [
      ,
      creator,
      admin,
      recipient,
      metadataAuthority,
      newController,
      attacker,
    ] = await ethers.getSigners();

    await deploySystem();
  });

  describe("Deployment", function () {
    it("deploys with the correct asset registry", async function () {
      expect(
        await metadataRegistry.assetRegistry()
      ).to.equal(
        assetRegistry.target
      );
    });

    it("rejects zero asset registry", async function () {
      const MetadataRegistry =
        await ethers.getContractFactory(
          "NumenMetadataRegistry"
        );

      await expect(
        MetadataRegistry.deploy(
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        MetadataRegistry,
        "ZeroAddress"
      );
    });

    it("returns the correct metadata registry version", async function () {
      const expected =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "NUMEN_METADATA_REGISTRY_V1"
          )
        );

      expect(
        await metadataRegistry.metadataRegistryVersion()
      ).to.equal(expected);
    });
  });

  describe("Property identifiers", function () {
    it("generates deterministic property IDs", async function () {
      const first =
        await metadataRegistry.getPropertyId(
          assetId,
          "Weight"
        );

      const second =
        await metadataRegistry.getPropertyId(
          assetId,
          "Weight"
        );

      expect(first).to.equal(second);
    });

    it("generates different IDs for different keys", async function () {
      const weight =
        await metadataRegistry.getPropertyId(
          assetId,
          "Weight"
        );

      const color =
        await metadataRegistry.getPropertyId(
          assetId,
          "Color"
        );

      expect(weight).to.not.equal(color);
    });

    it("treats property keys as case-sensitive", async function () {
      const upper =
        await metadataRegistry.getPropertyId(
          assetId,
          "Weight"
        );

      const lower =
        await metadataRegistry.getPropertyId(
          assetId,
          "weight"
        );

      expect(upper).to.not.equal(lower);
    });
  });

  describe("Property creation", function () {
    it("creates a decimal property", async function () {
      const value =
        encodeDecimal("2.40");

      const propertyId =
        await createProperty({
          key: "Weight",
          valueType:
            PropertyValueType.DECIMAL,
          value,
          unit: "kg",
        });

      expect(
        await metadataRegistry.propertyExists(
          assetId,
          propertyId
        )
      ).to.equal(true);

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          propertyId
        )
      ).to.equal(true);

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        property.propertyId
      ).to.equal(propertyId);

      expect(
        property.key
      ).to.equal("Weight");

      expect(
        property.valueType
      ).to.equal(
        BigInt(
          PropertyValueType.DECIMAL
        )
      );

      expect(
        decodeDecimal(
          property.value
        )
      ).to.equal("2.40");

      expect(
        property.unit
      ).to.equal("kg");

      expect(
        property.active
      ).to.equal(true);

      expect(
        property.createdAt
      ).to.be.greaterThan(0n);

      expect(
        property.updatedAt
      ).to.equal(
        property.createdAt
      );
    });

    it("emits PropertyCreated", async function () {
      const key =
        "Clarity";

      const value =
        encodeText("VS1");

      const propertyId =
        await metadataRegistry.getPropertyId(
          assetId,
          key
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            key,
            PropertyValueType.TEXT,
            value,
            "",
          )
      )
        .to.emit(
          metadataRegistry,
          "PropertyCreated"
        )
        .withArgs(
          assetId,
          propertyId,
          key,
          PropertyValueType.TEXT,
          "",
          admin.address
        );
    });

    it("increments property count", async function () {
      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(0n);

      await createProperty({
        key: "Weight",
      });

      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(1n);

      await createProperty({
        key: "Color",
        valueType:
          PropertyValueType.TEXT,
        value:
          encodeText("Blue"),
        unit: "",
      });

      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(2n);
    });

    it("stores property ID in enumeration", async function () {
      const propertyId =
        await createProperty();

      expect(
        await metadataRegistry.propertyIdAt(
          assetId,
          0
        )
      ).to.equal(propertyId);

      const ids =
        await metadataRegistry.propertyIds(
          assetId
        );

      expect(ids.length).to.equal(1);

      expect(
        ids[0]
      ).to.equal(propertyId);
    });

    it("rejects duplicate property keys", async function () {
      const propertyId =
        await createProperty({
          key: "Weight",
        });

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("3.50"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyAlreadyExists"
        )
        .withArgs(
          assetId,
          propertyId
        );
    });

    it("rejects empty property key", async function () {
      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "",
            PropertyValueType.TEXT,
            encodeText("test"),
            ""
          )
      ).to.be.revertedWithCustomError(
        metadataRegistry,
        "EmptyKey"
      );
    });

    it("rejects empty encoded value", async function () {
      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            "0x",
            "kg"
          )
      ).to.be.revertedWithCustomError(
        metadataRegistry,
        "EmptyValue"
      );
    });
  });

  describe("Supported property value types", function () {
    it("stores TEXT", async function () {
      const propertyId =
        await createProperty({
          key: "Color",
          valueType:
            PropertyValueType.TEXT,
          value:
            encodeText("Blue"),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeText(
          property.value
        )
      ).to.equal("Blue");
    });

    it("stores INTEGER", async function () {
      const propertyId =
        await createProperty({
          key: "BatchNumber",
          valueType:
            PropertyValueType.INTEGER,
          value:
            encodeInteger(42n),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeInteger(
          property.value
        )
      ).to.equal(42n);
    });

    it("stores DECIMAL", async function () {
      const propertyId =
        await createProperty({
          key: "Weight",
          valueType:
            PropertyValueType.DECIMAL,
          value:
            encodeDecimal("2.40"),
          unit: "ct",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeDecimal(
          property.value
        )
      ).to.equal("2.40");

      expect(
        property.unit
      ).to.equal("ct");
    });

    it("stores BOOLEAN", async function () {
      const propertyId =
        await createProperty({
          key: "Insured",
          valueType:
            PropertyValueType.BOOLEAN,
          value:
            encodeBoolean(true),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeBoolean(
          property.value
        )
      ).to.equal(true);
    });

    it("stores DATE", async function () {
      const timestamp =
        1798761600n;

      const propertyId =
        await createProperty({
          key: "Manufactured",
          valueType:
            PropertyValueType.DATE,
          value:
            encodeDate(timestamp),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeDate(
          property.value
        )
      ).to.equal(timestamp);
    });

    it("stores URI", async function () {
      const uri =
        "ipfs://numen-property";

      const propertyId =
        await createProperty({
          key: "Website",
          valueType:
            PropertyValueType.URI,
          value:
            encodeUri(uri),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeUri(
          property.value
        )
      ).to.equal(uri);
    });

    it("stores HASH", async function () {
      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "certificate"
          )
        );

      const propertyId =
        await createProperty({
          key: "CertificateHash",
          valueType:
            PropertyValueType.HASH,
          value:
            encodeHash(hash),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeHash(
          property.value
        )
      ).to.equal(hash);
    });

    it("stores ADDRESS", async function () {
      const propertyId =
        await createProperty({
          key: "Custodian",
          valueType:
            PropertyValueType.ADDRESS,
          value:
            encodeAddress(
              recipient.address
            ),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeAddress(
          property.value
        )
      ).to.equal(
        recipient.address
      );
    });

    it("stores BYTES", async function () {
      const raw =
        ethers.toUtf8Bytes(
          "numen-binary-data"
        );

      const propertyId =
        await createProperty({
          key: "RawData",
          valueType:
            PropertyValueType.BYTES,
          value:
            encodeBytes(raw),
          unit: "",
        });

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      const decoded =
        decodeBytes(
          property.value
        );

      expect(
        ethers.hexlify(decoded)
      ).to.equal(
        ethers.hexlify(raw)
      );
    });
  });

  describe("Property updates", function () {
    it("updates property value", async function () {
      const propertyId =
        await createProperty({
          key: "Weight",
          value:
            encodeDecimal("2.40"),
          unit: "kg",
        });

      await metadataRegistry
        .connect(admin)
        .updateProperty(
          assetId,
          propertyId,
          PropertyValueType.DECIMAL,
          encodeDecimal("3.75"),
          "kg"
        );

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeDecimal(
          property.value
        )
      ).to.equal("3.75");

      expect(
        property.unit
      ).to.equal("kg");
    });

    it("can change property value type", async function () {
      const propertyId =
        await createProperty({
          key: "Reference",
          valueType:
            PropertyValueType.TEXT,
          value:
            encodeText("12345"),
          unit: "",
        });

      const hash =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "12345"
          )
        );

      await metadataRegistry
        .connect(admin)
        .updateProperty(
          assetId,
          propertyId,
          PropertyValueType.HASH,
          encodeHash(hash),
          ""
        );

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        property.valueType
      ).to.equal(
        BigInt(
          PropertyValueType.HASH
        )
      );

      expect(
        decodeHash(
          property.value
        )
      ).to.equal(hash);
    });

    it("emits PropertyUpdated", async function () {
      const propertyId =
        await createProperty();

      await expect(
        metadataRegistry
          .connect(admin)
          .updateProperty(
            assetId,
            propertyId,
            PropertyValueType.DECIMAL,
            encodeDecimal("5.00"),
            "kg"
          )
      )
        .to.emit(
          metadataRegistry,
          "PropertyUpdated"
        )
        .withArgs(
          assetId,
          propertyId,
          PropertyValueType.DECIMAL,
          "kg",
          admin.address
        );
    });

    it("rejects empty updated value", async function () {
      const propertyId =
        await createProperty();

      await expect(
        metadataRegistry
          .connect(admin)
          .updateProperty(
            assetId,
            propertyId,
            PropertyValueType.DECIMAL,
            "0x",
            "kg"
          )
      ).to.be.revertedWithCustomError(
        metadataRegistry,
        "EmptyValue"
      );
    });

    it("rejects update for unknown property", async function () {
      const unknownProperty =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown"
          )
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .updateProperty(
            assetId,
            unknownProperty,
            PropertyValueType.TEXT,
            encodeText("test"),
            ""
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyNotFound"
        )
        .withArgs(
          assetId,
          unknownProperty
        );
    });
  });

  describe("Property activation", function () {
    it("deactivates a property without deleting it", async function () {
      const propertyId =
        await createProperty();

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          propertyId
        );

      expect(
        await metadataRegistry.propertyExists(
          assetId,
          propertyId
        )
      ).to.equal(true);

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          propertyId
        )
      ).to.equal(false);

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        property.active
      ).to.equal(false);

      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(1n);
    });

    it("emits PropertyDeactivated", async function () {
      const propertyId =
        await createProperty();

      await expect(
        metadataRegistry
          .connect(admin)
          .deactivateProperty(
            assetId,
            propertyId
          )
      )
        .to.emit(
          metadataRegistry,
          "PropertyDeactivated"
        )
        .withArgs(
          assetId,
          propertyId,
          admin.address
        );
    });

    it("rejects update while property is inactive", async function () {
      const propertyId =
        await createProperty();

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          propertyId
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .updateProperty(
            assetId,
            propertyId,
            PropertyValueType.DECIMAL,
            encodeDecimal("9.00"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyInactive"
        )
        .withArgs(
          assetId,
          propertyId
        );
    });

    it("rejects double deactivation", async function () {
      const propertyId =
        await createProperty();

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          propertyId
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .deactivateProperty(
            assetId,
            propertyId
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyAlreadyInactive"
        )
        .withArgs(
          assetId,
          propertyId
        );
    });

    it("reactivates a property", async function () {
      const propertyId =
        await createProperty();

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          propertyId
        );

      await metadataRegistry
        .connect(admin)
        .reactivateProperty(
          assetId,
          propertyId
        );

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          propertyId
        )
      ).to.equal(true);

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        property.active
      ).to.equal(true);
    });

    it("emits PropertyReactivated", async function () {
      const propertyId =
        await createProperty();

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          propertyId
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .reactivateProperty(
            assetId,
            propertyId
          )
      )
        .to.emit(
          metadataRegistry,
          "PropertyReactivated"
        )
        .withArgs(
          assetId,
          propertyId,
          admin.address
        );
    });

    it("rejects reactivation of active property", async function () {
      const propertyId =
        await createProperty();

      await expect(
        metadataRegistry
          .connect(admin)
          .reactivateProperty(
            assetId,
            propertyId
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyAlreadyActive"
        )
        .withArgs(
          assetId,
          propertyId
        );
    });
  });

  describe("Authorization", function () {
    it("allows current registry controller to create properties", async function () {
      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      ).to.not.be.reverted;
    });

    it("does not use token METADATA_ROLE as protocol property authority", async function () {
      await expect(
        metadataRegistry
          .connect(metadataAuthority)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "Unauthorized"
        )
        .withArgs(
          metadataAuthority.address,
          assetId
        );
    });

    it("rejects unauthorized caller", async function () {
      await expect(
        metadataRegistry
          .connect(attacker)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          assetId
        );
    });

    it("automatically follows registry controller transfer", async function () {
      await assetRegistry
        .connect(admin)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await assetRegistry
        .connect(newController)
        .acceptAssetController(assetId);

      const record =
        await assetRegistry.getAsset(
          assetId
        );

      expect(
        record.controller
      ).to.equal(
        newController.address
      );

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "OldControllerProperty",
            PropertyValueType.TEXT,
            encodeText("test"),
            ""
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "Unauthorized"
        )
        .withArgs(
          admin.address,
          assetId
        );

      await expect(
        metadataRegistry
          .connect(newController)
          .createProperty(
            assetId,
            "NewControllerProperty",
            PropertyValueType.TEXT,
            encodeText("test"),
            ""
          )
      ).to.not.be.reverted;
    });

    it("allows new controller to update existing property", async function () {
      const propertyId =
        await createProperty();

      await assetRegistry
        .connect(admin)
        .proposeAssetController(
          assetId,
          newController.address
        );

      await assetRegistry
        .connect(newController)
        .acceptAssetController(assetId);

      await metadataRegistry
        .connect(newController)
        .updateProperty(
          assetId,
          propertyId,
          PropertyValueType.DECIMAL,
          encodeDecimal("7.50"),
          "kg"
        );

      const property =
        await metadataRegistry.getProperty(
          assetId,
          propertyId
        );

      expect(
        decodeDecimal(
          property.value
        )
      ).to.equal("7.50");
    });
  });

  describe("Asset state protection", function () {
    it("rejects unknown Asset ID", async function () {
      const unknownAssetId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown-asset"
          )
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            unknownAssetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "AssetNotFound"
        )
        .withArgs(
          unknownAssetId
        );
    });

    it("rejects modifications while asset is inactive", async function () {
      await assetRegistry
        .connect(admin)
        .deactivateAsset(
          assetId
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "AssetInactive"
        )
        .withArgs(
          assetId
        );
    });

    it("allows modifications after asset is reactivated", async function () {
      await assetRegistry
        .connect(admin)
        .deactivateAsset(
          assetId
        );

      await assetRegistry
        .connect(admin)
        .reactivateAsset(
          assetId
        );

      await expect(
        metadataRegistry
          .connect(admin)
          .createProperty(
            assetId,
            "Weight",
            PropertyValueType.DECIMAL,
            encodeDecimal("2.40"),
            "kg"
          )
      ).to.not.be.reverted;
    });
  });

  describe("Read protection", function () {
    it("returns false for unknown property activity", async function () {
      const unknownPropertyId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown-property"
          )
        );

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          unknownPropertyId
        )
      ).to.equal(false);
    });

    it("rejects getProperty for unknown property", async function () {
      const unknownPropertyId =
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unknown-property"
          )
        );

      await expect(
        metadataRegistry.getProperty(
          assetId,
          unknownPropertyId
        )
      )
        .to.be.revertedWithCustomError(
          metadataRegistry,
          "PropertyNotFound"
        )
        .withArgs(
          assetId,
          unknownPropertyId
        );
    });

    it("rejects invalid property index", async function () {
      await expect(
        metadataRegistry.propertyIdAt(
          assetId,
          0
        )
      ).to.be.revertedWithCustomError(
        metadataRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Multiple properties", function () {
    it("stores multiple independent properties for one asset", async function () {
      const weightId =
        await createProperty({
          key: "Weight",
          valueType:
            PropertyValueType.DECIMAL,
          value:
            encodeDecimal("2.40"),
          unit: "ct",
        });

      const clarityId =
        await createProperty({
          key: "Clarity",
          valueType:
            PropertyValueType.TEXT,
          value:
            encodeText("VS1"),
          unit: "",
        });

      const insuredId =
        await createProperty({
          key: "Insured",
          valueType:
            PropertyValueType.BOOLEAN,
          value:
            encodeBoolean(true),
          unit: "",
        });

      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(3n);

      expect(
        weightId
      ).to.not.equal(
        clarityId
      );

      expect(
        clarityId
      ).to.not.equal(
        insuredId
      );

      const weight =
        await metadataRegistry.getProperty(
          assetId,
          weightId
        );

      const clarity =
        await metadataRegistry.getProperty(
          assetId,
          clarityId
        );

      const insured =
        await metadataRegistry.getProperty(
          assetId,
          insuredId
        );

      expect(
        decodeDecimal(
          weight.value
        )
      ).to.equal("2.40");

      expect(
        weight.unit
      ).to.equal("ct");

      expect(
        decodeText(
          clarity.value
        )
      ).to.equal("VS1");

      expect(
        decodeBoolean(
          insured.value
        )
      ).to.equal(true);
    });

    it("preserves deactivated properties in enumeration", async function () {
      const weightId =
        await createProperty({
          key: "Weight",
        });

      const colorId =
        await createProperty({
          key: "Color",
          valueType:
            PropertyValueType.TEXT,
          value:
            encodeText("Blue"),
          unit: "",
        });

      await metadataRegistry
        .connect(admin)
        .deactivateProperty(
          assetId,
          weightId
        );

      expect(
        await metadataRegistry.propertyCount(
          assetId
        )
      ).to.equal(2n);

      const ids =
        await metadataRegistry.propertyIds(
          assetId
        );

      expect(ids.length).to.equal(2);

      expect(ids[0]).to.equal(
        weightId
      );

      expect(ids[1]).to.equal(
        colorId
      );

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          weightId
        )
      ).to.equal(false);

      expect(
        await metadataRegistry.isPropertyActive(
          assetId,
          colorId
        )
      ).to.equal(true);
    });
  });
});