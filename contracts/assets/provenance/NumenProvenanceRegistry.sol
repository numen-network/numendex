// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";

/**
 * @title NumenProvenanceRegistry
 * @notice Append-only provenance history for assets registered in the
 *         Numen Asset Registry.
 *
 * @dev
 * - Provenance entries are immutable after creation.
 * - Entries can only be created for active registered Numen assets.
 * - This contract does not determine whether a claim is true.
 * - This contract does not prove authenticity, legal ownership,
 *   custody, origin, inspection quality, or regulatory compliance.
 * - The address that records an event is permanently stored as the
 *   recorder of that claim.
 *
 * The registry is intentionally permissionless at the protocol level.
 * Applications may use NumenAttestationRegistry or another trust layer
 * to determine which recorders they consider authoritative.
 */
contract NumenProvenanceRegistry {
    // =============================================================
    //                           ERRORS
    // =============================================================

    error ZeroAddress();
    error InvalidAssetId();
    error AssetNotRegistered(bytes32 assetId);
    error AssetNotActive(bytes32 assetId);
    error EmptyEventType();
    error EmptyData();
    error InvalidRelatedAddress();
    error ProvenanceEntryNotFound(uint256 entryId);

    // =============================================================
    //                           EVENTS
    // =============================================================

    event ProvenanceRecorded(
        uint256 indexed entryId,
        bytes32 indexed assetId,
        address indexed recorder,
        bytes32 eventType,
        address relatedAddress,
        uint64 recordedAt,
        string dataURI,
        bytes32 dataHash
    );

    // =============================================================
    //                           STRUCTS
    // =============================================================

    /**
     * @notice Immutable provenance entry.
     *
     * @param entryId Unique sequential provenance entry ID.
     * @param assetId Numen Asset ID this entry refers to.
     * @param eventType Application-defined event classification.
     * @param recorder Address that submitted the claim.
     * @param relatedAddress Optional address related to the event.
     * @param recordedAt Block timestamp when the claim was recorded.
     * @param dataURI Optional URI containing additional off-chain data.
     * @param dataHash Optional hash committing to provenance data.
     */
    struct ProvenanceEntry {
        uint256 entryId;
        bytes32 assetId;
        bytes32 eventType;
        address recorder;
        address relatedAddress;
        uint64 recordedAt;
        string dataURI;
        bytes32 dataHash;
    }

    // =============================================================
    //                       IMMUTABLE STORAGE
    // =============================================================

    INumenAssetRegistry public immutable assetRegistry;

    // =============================================================
    //                           STORAGE
    // =============================================================

    uint256 private _nextEntryId = 1;

    mapping(uint256 => ProvenanceEntry) private _entries;

    mapping(bytes32 => uint256[]) private _assetEntries;

    mapping(address => uint256[]) private _recorderEntries;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(address assetRegistry_) {
        if (assetRegistry_ == address(0)) {
            revert ZeroAddress();
        }

        assetRegistry = INumenAssetRegistry(assetRegistry_);
    }

    // =============================================================
    //                      WRITE FUNCTIONS
    // =============================================================

    /**
     * @notice Records a new immutable provenance claim.
     *
     * @dev
     * Anyone may record provenance for an active registered asset.
     *
     * The caller is permanently stored as the recorder. Consumers
     * should independently decide whether that recorder is trusted.
     *
     * At least one of dataURI or dataHash must be supplied.
     *
     * @param assetId Numen Asset ID.
     * @param eventType Application-defined event type.
     * @param relatedAddress Optional related account.
     * @param dataURI Optional URI for supporting information.
     * @param dataHash Optional hash commitment to supporting data.
     *
     * @return entryId Newly created provenance entry ID.
     */
    function recordProvenance(
        bytes32 assetId,
        bytes32 eventType,
        address relatedAddress,
        string calldata dataURI,
        bytes32 dataHash
    )
        external
        returns (uint256 entryId)
    {
        if (assetId == bytes32(0)) {
            revert InvalidAssetId();
        }

        if (eventType == bytes32(0)) {
            revert EmptyEventType();
        }

        if (
            bytes(dataURI).length == 0 &&
            dataHash == bytes32(0)
        ) {
            revert EmptyData();
        }

        _requireActiveAsset(assetId);

        entryId = _nextEntryId;
        unchecked {
            _nextEntryId = entryId + 1;
        }

        uint64 timestamp = uint64(block.timestamp);

        _entries[entryId] = ProvenanceEntry({
            entryId: entryId,
            assetId: assetId,
            eventType: eventType,
            recorder: msg.sender,
            relatedAddress: relatedAddress,
            recordedAt: timestamp,
            dataURI: dataURI,
            dataHash: dataHash
        });

        _assetEntries[assetId].push(entryId);
        _recorderEntries[msg.sender].push(entryId);

        emit ProvenanceRecorded(
            entryId,
            assetId,
            msg.sender,
            eventType,
            relatedAddress,
            timestamp,
            dataURI,
            dataHash
        );
    }

    // =============================================================
    //                       READ FUNCTIONS
    // =============================================================

    /**
     * @notice Returns one provenance entry.
     */
    function getProvenanceEntry(
        uint256 entryId
    )
        external
        view
        returns (ProvenanceEntry memory)
    {
        ProvenanceEntry storage entry = _entries[entryId];

        if (entry.entryId == 0) {
            revert ProvenanceEntryNotFound(entryId);
        }

        return entry;
    }

    /**
     * @notice Returns all provenance entry IDs for an asset.
     */
    function getAssetEntryIds(
        bytes32 assetId
    )
        external
        view
        returns (uint256[] memory)
    {
        return _assetEntries[assetId];
    }

    /**
     * @notice Returns all provenance entry IDs submitted by a recorder.
     */
    function getRecorderEntryIds(
        address recorder
    )
        external
        view
        returns (uint256[] memory)
    {
        return _recorderEntries[recorder];
    }

    /**
     * @notice Returns the number of provenance entries for an asset.
     */
    function getAssetEntryCount(
        bytes32 assetId
    )
        external
        view
        returns (uint256)
    {
        return _assetEntries[assetId].length;
    }

    /**
     * @notice Returns the number of provenance entries submitted by
     *         a recorder.
     */
    function getRecorderEntryCount(
        address recorder
    )
        external
        view
        returns (uint256)
    {
        return _recorderEntries[recorder].length;
    }

    /**
     * @notice Returns an asset provenance entry ID by index.
     */
    function getAssetEntryIdAt(
        bytes32 assetId,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        return _assetEntries[assetId][index];
    }

    /**
     * @notice Returns a recorder provenance entry ID by index.
     */
    function getRecorderEntryIdAt(
        address recorder,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        return _recorderEntries[recorder][index];
    }

    /**
     * @notice Returns the next provenance entry ID.
     */
    function nextEntryId()
        external
        view
        returns (uint256)
    {
        return _nextEntryId;
    }

    /**
     * @notice Returns this contract's protocol version identifier.
     */
    function provenanceVersion()
        external
        pure
        returns (bytes32)
    {
        return
            keccak256(
                "NUMEN_PROVENANCE_REGISTRY_V1"
            );
    }

    // =============================================================
    //                      INTERNAL FUNCTIONS
    // =============================================================

    function _requireActiveAsset(
        bytes32 assetId
    )
        internal
        view
    {
        INumenAssetRegistry.AssetRecord memory record =
            assetRegistry.getAsset(assetId);

        if (
            record.assetId == bytes32(0) ||
            record.assetContract == address(0)
        ) {
            revert AssetNotRegistered(assetId);
        }

        if (!record.active) {
            revert AssetNotActive(assetId);
        }
    }
}