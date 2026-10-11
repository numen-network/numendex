// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenAssetRegistry
 * @notice Canonical asset discovery and identity registry for the
 *         Numen Asset Protocol.
 *
 * Canonical registration is self-registration:
 *
 *     msg.sender == request.assetContract
 *
 * Canonical scoped identity:
 *
 *     assetContract + scope + tokenId
 *
 * Registration does not prove physical authenticity, legal ownership,
 * regulatory compliance, provenance, issuer legitimacy or metadata
 * correctness.
 *
 * Controller transfers use a two-step propose/accept process.
 *
 * Inactive assets preserve their historical registry record but
 * mutable metadata and classification updates are locked until the
 * asset is reactivated.
 */
contract NumenAssetRegistry is INumenAssetRegistry {
    // =============================================================
    // ERRORS
    // =============================================================

    error ZeroAddress();

    error InvalidAssetContract();

    error InvalidAssetClass();

    error InvalidAssetStandard();

    error InvalidClassStandardCombination();

    error InvalidAssetScope();

    error InvalidScopeTokenCombination();

    error UnauthorizedAssetRegistration(
        address caller,
        address assetContract
    );

    error AssetAlreadyRegistered(
        address assetContract,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId
    );

    error AssetNotFound(
        bytes32 assetId
    );

    error AssetAlreadyActive(
        bytes32 assetId
    );

    error AssetAlreadyInactive(
        bytes32 assetId
    );

    error AssetInactive(
        bytes32 assetId
    );

    error Unauthorized(
        bytes32 assetId,
        address caller
    );

    error InvalidIndex(
        uint256 index,
        uint256 length
    );

    error SameController();

    error NoPendingControllerTransfer(
        bytes32 assetId
    );

    error UnauthorizedPendingController(
        bytes32 assetId,
        address caller,
        address expectedController
    );

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 private constant _REGISTRY_VERSION =
        keccak256(
            "NUMEN_ASSET_REGISTRY_V2"
        );

    // =============================================================
    // STORAGE
    // =============================================================

    uint256 private _registrationNonce;

    mapping(bytes32 => AssetRecord)
        private _assets;

    mapping(bytes32 => bool)
        private _assetExists;

    mapping(
        address =>
            mapping(
                NumenAssetTypes.AssetScope =>
                    mapping(
                        uint256 => bytes32
                    )
            )
    )
        private _assetIdsByIdentity;

    bytes32[] private _allAssetIds;

    mapping(address => bytes32[])
        private _creatorAssetIds;

    mapping(address => bytes32[])
        private _controllerAssetIds;

    mapping(bytes32 => uint256)
        private _controllerAssetIndexes;

    mapping(bytes32 => address)
        private _pendingAssetControllers;

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier onlyExistingAsset(
        bytes32 assetId
    ) {
        if (!_assetExists[assetId]) {
            revert AssetNotFound(
                assetId
            );
        }

        _;
    }

    modifier onlyAssetController(
        bytes32 assetId
    ) {
        if (!_assetExists[assetId]) {
            revert AssetNotFound(
                assetId
            );
        }

        if (
            _assets[assetId]
                .controller !=
            msg.sender
        ) {
            revert Unauthorized(
                assetId,
                msg.sender
            );
        }

        _;
    }

    modifier onlyActiveAsset(
        bytes32 assetId
    ) {
        if (!_assetExists[assetId]) {
            revert AssetNotFound(
                assetId
            );
        }

        if (
            !_assets[
                assetId
            ].active
        ) {
            revert AssetInactive(
                assetId
            );
        }

        _;
    }

    // =============================================================
    // PROTOCOL INFORMATION
    // =============================================================

    function registryVersion()
        external
        pure
        override
        returns (bytes32)
    {
        return _REGISTRY_VERSION;
    }

    // =============================================================
    // REGISTRATION
    // =============================================================

    function registerAsset(
        RegisterAssetRequest calldata request
    )
        external
        override
        returns (
            bytes32 assetId
        )
    {
        _validateRegistrationRequest(
            request
        );

        if (
            msg.sender !=
            request.assetContract
        ) {
            revert UnauthorizedAssetRegistration(
                msg.sender,
                request.assetContract
            );
        }

        if (
            _assetIdsByIdentity[
                request.assetContract
            ][
                request.scope
            ][
                request.tokenId
            ] != bytes32(0)
        ) {
            revert AssetAlreadyRegistered(
                request.assetContract,
                request.scope,
                request.tokenId
            );
        }

        unchecked {
            ++_registrationNonce;
        }

        assetId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                request.assetContract,
                request.scope,
                request.tokenId,
                request.creator,
                _registrationNonce
            )
        );

        assert(
            assetId !=
            bytes32(0)
        );

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        AssetRecord storage record =
            _assets[
                assetId
            ];

        record.assetId =
            assetId;

        record.assetClass =
            request.assetClass;

        record.standard =
            request.standard;

        record.scope =
            request.scope;

        record.category =
            request.category;

        record.representation =
            request.representation;

        record.assetContract =
            request.assetContract;

        record.tokenId =
            request.tokenId;

        record.creator =
            request.creator;

        record.controller =
            request.controller;

        record.metadataURI =
            request.metadataURI;

        record.metadataHash =
            request.metadataHash;

        record.createdAt =
            timestamp;

        record.updatedAt =
            timestamp;

        record.active =
            true;

        _assetExists[
            assetId
        ] = true;

        _assetIdsByIdentity[
            request.assetContract
        ][
            request.scope
        ][
            request.tokenId
        ] = assetId;

        _allAssetIds.push(
            assetId
        );

        _creatorAssetIds[
            request.creator
        ].push(
            assetId
        );

        _addControllerAsset(
            request.controller,
            assetId
        );

        emit AssetRegistered(
            assetId,
            request.assetContract,
            request.creator,
            request.scope,
            request.tokenId,
            request.assetClass,
            request.standard,
            request.category,
            request.representation
        );
    }

    // =============================================================
    // LOOKUPS
    // =============================================================

    function assetExists(
        bytes32 assetId
    )
        external
        view
        override
        returns (bool)
    {
        return
            _assetExists[
                assetId
            ];
    }

    function isAssetActive(
        bytes32 assetId
    )
        external
        view
        override
        returns (bool)
    {
        if (
            !_assetExists[
                assetId
            ]
        ) {
            return false;
        }

        return
            _assets[
                assetId
            ].active;
    }

    function getAsset(
        bytes32 assetId
    )
        external
        view
        override
        onlyExistingAsset(
            assetId
        )
        returns (
            AssetRecord memory
        )
    {
        return
            _assets[
                assetId
            ];
    }

    function getAssetId(
        address assetContract,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId
    )
        external
        view
        override
        returns (
            bytes32
        )
    {
        return
            _assetIdsByIdentity[
                assetContract
            ][
                scope
            ][
                tokenId
            ];
    }

    function isRegisteredAsset(
        address assetContract,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId
    )
        external
        view
        override
        returns (bool)
    {
        return (
            _assetIdsByIdentity[
                assetContract
            ][
                scope
            ][
                tokenId
            ] !=
            bytes32(0)
        );
    }

    // =============================================================
    // COUNTERS
    // =============================================================

    function totalAssets()
        external
        view
        override
        returns (
            uint256
        )
    {
        return
            _allAssetIds.length;
    }

    function assetIdAt(
        uint256 index
    )
        external
        view
        override
        returns (
            bytes32
        )
    {
        uint256 length =
            _allAssetIds.length;

        if (
            index >= length
        ) {
            revert InvalidIndex(
                index,
                length
            );
        }

        return
            _allAssetIds[
                index
            ];
    }

    // =============================================================
    // CREATOR INDEX
    // =============================================================

    function creatorAssetCount(
        address creator
    )
        external
        view
        override
        returns (
            uint256
        )
    {
        return
            _creatorAssetIds[
                creator
            ].length;
    }

    function creatorAssetIdAt(
        address creator,
        uint256 index
    )
        external
        view
        override
        returns (
            bytes32
        )
    {
        uint256 length =
            _creatorAssetIds[
                creator
            ].length;

        if (
            index >= length
        ) {
            revert InvalidIndex(
                index,
                length
            );
        }

        return
            _creatorAssetIds[
                creator
            ][
                index
            ];
    }

    // =============================================================
    // CONTROLLER INDEX
    // =============================================================

    function controllerAssetCount(
        address controller
    )
        external
        view
        override
        returns (
            uint256
        )
    {
        return
            _controllerAssetIds[
                controller
            ].length;
    }

    function controllerAssetIdAt(
        address controller,
        uint256 index
    )
        external
        view
        override
        returns (
            bytes32
        )
    {
        uint256 length =
            _controllerAssetIds[
                controller
            ].length;

        if (
            index >= length
        ) {
            revert InvalidIndex(
                index,
                length
            );
        }

        return
            _controllerAssetIds[
                controller
            ][
                index
            ];
    }

    // =============================================================
    // CLASSIFICATION
    // =============================================================

    function updateClassification(
        bytes32 assetId,
        NumenAssetTypes.AssetCategory
            category,
        NumenAssetTypes.RepresentationType
            representation
    )
        external
        override
        onlyAssetController(
            assetId
        )
        onlyActiveAsset(
            assetId
        )
    {
        AssetRecord storage record =
            _assets[
                assetId
            ];

        record.category =
            category;

        record.representation =
            representation;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit AssetClassificationUpdated(
            assetId,
            category,
            representation,
            msg.sender
        );
    }

    // =============================================================
    // METADATA
    // =============================================================

    function updateMetadata(
        bytes32 assetId,
        string calldata metadataURI,
        bytes32 metadataHash
    )
        external
        override
        onlyAssetController(
            assetId
        )
        onlyActiveAsset(
            assetId
        )
    {
        AssetRecord storage record =
            _assets[
                assetId
            ];

        record.metadataURI =
            metadataURI;

        record.metadataHash =
            metadataHash;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit AssetMetadataUpdated(
            assetId,
            metadataURI,
            metadataHash,
            msg.sender
        );
    }

    // =============================================================
    // CONTROLLER MANAGEMENT
    // =============================================================

    function proposeAssetController(
        bytes32 assetId,
        address newController
    )
        external
        override
        onlyAssetController(
            assetId
        )
    {
        if (
            newController ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        address currentController =
            _assets[
                assetId
            ].controller;

        if (
            newController ==
            currentController
        ) {
            revert SameController();
        }

        _pendingAssetControllers[
            assetId
        ] =
            newController;

        emit AssetControllerTransferProposed(
            assetId,
            currentController,
            newController
        );
    }

    function acceptAssetController(
        bytes32 assetId
    )
        external
        override
        onlyExistingAsset(
            assetId
        )
    {
        address pendingController =
            _pendingAssetControllers[
                assetId
            ];

        if (
            pendingController ==
            address(0)
        ) {
            revert NoPendingControllerTransfer(
                assetId
            );
        }

        if (
            msg.sender !=
            pendingController
        ) {
            revert UnauthorizedPendingController(
                assetId,
                msg.sender,
                pendingController
            );
        }

        AssetRecord storage record =
            _assets[
                assetId
            ];

        address previousController =
            record.controller;

        delete
            _pendingAssetControllers[
                assetId
            ];

        _removeControllerAsset(
            previousController,
            assetId
        );

        record.controller =
            pendingController;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        _addControllerAsset(
            pendingController,
            assetId
        );

        emit AssetControllerTransferred(
            assetId,
            previousController,
            pendingController
        );
    }

    function cancelAssetControllerTransfer(
        bytes32 assetId
    )
        external
        override
        onlyAssetController(
            assetId
        )
    {
        address pendingController =
            _pendingAssetControllers[
                assetId
            ];

        if (
            pendingController ==
            address(0)
        ) {
            revert NoPendingControllerTransfer(
                assetId
            );
        }

        delete
            _pendingAssetControllers[
                assetId
            ];

        emit AssetControllerTransferCancelled(
            assetId,
            msg.sender,
            pendingController
        );
    }

    function pendingAssetController(
        bytes32 assetId
    )
        external
        view
        override
        onlyExistingAsset(
            assetId
        )
        returns (address)
    {
        return
            _pendingAssetControllers[
                assetId
            ];
    }

    // =============================================================
    // ACTIVE STATUS
    // =============================================================

    function deactivateAsset(
        bytes32 assetId
    )
        external
        override
        onlyAssetController(
            assetId
        )
    {
        AssetRecord storage record =
            _assets[
                assetId
            ];

        if (!record.active) {
            revert AssetAlreadyInactive(
                assetId
            );
        }

        record.active =
            false;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit AssetDeactivated(
            assetId,
            msg.sender
        );
    }

    function reactivateAsset(
        bytes32 assetId
    )
        external
        override
        onlyAssetController(
            assetId
        )
    {
        AssetRecord storage record =
            _assets[
                assetId
            ];

        if (record.active) {
            revert AssetAlreadyActive(
                assetId
            );
        }

        record.active =
            true;

        record.updatedAt =
            uint64(
                block.timestamp
            );

        emit AssetReactivated(
            assetId,
            msg.sender
        );
    }

    // =============================================================
    // INTERNAL VALIDATION
    // =============================================================

    function _validateRegistrationRequest(
        RegisterAssetRequest calldata request
    )
        internal
        view
    {
        if (
            request.assetContract ==
                address(0) ||
            request.creator ==
                address(0) ||
            request.controller ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            request
                .assetContract
                .code
                .length == 0
        ) {
            revert InvalidAssetContract();
        }

        if (
            uint8(
                request.assetClass
            ) >
            uint8(
                NumenAssetTypes
                    .AssetClass
                    .NON_FUNGIBLE
            )
        ) {
            revert InvalidAssetClass();
        }

        if (
            request.standard ==
            NumenAssetTypes
                .AssetStandard
                .NONE
        ) {
            revert InvalidAssetStandard();
        }

        if (
            uint8(
                request.scope
            ) >
            uint8(
                NumenAssetTypes
                    .AssetScope
                    .TOKEN
            )
        ) {
            revert InvalidAssetScope();
        }

        bool validCombination;

        if (
            request.assetClass ==
            NumenAssetTypes
                .AssetClass
                .FUNGIBLE
        ) {
            validCombination =
                request.standard ==
                NumenAssetTypes
                    .AssetStandard
                    .ERC20;
        } else {
            validCombination =
                request.standard ==
                    NumenAssetTypes
                        .AssetStandard
                        .ERC721 ||
                request.standard ==
                    NumenAssetTypes
                        .AssetStandard
                        .ERC1155;
        }

        if (
            !validCombination
        ) {
            revert InvalidClassStandardCombination();
        }

        /*
         * ERC20:
         *
         * CONTRACT / 0 only.
         */
        if (
            request.standard ==
            NumenAssetTypes
                .AssetStandard
                .ERC20
        ) {
            if (
                request.scope !=
                    NumenAssetTypes
                        .AssetScope
                        .CONTRACT ||
                request.tokenId != 0
            ) {
                revert InvalidScopeTokenCombination();
            }

            return;
        }

        /*
         * ERC721 / ERC1155:
         *
         * CONTRACT scope requires tokenId 0.
         *
         * TOKEN scope may use any uint256 tokenId,
         * including tokenId 0.
         */
        if (
            request.scope ==
                NumenAssetTypes
                    .AssetScope
                    .CONTRACT &&
            request.tokenId != 0
        ) {
            revert InvalidScopeTokenCombination();
        }
    }

    // =============================================================
    // INTERNAL CONTROLLER INDEX
    // =============================================================

    function _addControllerAsset(
        address controller,
        bytes32 assetId
    )
        internal
    {
        _controllerAssetIndexes[
            assetId
        ] =
            _controllerAssetIds[
                controller
            ].length;

        _controllerAssetIds[
            controller
        ].push(
            assetId
        );
    }

    function _removeControllerAsset(
        address controller,
        bytes32 assetId
    )
        internal
    {
        bytes32[] storage assets =
            _controllerAssetIds[
                controller
            ];

        uint256 removeIndex =
            _controllerAssetIndexes[
                assetId
            ];

        uint256 lastIndex =
            assets.length - 1;

        if (
            removeIndex !=
            lastIndex
        ) {
            bytes32 lastAssetId =
                assets[
                    lastIndex
                ];

            assets[
                removeIndex
            ] =
                lastAssetId;

            _controllerAssetIndexes[
                lastAssetId
            ] =
                removeIndex;
        }

        assets.pop();

        delete
            _controllerAssetIndexes[
                assetId
            ];
    }
}