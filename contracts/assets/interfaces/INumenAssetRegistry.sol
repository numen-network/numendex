// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/NumenAssetTypes.sol";

/**
 * @title INumenAssetRegistry
 * @notice Canonical registry interface for the Numen Asset Protocol.
 *
 * Registration means that an asset record exists in the
 * Numen Asset Protocol.
 *
 * Registration does NOT by itself prove physical authenticity,
 * legal ownership, regulatory compliance, provenance, issuer
 * legitimacy or correctness of metadata.
 */
interface INumenAssetRegistry {
    // =============================================================
    // EVENTS
    // =============================================================

    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed assetContract,
        address indexed creator,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId,
        NumenAssetTypes.AssetClass assetClass,
        NumenAssetTypes.AssetStandard standard,
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation
    );

    event AssetClassificationUpdated(
        bytes32 indexed assetId,
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation,
        address indexed updatedBy
    );

    event AssetMetadataUpdated(
        bytes32 indexed assetId,
        string metadataURI,
        bytes32 metadataHash,
        address indexed updatedBy
    );

    event AssetDeactivated(
        bytes32 indexed assetId,
        address indexed deactivatedBy
    );

    event AssetReactivated(
        bytes32 indexed assetId,
        address indexed reactivatedBy
    );

    /**
     * @notice Emitted when the current controller proposes a new
     *         controller.
     */
    event AssetControllerTransferProposed(
        bytes32 indexed assetId,
        address indexed currentController,
        address indexed proposedController
    );

    /**
     * @notice Emitted when a pending controller transfer is cancelled.
     */
    event AssetControllerTransferCancelled(
        bytes32 indexed assetId,
        address indexed controller,
        address indexed cancelledProposedController
    );

    /**
     * @notice Emitted only after the proposed controller explicitly
     *         accepts control.
     */
    event AssetControllerTransferred(
        bytes32 indexed assetId,
        address indexed previousController,
        address indexed newController
    );

    // =============================================================
    // REGISTRATION REQUEST
    // =============================================================

    struct RegisterAssetRequest {
        NumenAssetTypes.AssetClass assetClass;
        NumenAssetTypes.AssetStandard standard;
        NumenAssetTypes.AssetScope scope;
        NumenAssetTypes.AssetCategory category;
        NumenAssetTypes.RepresentationType representation;
        address assetContract;
        uint256 tokenId;
        address creator;
        address controller;
        string metadataURI;
        bytes32 metadataHash;
    }

    // =============================================================
    // REGISTRY RECORD
    // =============================================================

    struct AssetRecord {
        bytes32 assetId;
        NumenAssetTypes.AssetClass assetClass;
        NumenAssetTypes.AssetStandard standard;
        NumenAssetTypes.AssetScope scope;
        NumenAssetTypes.AssetCategory category;
        NumenAssetTypes.RepresentationType representation;
        address assetContract;
        uint256 tokenId;
        address creator;
        address controller;
        string metadataURI;
        bytes32 metadataHash;
        uint64 createdAt;
        uint64 updatedAt;
        bool active;
    }

    // =============================================================
    // REGISTRATION
    // =============================================================

    function registerAsset(
        RegisterAssetRequest calldata request
    )
        external
        returns (bytes32 assetId);

    // =============================================================
    // LOOKUPS
    // =============================================================

    function assetExists(
        bytes32 assetId
    )
        external
        view
        returns (bool);

    function isAssetActive(
        bytes32 assetId
    )
        external
        view
        returns (bool);

    function getAsset(
        bytes32 assetId
    )
        external
        view
        returns (AssetRecord memory);

    function getAssetId(
        address assetContract,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId
    )
        external
        view
        returns (bytes32);

    function isRegisteredAsset(
        address assetContract,
        NumenAssetTypes.AssetScope scope,
        uint256 tokenId
    )
        external
        view
        returns (bool);

    // =============================================================
    // COUNTERS
    // =============================================================

    function totalAssets()
        external
        view
        returns (uint256);

    function assetIdAt(
        uint256 index
    )
        external
        view
        returns (bytes32);

    // =============================================================
    // CREATOR / CONTROLLER INDEX
    // =============================================================

    function creatorAssetCount(
        address creator
    )
        external
        view
        returns (uint256);

    function creatorAssetIdAt(
        address creator,
        uint256 index
    )
        external
        view
        returns (bytes32);

    function controllerAssetCount(
        address controller
    )
        external
        view
        returns (uint256);

    function controllerAssetIdAt(
        address controller,
        uint256 index
    )
        external
        view
        returns (bytes32);

    // =============================================================
    // MUTABLE DATA
    // =============================================================

    function updateClassification(
        bytes32 assetId,
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation
    )
        external;

    function updateMetadata(
        bytes32 assetId,
        string calldata metadataURI,
        bytes32 metadataHash
    )
        external;

    // =============================================================
    // CONTROLLER MANAGEMENT
    // =============================================================

    /**
     * @notice Proposes transfer of control to a new address.
     *
     * @dev The proposed controller receives no authority until
     *      acceptAssetController() is called by that address.
     */
    function proposeAssetController(
        bytes32 assetId,
        address newController
    )
        external;

    /**
     * @notice Accepts a pending controller transfer.
     *
     * @dev Only the currently proposed controller may accept.
     */
    function acceptAssetController(
        bytes32 assetId
    )
        external;

    /**
     * @notice Cancels the pending controller transfer.
     *
     * @dev Only the current controller may cancel.
     */
    function cancelAssetControllerTransfer(
        bytes32 assetId
    )
        external;

    /**
     * @notice Returns the currently proposed controller.
     *
     * @return Zero address when no transfer is pending.
     */
    function pendingAssetController(
        bytes32 assetId
    )
        external
        view
        returns (address);

    // =============================================================
    // ACTIVE STATUS
    // =============================================================

    function deactivateAsset(
        bytes32 assetId
    )
        external;

    function reactivateAsset(
        bytes32 assetId
    )
        external;

    // =============================================================
    // PROTOCOL INFORMATION
    // =============================================================

    function registryVersion()
        external
        pure
        returns (bytes32);
}