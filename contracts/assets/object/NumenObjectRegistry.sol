// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenObjectRegistry
 * @notice Registry for digital / physical object references,
 *         3D models and optional spectral fingerprints used by
 *         the Numen Asset Protocol.
 *
 * @dev
 * IMPORTANT SEMANTIC BOUNDARY
 * -------------------------------------------------------------
 *
 * A Numen Object record is a technical record associated with
 * an object representation.
 *
 * Registration does NOT mean:
 *
 * - Numen verified that a physical object exists,
 * - Numen verified legal ownership,
 * - Numen verified authenticity,
 * - Numen verified manufacturer origin,
 * - Numen verified that a 3D model corresponds to a physical item.
 *
 * Those claims require separate attestation / document /
 * provenance mechanisms.
 *
 * SPECTRAL FINGERPRINT BOUNDARY
 * -------------------------------------------------------------
 *
 * spectralFingerprint in this registry is asset/object metadata.
 *
 * It is NOT:
 *
 * - a PoScan mining work hash,
 * - consensus state used to validate PoScan work,
 * - proof of physical authenticity.
 *
 * PoScan consensus and Asset/Object identity remain separate
 * protocol namespaces.
 */
contract NumenObjectRegistry {
    // =============================================================
    //                            ERRORS
    // =============================================================

    error ZeroAddress();

    error EmptyModelURI();

    error EmptyModelHash();

    error ObjectNotFound(
        bytes32 objectId
    );

    error ObjectAlreadyActive(
        bytes32 objectId
    );

    error ObjectAlreadyInactive(
        bytes32 objectId
    );

    error Unauthorized(
        address caller,
        bytes32 objectId
    );

    error SameController();

    error InvalidIndex();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event ObjectRegistered(
        bytes32 indexed objectId,
        address indexed creator,
        address indexed controller,
        bytes32 modelHash,
        string modelURI,
        string modelFormat
    );

    event ObjectModelUpdated(
        bytes32 indexed objectId,
        bytes32 modelHash,
        string modelURI,
        string modelFormat,
        address indexed updatedBy
    );

    event ObjectSpectralFingerprintUpdated(
        bytes32 indexed objectId,
        bytes32 spectralFingerprint,
        string spectralAlgorithm,
        string spectralVersion,
        address indexed updatedBy
    );

    event ObjectMetadataUpdated(
        bytes32 indexed objectId,
        string metadataURI,
        bytes32 metadataHash,
        address indexed updatedBy
    );

    event ObjectControllerTransferred(
        bytes32 indexed objectId,
        address indexed previousController,
        address indexed newController
    );

    event ObjectDeactivated(
        bytes32 indexed objectId,
        address indexed updatedBy
    );

    event ObjectReactivated(
        bytes32 indexed objectId,
        address indexed updatedBy
    );

    // =============================================================
    //                            STRUCTS
    // =============================================================

    /**
     * @notice Request used when registering a new object.
     *
     * @dev
     * creator must equal msg.sender.
     *
     * controller may be a different address such as:
     *
     * - multisig,
     * - DAO,
     * - operational wallet.
     */
    struct RegisterObjectRequest {
        address creator;
        address controller;

        string modelURI;
        bytes32 modelHash;
        string modelFormat;

        bytes32 spectralFingerprint;
        string spectralAlgorithm;
        string spectralVersion;

        string metadataURI;
        bytes32 metadataHash;
    }

    /**
     * @notice Canonical object record.
     *
     * @dev
     * modelHash identifies the referenced model bytes.
     *
     * spectralFingerprint is optional. bytes32(0) means no
     * fingerprint is currently attached.
     *
     * Neither value constitutes physical authenticity proof.
     */
    struct ObjectRecord {
        bytes32 objectId;

        address creator;
        address controller;

        string modelURI;
        bytes32 modelHash;
        string modelFormat;

        bytes32 spectralFingerprint;
        string spectralAlgorithm;
        string spectralVersion;

        string metadataURI;
        bytes32 metadataHash;

        uint64 createdAt;
        uint64 updatedAt;

        bool active;
    }

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant
        _OBJECT_REGISTRY_VERSION =
        keccak256(
            "NUMEN_OBJECT_REGISTRY_V1"
        );

    // =============================================================
    //                           STORAGE
    // =============================================================

    uint256 private _registrationNonce;

    mapping(
        bytes32 =>
            ObjectRecord
    )
        private _objects;

    mapping(
        bytes32 =>
            bool
    )
        private _objectExists;

    bytes32[]
        private _allObjectIds;

    mapping(
        address =>
            bytes32[]
    )
        private _creatorObjectIds;

    mapping(
        address =>
            bytes32[]
    )
        private _controllerObjectIds;

    mapping(
        bytes32 =>
            uint256
    )
        private _controllerObjectIndex;

    // =============================================================
    //                           VERSION
    // =============================================================

    function objectRegistryVersion()
        external
        pure
        returns (bytes32)
    {
        return
            _OBJECT_REGISTRY_VERSION;
    }

    // =============================================================
    //                      OBJECT REGISTRATION
    // =============================================================

    /**
     * @notice Registers a new object representation.
     *
     * @dev
     * Creator attribution is protected by requiring:
     *
     *     request.creator == msg.sender
     *
     * This proves only that the creator address initiated the
     * registration transaction.
     *
     * It does NOT prove the real-world identity of the caller or
     * authenticity of any physical object.
     */
    function registerObject(
        RegisterObjectRequest calldata request
    )
        external
        returns (
            bytes32 objectId
        )
    {
        if (
            request.creator ==
            address(0) ||
            request.controller ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            request.creator !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                bytes32(0)
            );
        }

        if (
            bytes(
                request.modelURI
            ).length ==
            0
        ) {
            revert EmptyModelURI();
        }

        if (
            request.modelHash ==
            bytes32(0)
        ) {
            revert EmptyModelHash();
        }

        unchecked {
            ++_registrationNonce;
        }

        objectId =
            keccak256(
                abi.encode(
                    block.chainid,
                    address(this),
                    request.creator,
                    request.modelHash,
                    _registrationNonce
                )
            );

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        _objects[
            objectId
        ] =
            ObjectRecord({
                objectId:
                    objectId,

                creator:
                    request.creator,

                controller:
                    request.controller,

                modelURI:
                    request.modelURI,

                modelHash:
                    request.modelHash,

                modelFormat:
                    request.modelFormat,

                spectralFingerprint:
                    request
                        .spectralFingerprint,

                spectralAlgorithm:
                    request
                        .spectralAlgorithm,

                spectralVersion:
                    request
                        .spectralVersion,

                metadataURI:
                    request.metadataURI,

                metadataHash:
                    request.metadataHash,

                createdAt:
                    timestamp,

                updatedAt:
                    timestamp,

                active:
                    true
            });

        _objectExists[
            objectId
        ] =
            true;

        _allObjectIds.push(
            objectId
        );

        _creatorObjectIds[
            request.creator
        ].push(
            objectId
        );

        _controllerObjectIndex[
            objectId
        ] =
            _controllerObjectIds[
                request.controller
            ].length;

        _controllerObjectIds[
            request.controller
        ].push(
            objectId
        );

        emit ObjectRegistered(
            objectId,
            request.creator,
            request.controller,
            request.modelHash,
            request.modelURI,
            request.modelFormat
        );
    }

    // =============================================================
    //                         MODEL UPDATE
    // =============================================================

    /**
     * @notice Updates the referenced 3D/digital model.
     *
     * @dev
     * Updating the model does not automatically update or clear
     * the spectral fingerprint.
     *
     * The controller must explicitly update the spectral
     * fingerprint when appropriate.
     *
     * This prevents the registry from pretending that it can
     * derive or verify spectral information on-chain.
     */
    function updateModel(
        bytes32 objectId,
        string calldata modelURI,
        bytes32 modelHash,
        string calldata modelFormat
    )
        external
    {
        _requireController(
            objectId
        );

        if (
            bytes(
                modelURI
            ).length ==
            0
        ) {
            revert EmptyModelURI();
        }

        if (
            modelHash ==
            bytes32(0)
        ) {
            revert EmptyModelHash();
        }

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        record.modelURI =
            modelURI;

        record.modelHash =
            modelHash;

        record.modelFormat =
            modelFormat;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit ObjectModelUpdated(
            objectId,
            modelHash,
            modelURI,
            modelFormat,
            msg.sender
        );
    }

    // =============================================================
    //                    SPECTRAL FINGERPRINT
    // =============================================================

    /**
     * @notice Sets or replaces the optional object spectral
     *         fingerprint.
     *
     * @dev
     * bytes32(0) may be used to clear the current fingerprint.
     *
     * spectralAlgorithm and spectralVersion describe how the
     * off-chain fingerprint was generated.
     *
     * Example:
     *
     * algorithm = "spectral3d"
     * version   = "asset-v1"
     *
     * This value MUST NOT be interpreted as the PoScan mining
     * work hash.
     */
    function updateSpectralFingerprint(
        bytes32 objectId,
        bytes32 spectralFingerprint,
        string calldata spectralAlgorithm,
        string calldata spectralVersion
    )
        external
    {
        _requireController(
            objectId
        );

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        record.spectralFingerprint =
            spectralFingerprint;

        record.spectralAlgorithm =
            spectralAlgorithm;

        record.spectralVersion =
            spectralVersion;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit ObjectSpectralFingerprintUpdated(
            objectId,
            spectralFingerprint,
            spectralAlgorithm,
            spectralVersion,
            msg.sender
        );
    }

    // =============================================================
    //                       METADATA UPDATE
    // =============================================================

    /**
     * @notice Updates optional object-level metadata.
     *
     * @dev
     * Metadata represents descriptive information or claims.
     * It is not automatically verified by the Numen network.
     */
    function updateMetadata(
        bytes32 objectId,
        string calldata metadataURI,
        bytes32 metadataHash
    )
        external
    {
        _requireController(
            objectId
        );

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        record.metadataURI =
            metadataURI;

        record.metadataHash =
            metadataHash;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit ObjectMetadataUpdated(
            objectId,
            metadataURI,
            metadataHash,
            msg.sender
        );
    }

    // =============================================================
    //                    CONTROLLER TRANSFER
    // =============================================================

    /**
     * @notice Transfers control of an object record.
     *
     * @dev
     * This changes protocol-level control of the object record.
     *
     * It does NOT itself prove or transfer legal ownership of a
     * physical object.
     */
    function transferObjectController(
        bytes32 objectId,
        address newController
    )
        external
    {
        _requireController(
            objectId
        );

        if (
            newController ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        address previousController =
            record.controller;

        if (
            previousController ==
            newController
        ) {
            revert SameController();
        }

        _removeControllerObject(
            previousController,
            objectId
        );

        record.controller =
            newController;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        _controllerObjectIndex[
            objectId
        ] =
            _controllerObjectIds[
                newController
            ].length;

        _controllerObjectIds[
            newController
        ].push(
            objectId
        );

        emit ObjectControllerTransferred(
            objectId,
            previousController,
            newController
        );
    }

    // =============================================================
    //                     ACTIVE / INACTIVE
    // =============================================================

    /**
     * @notice Deactivates an object record without deleting history.
     */
    function deactivateObject(
        bytes32 objectId
    )
        external
    {
        _requireController(
            objectId
        );

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        if (
            !record.active
        ) {
            revert ObjectAlreadyInactive(
                objectId
            );
        }

        record.active =
            false;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit ObjectDeactivated(
            objectId,
            msg.sender
        );
    }

    /**
     * @notice Reactivates a previously deactivated object.
     *
     * @dev
     * Reactivation must perform authorization separately because
     * _requireController() intentionally rejects inactive records.
     */
    function reactivateObject(
        bytes32 objectId
    )
        external
    {
        if (
            !_objectExists[
                objectId
            ]
        ) {
            revert ObjectNotFound(
                objectId
            );
        }

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        if (
            record.controller !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                objectId
            );
        }

        if (
            record.active
        ) {
            revert ObjectAlreadyActive(
                objectId
            );
        }

        record.active =
            true;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit ObjectReactivated(
            objectId,
            msg.sender
        );
    }

    // =============================================================
    //                           READS
    // =============================================================

    function objectExists(
        bytes32 objectId
    )
        external
        view
        returns (bool)
    {
        return
            _objectExists[
                objectId
            ];
    }

    function isObjectActive(
        bytes32 objectId
    )
        external
        view
        returns (bool)
    {
        if (
            !_objectExists[
                objectId
            ]
        ) {
            return false;
        }

        return
            _objects[
                objectId
            ].active;
    }

    function getObject(
        bytes32 objectId
    )
        external
        view
        returns (
            ObjectRecord memory
        )
    {
        if (
            !_objectExists[
                objectId
            ]
        ) {
            revert ObjectNotFound(
                objectId
            );
        }

        return
            _objects[
                objectId
            ];
    }

    // =============================================================
    //                      GLOBAL ENUMERATION
    // =============================================================

    function totalObjects()
        external
        view
        returns (uint256)
    {
        return
            _allObjectIds.length;
    }

    function objectIdAt(
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _allObjectIds.length
        ) {
            revert InvalidIndex();
        }

        return
            _allObjectIds[
                index
            ];
    }

    // =============================================================
    //                      CREATOR ENUMERATION
    // =============================================================

    function creatorObjectCount(
        address creator
    )
        external
        view
        returns (uint256)
    {
        return
            _creatorObjectIds[
                creator
            ].length;
    }

    function creatorObjectIdAt(
        address creator,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _creatorObjectIds[
                creator
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _creatorObjectIds[
                creator
            ][
                index
            ];
    }

    // =============================================================
    //                     CONTROLLER ENUMERATION
    // =============================================================

    function controllerObjectCount(
        address controller
    )
        external
        view
        returns (uint256)
    {
        return
            _controllerObjectIds[
                controller
            ].length;
    }

    function controllerObjectIdAt(
        address controller,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _controllerObjectIds[
                controller
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _controllerObjectIds[
                controller
            ][
                index
            ];
    }

    // =============================================================
    //                     INTERNAL AUTHORIZATION
    // =============================================================

    function _requireController(
        bytes32 objectId
    )
        internal
        view
    {
        if (
            !_objectExists[
                objectId
            ]
        ) {
            revert ObjectNotFound(
                objectId
            );
        }

        ObjectRecord
            storage record =
            _objects[
                objectId
            ];

        if (
            !record.active
        ) {
            revert ObjectAlreadyInactive(
                objectId
            );
        }

        if (
            record.controller !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                objectId
            );
        }
    }

    // =============================================================
    //                  INTERNAL ENUMERATION
    // =============================================================

    /**
     * @dev Removes an object from a controller-specific list using
     * swap-and-pop.
     *
     * Global and creator history are intentionally never removed.
     */
    function _removeControllerObject(
        address controller,
        bytes32 objectId
    )
        internal
    {
        uint256 index =
            _controllerObjectIndex[
                objectId
            ];

        uint256 lastIndex =
            _controllerObjectIds[
                controller
            ].length - 1;

        if (
            index !=
            lastIndex
        ) {
            bytes32 lastObjectId =
                _controllerObjectIds[
                    controller
                ][
                    lastIndex
                ];

            _controllerObjectIds[
                controller
            ][
                index
            ] =
                lastObjectId;

            _controllerObjectIndex[
                lastObjectId
            ] =
                index;
        }

        _controllerObjectIds[
            controller
        ].pop();

        delete
            _controllerObjectIndex[
                objectId
            ];
    }
}