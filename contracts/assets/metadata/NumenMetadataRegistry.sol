// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenMetadataRegistry
 * @notice Extensible metadata and custom-property layer
 *         for assets registered in the Numen Asset Protocol.
 *
 * @dev
 * This contract intentionally stores extended metadata separately
 * from ERC-20 / ERC-721 / ERC-1155 contracts.
 *
 * Benefits:
 *
 * - token contracts remain smaller,
 * - assets do not need redeployment when metadata capabilities grow,
 * - fungible and non-fungible assets can share the same property model,
 * - physical / 3D / RWA modules can later reference the same Asset ID,
 * - property history can be observed from events.
 *
 * IMPORTANT:
 *
 * Metadata stored here represents claims or descriptions associated
 * with an asset.
 *
 * A property such as:
 *
 *     origin = "Türkiye"
 *
 * does NOT mean that the Numen network independently verified the
 * physical origin of an object.
 *
 * Verification and attestations belong to separate protocol modules.
 */
contract NumenMetadataRegistry {
    // =============================================================
    //                            ERRORS
    // =============================================================

    error ZeroAddress();

    error EmptyKey();

    error EmptyValue();

    error AssetNotFound(
        bytes32 assetId
    );

    error AssetInactive(
        bytes32 assetId
    );

    error Unauthorized(
        address caller,
        bytes32 assetId
    );

    error PropertyNotFound(
        bytes32 assetId,
        bytes32 propertyId
    );

    error PropertyAlreadyExists(
        bytes32 assetId,
        bytes32 propertyId
    );

    error PropertyInactive(
        bytes32 assetId,
        bytes32 propertyId
    );

    error PropertyAlreadyActive(
        bytes32 assetId,
        bytes32 propertyId
    );

    error PropertyAlreadyInactive(
        bytes32 assetId,
        bytes32 propertyId
    );

    error InvalidIndex();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event PropertyCreated(
        bytes32 indexed assetId,
        bytes32 indexed propertyId,
        string key,
        NumenAssetTypes.PropertyValueType valueType,
        string unit,
        address indexed updatedBy
    );

    event PropertyUpdated(
        bytes32 indexed assetId,
        bytes32 indexed propertyId,
        NumenAssetTypes.PropertyValueType valueType,
        string unit,
        address indexed updatedBy
    );

    event PropertyDeactivated(
        bytes32 indexed assetId,
        bytes32 indexed propertyId,
        address indexed updatedBy
    );

    event PropertyReactivated(
        bytes32 indexed assetId,
        bytes32 indexed propertyId,
        address indexed updatedBy
    );

    // =============================================================
    //                            STRUCTS
    // =============================================================

    /**
     * @notice Canonical stored custom property.
     *
     * @dev
     * `value` is ABI encoded according to `valueType`.
     *
     * Expected encoding:
     *
     * TEXT    -> abi.encode(string)
     * INTEGER -> abi.encode(int256)
     * DECIMAL -> abi.encode(string)
     * BOOLEAN -> abi.encode(bool)
     * DATE    -> abi.encode(uint256)
     * URI     -> abi.encode(string)
     * HASH    -> abi.encode(bytes32)
     * ADDRESS -> abi.encode(address)
     * BYTES   -> abi.encode(bytes)
     *
     * DECIMAL intentionally uses a string representation so that
     * domain-specific precision is not silently lost.
     *
     * Examples:
     *
     * "2.40"
     * "0.000001"
     * "999999999999.123456789"
     *
     * The optional unit field carries semantic units such as:
     *
     * "ct"
     * "kg"
     * "m2"
     * "mm"
     * "USD"
     */
    struct StoredProperty {
        bytes32 propertyId;
        string key;
        NumenAssetTypes.PropertyValueType valueType;
        bytes value;
        string unit;
        uint64 createdAt;
        uint64 updatedAt;
        bool active;
    }

    // =============================================================
    //                          IMMUTABLES
    // =============================================================

    INumenAssetRegistry
        public immutable assetRegistry;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant
        _METADATA_REGISTRY_VERSION =
        keccak256(
            "NUMEN_METADATA_REGISTRY_V1"
        );

    // =============================================================
    //                           STORAGE
    // =============================================================

    mapping(
        bytes32 =>
            mapping(
                bytes32 =>
                    StoredProperty
            )
    )
        private _properties;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _propertyIds;

    mapping(
        bytes32 =>
            mapping(
                bytes32 =>
                    bool
            )
    )
        private _propertyExists;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        address assetRegistry_
    ) {
        if (
            assetRegistry_ ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        assetRegistry =
            INumenAssetRegistry(
                assetRegistry_
            );
    }

    // =============================================================
    //                           VERSION
    // =============================================================

    function metadataRegistryVersion()
        external
        pure
        returns (bytes32)
    {
        return
            _METADATA_REGISTRY_VERSION;
    }

    // =============================================================
    //                       PROPERTY CREATION
    // =============================================================

    /**
     * @notice Adds a new custom property to an asset.
     *
     * @dev
     * Only the current controller recorded in
     * NumenAssetRegistry may modify asset metadata.
     *
     * propertyId is deterministic per asset and key:
     *
     * keccak256(abi.encode(assetId, keccak256(bytes(key))))
     *
     * Therefore a single asset cannot create duplicate properties
     * using the exact same key.
     */
    function createProperty(
        bytes32 assetId,
        string calldata key,
        NumenAssetTypes.PropertyValueType valueType,
        bytes calldata value,
        string calldata unit
    )
        external
        returns (
            bytes32 propertyId
        )
    {
        _requireController(
            assetId
        );

        if (
            bytes(key).length ==
            0
        ) {
            revert EmptyKey();
        }

        if (
            value.length ==
            0
        ) {
            revert EmptyValue();
        }

        propertyId =
            getPropertyId(
                assetId,
                key
            );

        if (
            _propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            revert PropertyAlreadyExists(
                assetId,
                propertyId
            );
        }

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        _properties[
            assetId
        ][
            propertyId
        ] =
            StoredProperty({
                propertyId:
                    propertyId,

                key:
                    key,

                valueType:
                    valueType,

                value:
                    value,

                unit:
                    unit,

                createdAt:
                    timestamp,

                updatedAt:
                    timestamp,

                active:
                    true
            });

        _propertyExists[
            assetId
        ][
            propertyId
        ] =
            true;

        _propertyIds[
            assetId
        ].push(
            propertyId
        );

        emit PropertyCreated(
            assetId,
            propertyId,
            key,
            valueType,
            unit,
            msg.sender
        );
    }

    // =============================================================
    //                       PROPERTY UPDATE
    // =============================================================

    /**
     * @notice Updates an existing active property.
     *
     * @dev
     * The property key and propertyId remain immutable.
     *
     * The following may change:
     *
     * - value type
     * - value
     * - unit
     */
    function updateProperty(
        bytes32 assetId,
        bytes32 propertyId,
        NumenAssetTypes.PropertyValueType valueType,
        bytes calldata value,
        string calldata unit
    )
        external
    {
        _requireController(
            assetId
        );

        if (
            !_propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            revert PropertyNotFound(
                assetId,
                propertyId
            );
        }

        StoredProperty
            storage property =
            _properties[
                assetId
            ][
                propertyId
            ];

        if (
            !property.active
        ) {
            revert PropertyInactive(
                assetId,
                propertyId
            );
        }

        if (
            value.length ==
            0
        ) {
            revert EmptyValue();
        }

        property.valueType =
            valueType;

        property.value =
            value;

        property.unit =
            unit;

        property.updatedAt =
            uint64(
                block.timestamp
            );

        emit PropertyUpdated(
            assetId,
            propertyId,
            valueType,
            unit,
            msg.sender
        );
    }

    // =============================================================
    //                     PROPERTY ACTIVATION
    // =============================================================

    /**
     * @notice Deactivates a property without deleting history.
     */
    function deactivateProperty(
        bytes32 assetId,
        bytes32 propertyId
    )
        external
    {
        _requireController(
            assetId
        );

        if (
            !_propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            revert PropertyNotFound(
                assetId,
                propertyId
            );
        }

        StoredProperty
            storage property =
            _properties[
                assetId
            ][
                propertyId
            ];

        if (
            !property.active
        ) {
            revert PropertyAlreadyInactive(
                assetId,
                propertyId
            );
        }

        property.active =
            false;

        property.updatedAt =
            uint64(
                block.timestamp
            );

        emit PropertyDeactivated(
            assetId,
            propertyId,
            msg.sender
        );
    }

    /**
     * @notice Reactivates a previously deactivated property.
     */
    function reactivateProperty(
        bytes32 assetId,
        bytes32 propertyId
    )
        external
    {
        _requireController(
            assetId
        );

        if (
            !_propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            revert PropertyNotFound(
                assetId,
                propertyId
            );
        }

        StoredProperty
            storage property =
            _properties[
                assetId
            ][
                propertyId
            ];

        if (
            property.active
        ) {
            revert PropertyAlreadyActive(
                assetId,
                propertyId
            );
        }

        property.active =
            true;

        property.updatedAt =
            uint64(
                block.timestamp
            );

        emit PropertyReactivated(
            assetId,
            propertyId,
            msg.sender
        );
    }

    // =============================================================
    //                        PROPERTY READS
    // =============================================================

    /**
     * @notice Returns whether a property has ever been created.
     */
    function propertyExists(
        bytes32 assetId,
        bytes32 propertyId
    )
        external
        view
        returns (bool)
    {
        return
            _propertyExists[
                assetId
            ][
                propertyId
            ];
    }

    /**
     * @notice Returns whether a property currently exists
     *         and is active.
     */
    function isPropertyActive(
        bytes32 assetId,
        bytes32 propertyId
    )
        external
        view
        returns (bool)
    {
        if (
            !_propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            return false;
        }

        return
            _properties[
                assetId
            ][
                propertyId
            ].active;
    }

    /**
     * @notice Returns a property.
     */
    function getProperty(
        bytes32 assetId,
        bytes32 propertyId
    )
        external
        view
        returns (
            StoredProperty memory
        )
    {
        if (
            !_propertyExists[
                assetId
            ][
                propertyId
            ]
        ) {
            revert PropertyNotFound(
                assetId,
                propertyId
            );
        }

        return
            _properties[
                assetId
            ][
                propertyId
            ];
    }

    /**
     * @notice Returns the number of properties ever created
     *         for an asset.
     *
     * @dev
     * Deactivated properties remain included because protocol
     * history is intentionally preserved.
     */
    function propertyCount(
        bytes32 assetId
    )
        external
        view
        returns (uint256)
    {
        return
            _propertyIds[
                assetId
            ].length;
    }

    /**
     * @notice Returns a property ID by asset-specific index.
     */
    function propertyIdAt(
        bytes32 assetId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _propertyIds[
                assetId
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _propertyIds[
                assetId
            ][
                index
            ];
    }

    /**
     * @notice Returns all property IDs associated with an asset.
     *
     * @dev
     * Primarily intended for off-chain reads.
     * Large production datasets should be indexed from events.
     */
    function propertyIds(
        bytes32 assetId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _propertyIds[
                assetId
            ];
    }

    // =============================================================
    //                     PROPERTY IDENTIFIER
    // =============================================================

    /**
     * @notice Computes the deterministic property ID for an
     *         asset/key combination.
     *
     * @dev
     * Keys are case-sensitive.
     *
     * "Weight" and "weight" are different properties.
     *
     * Frontends should therefore normalize predefined property
     * names when consistent semantics are desired.
     */
    function getPropertyId(
        bytes32 assetId,
        string memory key
    )
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    assetId,
                    keccak256(
                        bytes(key)
                    )
                )
            );
    }

    // =============================================================
    //                    AUTHORIZATION HELPERS
    // =============================================================

    /**
     * @dev
     * Ensures:
     *
     * 1. asset exists,
     * 2. asset is active,
     * 3. caller is current registry controller.
     *
     * Controller authority is read dynamically from
     * NumenAssetRegistry.
     *
     * Therefore if registry control is transferred, metadata
     * authority automatically follows the new controller without
     * requiring synchronization in this contract.
     */
    function _requireController(
        bytes32 assetId
    )
        internal
        view
    {
        if (
            !assetRegistry.assetExists(
                assetId
            )
        ) {
            revert AssetNotFound(
                assetId
            );
        }

        if (
            !assetRegistry.isAssetActive(
                assetId
            )
        ) {
            revert AssetInactive(
                assetId
            );
        }

        INumenAssetRegistry.AssetRecord
            memory record =
            assetRegistry.getAsset(
                assetId
            );

        if (
            record.controller !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                assetId
            );
        }
    }
}