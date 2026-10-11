const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenObjectRegistry", function () {
  let deployer;
  let creator;
  let controller;
  let newController;
  let attacker;
  let otherUser;

  let objectRegistry;

  function hashText(value) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(value)
    );
  }

  function createRequest(overrides = {}) {
    return {
      creator: creator.address,
      controller: controller.address,

      modelURI:
        "ipfs://numen/models/object-001.obj",

      modelHash:
        hashText("object-001-model"),

      modelFormat:
        "OBJ",

      spectralFingerprint:
        hashText("object-001-spectral"),

      spectralAlgorithm:
        "spectral3d",

      spectralVersion:
        "asset-v1",

      metadataURI:
        "ipfs://numen/metadata/object-001.json",

      metadataHash:
        hashText("object-001-metadata"),

      ...overrides,
    };
  }

  async function deployRegistry() {
    const Registry =
      await ethers.getContractFactory(
        "NumenObjectRegistry"
      );

    objectRegistry =
      await Registry.deploy();

    await objectRegistry.waitForDeployment();

    return objectRegistry;
  }

  async function registerObject(
    overrides = {},
    signer = creator
  ) {
    const request =
      createRequest(overrides);

    const tx =
      await objectRegistry
        .connect(signer)
        .registerObject(request);

    const receipt =
      await tx.wait();

    let event = null;

    for (
      const log of receipt.logs
    ) {
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
          event = parsed;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    expect(event).to.not.equal(null);

    const objectId =
      event.args.objectId;

    return {
      request,
      tx,
      receipt,
      event,
      objectId,
    };
  }

  beforeEach(async function () {
    [
      deployer,
      creator,
      controller,
      newController,
      attacker,
      otherUser,
    ] = await ethers.getSigners();

    await deployRegistry();
  });

  describe("Deployment", function () {
    it("deploys successfully", async function () {
      expect(
        await objectRegistry.getAddress()
      ).to.not.equal(
        ethers.ZeroAddress
      );
    });

    it("returns the expected registry version", async function () {
      const expected =
        hashText(
          "NUMEN_OBJECT_REGISTRY_V1"
        );

      expect(
        await objectRegistry.objectRegistryVersion()
      ).to.equal(expected);
    });

    it("starts with zero objects", async function () {
      expect(
        await objectRegistry.totalObjects()
      ).to.equal(0n);
    });
  });

  describe("Object registration", function () {
    it("registers an object", async function () {
      const {
        objectId,
      } = await registerObject();

      expect(
        objectId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        await objectRegistry.objectExists(
          objectId
        )
      ).to.equal(true);

      expect(
        await objectRegistry.isObjectActive(
          objectId
        )
      ).to.equal(true);

      expect(
        await objectRegistry.totalObjects()
      ).to.equal(1n);
    });

    it("stores the complete object record", async function () {
      const {
        objectId,
        request,
      } = await registerObject();

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.objectId
      ).to.equal(objectId);

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
        record.modelURI
      ).to.equal(
        request.modelURI
      );

      expect(
        record.modelHash
      ).to.equal(
        request.modelHash
      );

      expect(
        record.modelFormat
      ).to.equal(
        request.modelFormat
      );

      expect(
        record.spectralFingerprint
      ).to.equal(
        request.spectralFingerprint
      );

      expect(
        record.spectralAlgorithm
      ).to.equal(
        request.spectralAlgorithm
      );

      expect(
        record.spectralVersion
      ).to.equal(
        request.spectralVersion
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
        record.createdAt
      ).to.be.greaterThan(0n);

      expect(
        record.updatedAt
      ).to.equal(
        record.createdAt
      );

      expect(
        record.active
      ).to.equal(true);
    });

    it("emits ObjectRegistered", async function () {
      const request =
        createRequest();

      const tx =
        await objectRegistry
          .connect(creator)
          .registerObject(request);

      const receipt =
        await tx.wait();

      let event = null;

      for (
        const log of receipt.logs
      ) {
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
            event = parsed;
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      expect(event).to.not.equal(null);

      expect(
        event.args.objectId
      ).to.not.equal(
        ethers.ZeroHash
      );

      expect(
        event.args.creator
      ).to.equal(
        creator.address
      );

      expect(
        event.args.controller
      ).to.equal(
        controller.address
      );

      expect(
        event.args.modelHash
      ).to.equal(
        request.modelHash
      );

      expect(
        event.args.modelURI
      ).to.equal(
        request.modelURI
      );

      expect(
        event.args.modelFormat
      ).to.equal(
        request.modelFormat
      );
    });

    it("allows creator to also be controller", async function () {
      const {
        objectId,
      } = await registerObject({
        controller:
          creator.address,
      });

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.creator
      ).to.equal(
        creator.address
      );

      expect(
        record.controller
      ).to.equal(
        creator.address
      );
    });

    it("allows registration without a spectral fingerprint", async function () {
      const {
        objectId,
      } = await registerObject({
        spectralFingerprint:
          ethers.ZeroHash,

        spectralAlgorithm:
          "",

        spectralVersion:
          "",
      });

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.spectralFingerprint
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        record.spectralAlgorithm
      ).to.equal("");

      expect(
        record.spectralVersion
      ).to.equal("");
    });

    it("allows empty optional metadata", async function () {
      const {
        objectId,
      } = await registerObject({
        metadataURI: "",
        metadataHash:
          ethers.ZeroHash,
      });

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.metadataURI
      ).to.equal("");

      expect(
        record.metadataHash
      ).to.equal(
        ethers.ZeroHash
      );
    });

    it("rejects zero creator", async function () {
      const request =
        createRequest({
          creator:
            ethers.ZeroAddress,
        });

      await expect(
        objectRegistry
          .connect(creator)
          .registerObject(request)
      ).to.be.revertedWithCustomError(
        objectRegistry,
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
        objectRegistry
          .connect(creator)
          .registerObject(request)
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "ZeroAddress"
      );
    });

    it("rejects creator spoofing", async function () {
      const request =
        createRequest({
          creator:
            creator.address,
        });

      await expect(
        objectRegistry
          .connect(attacker)
          .registerObject(request)
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          ethers.ZeroHash
        );
    });

    it("rejects empty model URI", async function () {
      const request =
        createRequest({
          modelURI: "",
        });

      await expect(
        objectRegistry
          .connect(creator)
          .registerObject(request)
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "EmptyModelURI"
      );
    });

    it("rejects zero model hash", async function () {
      const request =
        createRequest({
          modelHash:
            ethers.ZeroHash,
        });

      await expect(
        objectRegistry
          .connect(creator)
          .registerObject(request)
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "EmptyModelHash"
      );
    });

    it("creates different Object IDs for repeated registrations", async function () {
      const first =
        await registerObject();

      const second =
        await registerObject();

      expect(
        first.objectId
      ).to.not.equal(
        second.objectId
      );

      expect(
        await objectRegistry.totalObjects()
      ).to.equal(2n);
    });
  });

  describe("Global enumeration", function () {
    it("enumerates registered objects", async function () {
      const first =
        await registerObject({
          modelURI:
            "ipfs://first.obj",

          modelHash:
            hashText("first"),
      });

      const second =
        await registerObject({
          modelURI:
            "ipfs://second.obj",

          modelHash:
            hashText("second"),
      });

      expect(
        await objectRegistry.totalObjects()
      ).to.equal(2n);

      expect(
        await objectRegistry.objectIdAt(
          0
        )
      ).to.equal(
        first.objectId
      );

      expect(
        await objectRegistry.objectIdAt(
          1
        )
      ).to.equal(
        second.objectId
      );
    });

    it("rejects invalid global index", async function () {
      await expect(
        objectRegistry.objectIdAt(
          0
        )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Creator enumeration", function () {
    it("tracks creator objects", async function () {
      const first =
        await registerObject({
          modelURI:
            "ipfs://first.obj",

          modelHash:
            hashText("first"),
      });

      const second =
        await registerObject({
          modelURI:
            "ipfs://second.obj",

          modelHash:
            hashText("second"),
      });

      expect(
        await objectRegistry.creatorObjectCount(
          creator.address
        )
      ).to.equal(2n);

      expect(
        await objectRegistry.creatorObjectIdAt(
          creator.address,
          0
        )
      ).to.equal(
        first.objectId
      );

      expect(
        await objectRegistry.creatorObjectIdAt(
          creator.address,
          1
        )
      ).to.equal(
        second.objectId
      );
    });

    it("keeps creator history after controller transfer", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .transferObjectController(
          objectId,
          newController.address
        );

      expect(
        await objectRegistry.creatorObjectCount(
          creator.address
        )
      ).to.equal(1n);

      expect(
        await objectRegistry.creatorObjectIdAt(
          creator.address,
          0
        )
      ).to.equal(objectId);
    });

    it("rejects invalid creator index", async function () {
      await expect(
        objectRegistry.creatorObjectIdAt(
          creator.address,
          0
        )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Controller enumeration", function () {
    it("tracks controller objects", async function () {
      const first =
        await registerObject({
          modelURI:
            "ipfs://first.obj",

          modelHash:
            hashText("first"),
      });

      const second =
        await registerObject({
          modelURI:
            "ipfs://second.obj",

          modelHash:
            hashText("second"),
      });

      expect(
        await objectRegistry.controllerObjectCount(
          controller.address
        )
      ).to.equal(2n);

      expect(
        await objectRegistry.controllerObjectIdAt(
          controller.address,
          0
        )
      ).to.equal(
        first.objectId
      );

      expect(
        await objectRegistry.controllerObjectIdAt(
          controller.address,
          1
        )
      ).to.equal(
        second.objectId
      );
    });

    it("updates controller enumeration after transfer", async function () {
      const first =
        await registerObject({
          modelURI:
            "ipfs://first.obj",

          modelHash:
            hashText("first"),
      });

      const second =
        await registerObject({
          modelURI:
            "ipfs://second.obj",

          modelHash:
            hashText("second"),
      });

      await objectRegistry
        .connect(controller)
        .transferObjectController(
          first.objectId,
          newController.address
        );

      expect(
        await objectRegistry.controllerObjectCount(
          controller.address
        )
      ).to.equal(1n);

      expect(
        await objectRegistry.controllerObjectCount(
          newController.address
        )
      ).to.equal(1n);

      expect(
        await objectRegistry.controllerObjectIdAt(
          newController.address,
          0
        )
      ).to.equal(
        first.objectId
      );

      expect(
        await objectRegistry.controllerObjectIdAt(
          controller.address,
          0
        )
      ).to.equal(
        second.objectId
      );
    });

    it("rejects invalid controller index", async function () {
      await expect(
        objectRegistry.controllerObjectIdAt(
          controller.address,
          0
        )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "InvalidIndex"
      );
    });
  });

  describe("Model updates", function () {
    it("allows controller to update model", async function () {
      const {
        objectId,
      } = await registerObject();

      const newURI =
        "ipfs://updated-model.glb";

      const newHash =
        hashText(
          "updated-model"
        );

      await objectRegistry
        .connect(controller)
        .updateModel(
          objectId,
          newURI,
          newHash,
          "GLB"
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.modelURI
      ).to.equal(newURI);

      expect(
        record.modelHash
      ).to.equal(newHash);

      expect(
        record.modelFormat
      ).to.equal("GLB");

      expect(
        record.updatedAt
      ).to.be.greaterThanOrEqual(
        record.createdAt
      );
    });

    it("emits ObjectModelUpdated", async function () {
      const {
        objectId,
      } = await registerObject();

      const newURI =
        "ipfs://updated.glb";

      const newHash =
        hashText(
          "updated"
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateModel(
            objectId,
            newURI,
            newHash,
            "GLB"
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectModelUpdated"
        )
        .withArgs(
          objectId,
          newHash,
          newURI,
          "GLB",
          controller.address
        );
    });

    it("does not automatically alter spectral fingerprint when model changes", async function () {
      const {
        objectId,
        request,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .updateModel(
          objectId,
          "ipfs://new.obj",
          hashText("new-model"),
          "OBJ"
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.spectralFingerprint
      ).to.equal(
        request.spectralFingerprint
      );

      expect(
        record.spectralAlgorithm
      ).to.equal(
        request.spectralAlgorithm
      );

      expect(
        record.spectralVersion
      ).to.equal(
        request.spectralVersion
      );
    });

    it("rejects unauthorized model update", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(attacker)
          .updateModel(
            objectId,
            "ipfs://bad.obj",
            hashText("bad"),
            "OBJ"
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });

    it("rejects empty updated model URI", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .updateModel(
            objectId,
            "",
            hashText("updated"),
            "OBJ"
          )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "EmptyModelURI"
      );
    });

    it("rejects zero updated model hash", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .updateModel(
            objectId,
            "ipfs://updated.obj",
            ethers.ZeroHash,
            "OBJ"
          )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "EmptyModelHash"
      );
    });
  });

  describe("Spectral fingerprint updates", function () {
    it("allows controller to update spectral fingerprint", async function () {
      const {
        objectId,
      } = await registerObject();

      const fingerprint =
        hashText(
          "new-spectral"
        );

      await objectRegistry
        .connect(controller)
        .updateSpectralFingerprint(
          objectId,
          fingerprint,
          "spectral3d",
          "asset-v2"
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.spectralFingerprint
      ).to.equal(
        fingerprint
      );

      expect(
        record.spectralAlgorithm
      ).to.equal(
        "spectral3d"
      );

      expect(
        record.spectralVersion
      ).to.equal(
        "asset-v2"
      );
    });

    it("emits ObjectSpectralFingerprintUpdated", async function () {
      const {
        objectId,
      } = await registerObject();

      const fingerprint =
        hashText(
          "new-spectral"
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateSpectralFingerprint(
            objectId,
            fingerprint,
            "spectral3d",
            "asset-v2"
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectSpectralFingerprintUpdated"
        )
        .withArgs(
          objectId,
          fingerprint,
          "spectral3d",
          "asset-v2",
          controller.address
        );
    });

    it("allows spectral fingerprint to be cleared", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .updateSpectralFingerprint(
          objectId,
          ethers.ZeroHash,
          "",
          ""
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.spectralFingerprint
      ).to.equal(
        ethers.ZeroHash
      );

      expect(
        record.spectralAlgorithm
      ).to.equal("");

      expect(
        record.spectralVersion
      ).to.equal("");
    });

    it("rejects unauthorized spectral update", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(attacker)
          .updateSpectralFingerprint(
            objectId,
            hashText("bad"),
            "spectral3d",
            "bad"
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });
  });

  describe("Metadata updates", function () {
    it("allows controller to update metadata", async function () {
      const {
        objectId,
      } = await registerObject();

      const uri =
        "ipfs://updated-metadata.json";

      const hash =
        hashText(
          "updated-metadata"
        );

      await objectRegistry
        .connect(controller)
        .updateMetadata(
          objectId,
          uri,
          hash
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.metadataURI
      ).to.equal(uri);

      expect(
        record.metadataHash
      ).to.equal(hash);
    });

    it("emits ObjectMetadataUpdated", async function () {
      const {
        objectId,
      } = await registerObject();

      const uri =
        "ipfs://updated-metadata.json";

      const hash =
        hashText(
          "updated-metadata"
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateMetadata(
            objectId,
            uri,
            hash
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectMetadataUpdated"
        )
        .withArgs(
          objectId,
          uri,
          hash,
          controller.address
        );
    });

    it("allows metadata to be cleared", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .updateMetadata(
          objectId,
          "",
          ethers.ZeroHash
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.metadataURI
      ).to.equal("");

      expect(
        record.metadataHash
      ).to.equal(
        ethers.ZeroHash
      );
    });

    it("rejects unauthorized metadata update", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(attacker)
          .updateMetadata(
            objectId,
            "ipfs://bad",
            hashText("bad")
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });
  });

  describe("Controller transfer", function () {
    it("transfers object controller", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .transferObjectController(
          objectId,
          newController.address
        );

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.controller
      ).to.equal(
        newController.address
      );
    });

    it("emits ObjectControllerTransferred", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .transferObjectController(
            objectId,
            newController.address
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectControllerTransferred"
        )
        .withArgs(
          objectId,
          controller.address,
          newController.address
        );
    });

    it("old controller loses authority after transfer", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .transferObjectController(
          objectId,
          newController.address
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateMetadata(
            objectId,
            "ipfs://old-controller",
            hashText("old")
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          controller.address,
          objectId
        );
    });

    it("new controller gains authority after transfer", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .transferObjectController(
          objectId,
          newController.address
        );

      await expect(
        objectRegistry
          .connect(newController)
          .updateMetadata(
            objectId,
            "ipfs://new-controller",
            hashText("new")
          )
      ).to.not.be.reverted;
    });

    it("rejects zero new controller", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .transferObjectController(
            objectId,
            ethers.ZeroAddress
          )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "ZeroAddress"
      );
    });

    it("rejects transfer to same controller", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .transferObjectController(
            objectId,
            controller.address
          )
      ).to.be.revertedWithCustomError(
        objectRegistry,
        "SameController"
      );
    });

    it("rejects unauthorized controller transfer", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(attacker)
          .transferObjectController(
            objectId,
            newController.address
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });
  });

  describe("Object activation", function () {
    it("deactivates an object without deleting it", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      expect(
        await objectRegistry.objectExists(
          objectId
        )
      ).to.equal(true);

      expect(
        await objectRegistry.isObjectActive(
          objectId
        )
      ).to.equal(false);

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.active
      ).to.equal(false);

      expect(
        await objectRegistry.totalObjects()
      ).to.equal(1n);
    });

    it("emits ObjectDeactivated", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .deactivateObject(
            objectId
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectDeactivated"
        )
        .withArgs(
          objectId,
          controller.address
        );
    });

    it("blocks updates while object is inactive", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateMetadata(
            objectId,
            "ipfs://blocked",
            hashText("blocked")
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectAlreadyInactive"
        )
        .withArgs(objectId);
    });

    it("rejects double deactivation", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await expect(
        objectRegistry
          .connect(controller)
          .deactivateObject(
            objectId
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectAlreadyInactive"
        )
        .withArgs(objectId);
    });

    it("reactivates an inactive object", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await objectRegistry
        .connect(controller)
        .reactivateObject(
          objectId
        );

      expect(
        await objectRegistry.isObjectActive(
          objectId
        )
      ).to.equal(true);

      const record =
        await objectRegistry.getObject(
          objectId
        );

      expect(
        record.active
      ).to.equal(true);
    });

    it("emits ObjectReactivated", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await expect(
        objectRegistry
          .connect(controller)
          .reactivateObject(
            objectId
          )
      )
        .to.emit(
          objectRegistry,
          "ObjectReactivated"
        )
        .withArgs(
          objectId,
          controller.address
        );
    });

    it("rejects reactivation of active object", async function () {
      const {
        objectId,
      } = await registerObject();

      await expect(
        objectRegistry
          .connect(controller)
          .reactivateObject(
            objectId
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectAlreadyActive"
        )
        .withArgs(objectId);
    });

    it("rejects reactivation by unauthorized account", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await expect(
        objectRegistry
          .connect(attacker)
          .reactivateObject(
            objectId
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "Unauthorized"
        )
        .withArgs(
          attacker.address,
          objectId
        );
    });

    it("allows updates again after reactivation", async function () {
      const {
        objectId,
      } = await registerObject();

      await objectRegistry
        .connect(controller)
        .deactivateObject(
          objectId
        );

      await objectRegistry
        .connect(controller)
        .reactivateObject(
          objectId
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateMetadata(
            objectId,
            "ipfs://reactivated",
            hashText("reactivated")
          )
      ).to.not.be.reverted;
    });
  });

  describe("Unknown objects", function () {
    it("returns false for unknown object existence", async function () {
      const unknownObjectId =
        hashText(
          "unknown-object"
        );

      expect(
        await objectRegistry.objectExists(
          unknownObjectId
        )
      ).to.equal(false);
    });

    it("returns false for unknown object activity", async function () {
      const unknownObjectId =
        hashText(
          "unknown-object"
        );

      expect(
        await objectRegistry.isObjectActive(
          unknownObjectId
        )
      ).to.equal(false);
    });

    it("rejects getObject for unknown object", async function () {
      const unknownObjectId =
        hashText(
          "unknown-object"
        );

      await expect(
        objectRegistry.getObject(
          unknownObjectId
        )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectNotFound"
        )
        .withArgs(
          unknownObjectId
        );
    });

    it("rejects update for unknown object", async function () {
      const unknownObjectId =
        hashText(
          "unknown-object"
        );

      await expect(
        objectRegistry
          .connect(controller)
          .updateMetadata(
            unknownObjectId,
            "ipfs://unknown",
            hashText("unknown")
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectNotFound"
        )
        .withArgs(
          unknownObjectId
        );
    });

    it("rejects reactivation for unknown object", async function () {
      const unknownObjectId =
        hashText(
          "unknown-object"
        );

      await expect(
        objectRegistry
          .connect(controller)
          .reactivateObject(
            unknownObjectId
          )
      )
        .to.be.revertedWithCustomError(
          objectRegistry,
          "ObjectNotFound"
        )
        .withArgs(
          unknownObjectId
        );
    });
  });

  describe("Multiple independent objects", function () {
    it("keeps records independent", async function () {
      const first =
        await registerObject({
          modelURI:
            "ipfs://object-a.obj",

          modelHash:
            hashText(
              "object-a"
            ),

          spectralFingerprint:
            hashText(
              "spectral-a"
            ),

          metadataURI:
            "ipfs://object-a.json",

          metadataHash:
            hashText(
              "metadata-a"
            ),
        });

      const second =
        await registerObject({
          modelURI:
            "ipfs://object-b.glb",

          modelHash:
            hashText(
              "object-b"
            ),

          modelFormat:
            "GLB",

          spectralFingerprint:
            hashText(
              "spectral-b"
            ),

          metadataURI:
            "ipfs://object-b.json",

          metadataHash:
            hashText(
              "metadata-b"
            ),
        });

      expect(
        first.objectId
      ).to.not.equal(
        second.objectId
      );

      const firstRecord =
        await objectRegistry.getObject(
          first.objectId
        );

      const secondRecord =
        await objectRegistry.getObject(
          second.objectId
        );

      expect(
        firstRecord.modelURI
      ).to.equal(
        "ipfs://object-a.obj"
      );

      expect(
        secondRecord.modelURI
      ).to.equal(
        "ipfs://object-b.glb"
      );

      expect(
        firstRecord.modelHash
      ).to.not.equal(
        secondRecord.modelHash
      );

      expect(
        firstRecord.spectralFingerprint
      ).to.not.equal(
        secondRecord.spectralFingerprint
      );

      expect(
        await objectRegistry.totalObjects()
      ).to.equal(2n);
    });
  });
});