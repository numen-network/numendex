// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title INumenObjectRegistryAttestationView
 * @notice Minimal Object Registry interface required by the
 *         attestation layer.
 */
interface INumenObjectRegistryAttestationView {
    function objectExists(
        bytes32 objectId
    )
        external
        view
        returns (bool);

    function isObjectActive(
        bytes32 objectId
    )
        external
        view
        returns (bool);
}

/**
 * @title NumenAttestationRegistry
 * @notice Permissionless attestation registry for Numen assets
 *         and objects.
 *
 * @dev
 * An attestation means:
 *
 *     "Address X made claim Y about target Z at time T."
 *
 * It does NOT mean:
 *
 * - Numen verified the claim,
 * - Numen verified physical authenticity,
 * - Numen verified legal ownership,
 * - Numen verified manufacturer origin,
 * - Numen verified custody,
 * - Numen verified the identity of the attester.
 *
 * Trust in an attestation depends on the identity, reputation and
 * authority of the attester.
 *
 * The registry is intentionally permissionless. There is no global
 * owner, administrator or privileged attester.
 */
contract NumenAttestationRegistry {
    // =============================================================
    //                            ERRORS
    // =============================================================

    error ZeroAddress();

    error InvalidTarget();

    error AssetNotFound(
        bytes32 assetId
    );

    error AssetInactive(
        bytes32 assetId
    );

    error ObjectNotFound(
        bytes32 objectId
    );

    error ObjectInactive(
        bytes32 objectId
    );

    error EmptyClaim();

    error InvalidExpiration();

    error AttestationNotFound(
        bytes32 attestationId
    );

    error Unauthorized(
        address caller,
        bytes32 attestationId
    );

    error AttestationAlreadyRevoked(
        bytes32 attestationId
    );

    error AttestationExpired(
        bytes32 attestationId
    );

    error InvalidIndex();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event AttestationCreated(
        bytes32 indexed attestationId,
        address indexed attester,
        bytes32 indexed targetId,
        bool targetIsAsset,
        NumenAssetTypes.AttestationType attestationType,
        bytes32 claimHash,
        uint64 expiresAt
    );

    event AttestationRevoked(
        bytes32 indexed attestationId,
        address indexed attester,
        uint64 revokedAt
    );

    // =============================================================
    //                            STRUCTS
    // =============================================================

    /**
     * @notice Input used to create an attestation.
     *
     * Exactly one of assetId/objectId must be non-zero.
     *
     * claimURI may point to off-chain structured data such as:
     *
     * - IPFS JSON
     * - HTTPS JSON
     * - decentralized storage
     *
     * claimHash should represent the referenced claim payload.
     *
     * evidenceURI/evidenceHash are optional supporting evidence.
     *
     * expiresAt:
     *   0 = no expiration
     *   > block.timestamp = expiration timestamp
     */
    struct CreateAttestationRequest {
        bytes32 assetId;
        bytes32 objectId;

        NumenAssetTypes.AttestationType attestationType;

        string claimURI;
        bytes32 claimHash;

        string evidenceURI;
        bytes32 evidenceHash;

        uint64 expiresAt;
    }

    /**
     * @notice Canonical stored attestation.
     *
     * @dev Attestations are immutable after creation except for
     *      revocation status.
     */
    struct AttestationRecord {
        bytes32 attestationId;

        bytes32 assetId;
        bytes32 objectId;

        address attester;

        NumenAssetTypes.AttestationType attestationType;

        string claimURI;
        bytes32 claimHash;

        string evidenceURI;
        bytes32 evidenceHash;

        uint64 createdAt;
        uint64 expiresAt;
        uint64 revokedAt;

        bool revoked;
    }

    // =============================================================
    //                          IMMUTABLES
    // =============================================================

    INumenAssetRegistry
        public immutable assetRegistry;

    INumenObjectRegistryAttestationView
        public immutable objectRegistry;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant
        _ATTESTATION_REGISTRY_VERSION =
        keccak256(
            "NUMEN_ATTESTATION_REGISTRY_V1"
        );

    // =============================================================
    //                           STORAGE
    // =============================================================

    uint256 private _attestationNonce;

    mapping(
        bytes32 =>
            AttestationRecord
    )
        private _attestations;

    mapping(
        bytes32 =>
            bool
    )
        private _attestationExists;

    bytes32[]
        private _allAttestationIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _assetAttestationIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _objectAttestationIds;

    mapping(
        address =>
            bytes32[]
    )
        private _attesterAttestationIds;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        address assetRegistry_,
        address objectRegistry_
    ) {
        if (
            assetRegistry_ ==
            address(0) ||
            objectRegistry_ ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        assetRegistry =
            INumenAssetRegistry(
                assetRegistry_
            );

        objectRegistry =
            INumenObjectRegistryAttestationView(
                objectRegistry_
            );
    }

    // =============================================================
    //                           VERSION
    // =============================================================

    function attestationRegistryVersion()
        external
        pure
        returns (bytes32)
    {
        return
            _ATTESTATION_REGISTRY_VERSION;
    }

    // =============================================================
    //                    CREATE ATTESTATION
    // =============================================================

    /**
     * @notice Creates an attestation about one Asset ID or one
     *         Object ID.
     *
     * @dev This function is intentionally permissionless.
     *
     * Anyone may make a claim, but the attester address is always
     * permanently recorded.
     *
     * Applications should evaluate who the attester is instead of
     * treating all attestations as equally trustworthy.
     */
    function createAttestation(
        CreateAttestationRequest calldata request
    )
        external
        returns (
            bytes32 attestationId
        )
    {
        bool hasAsset =
            request.assetId !=
            bytes32(0);

        bool hasObject =
            request.objectId !=
            bytes32(0);

        if (
            hasAsset ==
            hasObject
        ) {
            revert InvalidTarget();
        }

        if (
            request.claimHash ==
            bytes32(0)
        ) {
            revert EmptyClaim();
        }

        if (
            request.expiresAt != 0 &&
            request.expiresAt <=
            block.timestamp
        ) {
            revert InvalidExpiration();
        }

        bytes32 targetId;

        bool targetIsAsset;

        if (hasAsset) {
            _requireActiveAsset(
                request.assetId
            );

            targetId =
                request.assetId;

            targetIsAsset =
                true;
        } else {
            _requireActiveObject(
                request.objectId
            );

            targetId =
                request.objectId;

            targetIsAsset =
                false;
        }

        unchecked {
            ++_attestationNonce;
        }

        attestationId =
            keccak256(
                abi.encode(
                    block.chainid,
                    address(this),
                    msg.sender,
                    targetId,
                    request.attestationType,
                    request.claimHash,
                    _attestationNonce
                )
            );

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        _attestations[
            attestationId
        ] =
            AttestationRecord({
                attestationId:
                    attestationId,

                assetId:
                    request.assetId,

                objectId:
                    request.objectId,

                attester:
                    msg.sender,

                attestationType:
                    request.attestationType,

                claimURI:
                    request.claimURI,

                claimHash:
                    request.claimHash,

                evidenceURI:
                    request.evidenceURI,

                evidenceHash:
                    request.evidenceHash,

                createdAt:
                    timestamp,

                expiresAt:
                    request.expiresAt,

                revokedAt:
                    0,

                revoked:
                    false
            });

        _attestationExists[
            attestationId
        ] =
            true;

        _allAttestationIds.push(
            attestationId
        );

        _attesterAttestationIds[
            msg.sender
        ].push(
            attestationId
        );

        if (hasAsset) {
            _assetAttestationIds[
                request.assetId
            ].push(
                attestationId
            );
        } else {
            _objectAttestationIds[
                request.objectId
            ].push(
                attestationId
            );
        }

        emit AttestationCreated(
            attestationId,
            msg.sender,
            targetId,
            targetIsAsset,
            request.attestationType,
            request.claimHash,
            request.expiresAt
        );
    }

    // =============================================================
    //                       REVOKE ATTESTATION
    // =============================================================

    /**
     * @notice Revokes an attestation.
     *
     * @dev Only the original attester may revoke it.
     *
     * Revocation does not delete historical information.
     */
    function revokeAttestation(
        bytes32 attestationId
    )
        external
    {
        if (
            !_attestationExists[
                attestationId
            ]
        ) {
            revert AttestationNotFound(
                attestationId
            );
        }

        AttestationRecord
            storage record =
            _attestations[
                attestationId
            ];

        if (
            record.attester !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                attestationId
            );
        }

        if (
            record.revoked
        ) {
            revert AttestationAlreadyRevoked(
                attestationId
            );
        }

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        record.revoked =
            true;

        record.revokedAt =
            timestamp;

        emit AttestationRevoked(
            attestationId,
            msg.sender,
            timestamp
        );
    }

    // =============================================================
    //                           STATUS
    // =============================================================

    /**
     * @notice Returns true only if the attestation exists,
     *         has not been revoked and has not expired.
     *
     * @dev "active" does NOT mean "trusted" or "verified".
     */
    function isAttestationActive(
        bytes32 attestationId
    )
        public
        view
        returns (bool)
    {
        if (
            !_attestationExists[
                attestationId
            ]
        ) {
            return false;
        }

        AttestationRecord
            storage record =
            _attestations[
                attestationId
            ];

        if (
            record.revoked
        ) {
            return false;
        }

        if (
            record.expiresAt != 0 &&
            block.timestamp >=
            record.expiresAt
        ) {
            return false;
        }

        return true;
    }

    function isAttestationExpired(
        bytes32 attestationId
    )
        external
        view
        returns (bool)
    {
        if (
            !_attestationExists[
                attestationId
            ]
        ) {
            return false;
        }

        AttestationRecord
            storage record =
            _attestations[
                attestationId
            ];

        return
            record.expiresAt != 0 &&
            block.timestamp >=
            record.expiresAt;
    }

    // =============================================================
    //                         BASIC READS
    // =============================================================

    function attestationExists(
        bytes32 attestationId
    )
        external
        view
        returns (bool)
    {
        return
            _attestationExists[
                attestationId
            ];
    }

    function getAttestation(
        bytes32 attestationId
    )
        external
        view
        returns (
            AttestationRecord memory
        )
    {
        if (
            !_attestationExists[
                attestationId
            ]
        ) {
            revert AttestationNotFound(
                attestationId
            );
        }

        return
            _attestations[
                attestationId
            ];
    }

    // =============================================================
    //                    GLOBAL ENUMERATION
    // =============================================================

    function totalAttestations()
        external
        view
        returns (uint256)
    {
        return
            _allAttestationIds.length;
    }

    function attestationIdAt(
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _allAttestationIds.length
        ) {
            revert InvalidIndex();
        }

        return
            _allAttestationIds[
                index
            ];
    }

    function allAttestationIds()
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _allAttestationIds;
    }

    // =============================================================
    //                     ASSET ENUMERATION
    // =============================================================

    function assetAttestationCount(
        bytes32 assetId
    )
        external
        view
        returns (uint256)
    {
        return
            _assetAttestationIds[
                assetId
            ].length;
    }

    function assetAttestationIdAt(
        bytes32 assetId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _assetAttestationIds[
                assetId
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _assetAttestationIds[
                assetId
            ][
                index
            ];
    }

    function assetAttestationIds(
        bytes32 assetId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _assetAttestationIds[
                assetId
            ];
    }

    // =============================================================
    //                    OBJECT ENUMERATION
    // =============================================================

    function objectAttestationCount(
        bytes32 objectId
    )
        external
        view
        returns (uint256)
    {
        return
            _objectAttestationIds[
                objectId
            ].length;
    }

    function objectAttestationIdAt(
        bytes32 objectId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _objectAttestationIds[
                objectId
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _objectAttestationIds[
                objectId
            ][
                index
            ];
    }

    function objectAttestationIds(
        bytes32 objectId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _objectAttestationIds[
                objectId
            ];
    }

    // =============================================================
    //                   ATTESTER ENUMERATION
    // =============================================================

    function attesterAttestationCount(
        address attester
    )
        external
        view
        returns (uint256)
    {
        return
            _attesterAttestationIds[
                attester
            ].length;
    }

    function attesterAttestationIdAt(
        address attester,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _attesterAttestationIds[
                attester
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _attesterAttestationIds[
                attester
            ][
                index
            ];
    }

    function attesterAttestationIds(
        address attester
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _attesterAttestationIds[
                attester
            ];
    }

    // =============================================================
    //                    INTERNAL VALIDATION
    // =============================================================

    function _requireActiveAsset(
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
    }

    function _requireActiveObject(
        bytes32 objectId
    )
        internal
        view
    {
        if (
            !objectRegistry.objectExists(
                objectId
            )
        ) {
            revert ObjectNotFound(
                objectId
            );
        }

        if (
            !objectRegistry.isObjectActive(
                objectId
            )
        ) {
            revert ObjectInactive(
                objectId
            );
        }
    }
}