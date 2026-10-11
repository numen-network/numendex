// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";

/**
 * @title INumenObjectRegistryDocumentView
 * @notice Minimal Object Registry interface required by the
 *         document registry.
 */
interface INumenObjectRegistryDocumentView {
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
 * @title NumenDocumentRegistry
 * @notice Immutable-reference document registry for Numen Assets
 *         and Numen Objects.
 *
 * @dev
 * The actual document SHOULD normally remain off-chain.
 *
 * Examples:
 *
 * - PDF certificate
 * - invoice
 * - inspection report
 * - appraisal
 * - legal document
 * - product passport
 * - manufacturing document
 * - vehicle document
 * - ownership document
 *
 * The registry stores:
 *
 * - document hash
 * - optional URI
 * - document type
 * - optional MIME type
 * - optional issuer
 * - timestamps
 *
 * PRIVACY
 * -------------------------------------------------------------
 *
 * Sensitive documents should NOT be uploaded publicly merely
 * because this registry supports a URI.
 *
 * For sensitive documents:
 *
 *     documentURI = ""
 *     documentHash = hash(document bytes)
 *
 * This allows later integrity comparison without publishing the
 * document itself.
 *
 * TRUST
 * -------------------------------------------------------------
 *
 * Registration does NOT mean that Numen verified:
 *
 * - authenticity,
 * - legal validity,
 * - ownership,
 * - issuer identity,
 * - document contents.
 *
 * The registrar address is permanently recorded.
 *
 * ATTESTATIONS
 * -------------------------------------------------------------
 *
 * Document storage/reference and attestation are intentionally
 * separate concerns.
 *
 * A document may exist in this registry without any trusted party
 * attesting to its validity.
 */
contract NumenDocumentRegistry {
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

    error EmptyDocumentHash();

    error EmptyDocumentType();

    error InvalidExpiration();

    error DocumentNotFound(
        bytes32 documentId
    );

    error Unauthorized(
        address caller,
        bytes32 documentId
    );

    error DocumentAlreadyRevoked(
        bytes32 documentId
    );

    error InvalidIndex();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event DocumentRegistered(
        bytes32 indexed documentId,
        bytes32 indexed targetId,
        address indexed registeredBy,
        bool targetIsAsset,
        bytes32 documentHash,
        string documentType
    );

    event DocumentRevoked(
        bytes32 indexed documentId,
        address indexed registeredBy,
        uint64 revokedAt
    );

    // =============================================================
    //                            STRUCTS
    // =============================================================

    /**
     * @notice Request used to register a document reference.
     *
     * Exactly one of assetId/objectId must be non-zero.
     *
     * documentURI is optional.
     *
     * documentHash is mandatory and should represent the exact
     * referenced document bytes or a clearly defined canonical
     * representation.
     *
     * issuer is descriptive metadata only. It is NOT verified by
     * this registry.
     */
    struct RegisterDocumentRequest {
        bytes32 assetId;
        bytes32 objectId;

        string documentType;
        string documentURI;

        bytes32 documentHash;

        string mimeType;

        string issuer;

        uint64 issuedAt;
        uint64 expiresAt;
    }

    /**
     * @notice Canonical stored document reference.
     *
     * @dev
     * Document information is immutable after registration except
     * for revocation status.
     */
    struct DocumentRecord {
        bytes32 documentId;

        bytes32 assetId;
        bytes32 objectId;

        address registeredBy;

        string documentType;
        string documentURI;

        bytes32 documentHash;

        string mimeType;

        string issuer;

        uint64 issuedAt;
        uint64 expiresAt;

        uint64 registeredAt;
        uint64 revokedAt;

        bool revoked;
    }

    // =============================================================
    //                          IMMUTABLES
    // =============================================================

    INumenAssetRegistry
        public immutable assetRegistry;

    INumenObjectRegistryDocumentView
        public immutable objectRegistry;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant
        _DOCUMENT_REGISTRY_VERSION =
        keccak256(
            "NUMEN_DOCUMENT_REGISTRY_V1"
        );

    // =============================================================
    //                           STORAGE
    // =============================================================

    uint256 private _documentNonce;

    mapping(
        bytes32 =>
            DocumentRecord
    )
        private _documents;

    mapping(
        bytes32 =>
            bool
    )
        private _documentExists;

    bytes32[]
        private _allDocumentIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _assetDocumentIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _objectDocumentIds;

    mapping(
        address =>
            bytes32[]
    )
        private _registrarDocumentIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _hashDocumentIds;

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
            INumenObjectRegistryDocumentView(
                objectRegistry_
            );
    }

    // =============================================================
    //                           VERSION
    // =============================================================

    function documentRegistryVersion()
        external
        pure
        returns (bytes32)
    {
        return
            _DOCUMENT_REGISTRY_VERSION;
    }

    // =============================================================
    //                     REGISTER DOCUMENT
    // =============================================================

    /**
     * @notice Registers an immutable document reference.
     *
     * @dev
     * Registration is permissionless.
     *
     * The caller is permanently stored as registeredBy.
     *
     * This does NOT establish that the caller created, owns,
     * issued or legally controls the referenced document.
     */
    function registerDocument(
        RegisterDocumentRequest calldata request
    )
        external
        returns (
            bytes32 documentId
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
            request.documentHash ==
            bytes32(0)
        ) {
            revert EmptyDocumentHash();
        }

        if (
            bytes(
                request.documentType
            ).length ==
            0
        ) {
            revert EmptyDocumentType();
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
            ++_documentNonce;
        }

        documentId =
            keccak256(
                abi.encode(
                    block.chainid,
                    address(this),
                    msg.sender,
                    targetId,
                    request.documentHash,
                    _documentNonce
                )
            );

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        _documents[
            documentId
        ] =
            DocumentRecord({
                documentId:
                    documentId,

                assetId:
                    request.assetId,

                objectId:
                    request.objectId,

                registeredBy:
                    msg.sender,

                documentType:
                    request.documentType,

                documentURI:
                    request.documentURI,

                documentHash:
                    request.documentHash,

                mimeType:
                    request.mimeType,

                issuer:
                    request.issuer,

                issuedAt:
                    request.issuedAt,

                expiresAt:
                    request.expiresAt,

                registeredAt:
                    timestamp,

                revokedAt:
                    0,

                revoked:
                    false
            });

        _documentExists[
            documentId
        ] =
            true;

        _allDocumentIds.push(
            documentId
        );

        _registrarDocumentIds[
            msg.sender
        ].push(
            documentId
        );

        _hashDocumentIds[
            request.documentHash
        ].push(
            documentId
        );

        if (hasAsset) {
            _assetDocumentIds[
                request.assetId
            ].push(
                documentId
            );
        } else {
            _objectDocumentIds[
                request.objectId
            ].push(
                documentId
            );
        }

        emit DocumentRegistered(
            documentId,
            targetId,
            msg.sender,
            targetIsAsset,
            request.documentHash,
            request.documentType
        );
    }

    // =============================================================
    //                      REVOKE DOCUMENT
    // =============================================================

    /**
     * @notice Revokes a document reference.
     *
     * @dev
     * Only the original registrar may revoke the record.
     *
     * Revocation preserves all historical data.
     */
    function revokeDocument(
        bytes32 documentId
    )
        external
    {
        if (
            !_documentExists[
                documentId
            ]
        ) {
            revert DocumentNotFound(
                documentId
            );
        }

        DocumentRecord
            storage record =
            _documents[
                documentId
            ];

        if (
            record.registeredBy !=
            msg.sender
        ) {
            revert Unauthorized(
                msg.sender,
                documentId
            );
        }

        if (
            record.revoked
        ) {
            revert DocumentAlreadyRevoked(
                documentId
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

        emit DocumentRevoked(
            documentId,
            msg.sender,
            timestamp
        );
    }

    // =============================================================
    //                         STATUS
    // =============================================================

    /**
     * @notice Returns whether the document reference is currently
     *         active.
     *
     * @dev
     * "active" means:
     *
     * - record exists,
     * - not revoked,
     * - not expired.
     *
     * It does NOT mean authentic, trusted or legally valid.
     */
    function isDocumentActive(
        bytes32 documentId
    )
        public
        view
        returns (bool)
    {
        if (
            !_documentExists[
                documentId
            ]
        ) {
            return false;
        }

        DocumentRecord
            storage record =
            _documents[
                documentId
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

    function isDocumentExpired(
        bytes32 documentId
    )
        external
        view
        returns (bool)
    {
        if (
            !_documentExists[
                documentId
            ]
        ) {
            return false;
        }

        DocumentRecord
            storage record =
            _documents[
                documentId
            ];

        return
            record.expiresAt != 0 &&
            block.timestamp >=
            record.expiresAt;
    }

    // =============================================================
    //                         BASIC READS
    // =============================================================

    function documentExists(
        bytes32 documentId
    )
        external
        view
        returns (bool)
    {
        return
            _documentExists[
                documentId
            ];
    }

    function getDocument(
        bytes32 documentId
    )
        external
        view
        returns (
            DocumentRecord memory
        )
    {
        if (
            !_documentExists[
                documentId
            ]
        ) {
            revert DocumentNotFound(
                documentId
            );
        }

        return
            _documents[
                documentId
            ];
    }

    // =============================================================
    //                    HASH LOOKUP
    // =============================================================

    /**
     * @notice Returns whether a document hash has ever been
     *         registered.
     *
     * @dev
     * The same document hash may legitimately appear against
     * multiple assets, objects or registrars.
     */
    function documentHashExists(
        bytes32 documentHash
    )
        external
        view
        returns (bool)
    {
        return
            _hashDocumentIds[
                documentHash
            ].length != 0;
    }

    function documentHashCount(
        bytes32 documentHash
    )
        external
        view
        returns (uint256)
    {
        return
            _hashDocumentIds[
                documentHash
            ].length;
    }

    function documentIdByHashAt(
        bytes32 documentHash,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _hashDocumentIds[
                documentHash
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _hashDocumentIds[
                documentHash
            ][
                index
            ];
    }

    function documentIdsByHash(
        bytes32 documentHash
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _hashDocumentIds[
                documentHash
            ];
    }

    // =============================================================
    //                    GLOBAL ENUMERATION
    // =============================================================

    function totalDocuments()
        external
        view
        returns (uint256)
    {
        return
            _allDocumentIds.length;
    }

    function documentIdAt(
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _allDocumentIds.length
        ) {
            revert InvalidIndex();
        }

        return
            _allDocumentIds[
                index
            ];
    }

    function allDocumentIds()
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _allDocumentIds;
    }

    // =============================================================
    //                     ASSET ENUMERATION
    // =============================================================

    function assetDocumentCount(
        bytes32 assetId
    )
        external
        view
        returns (uint256)
    {
        return
            _assetDocumentIds[
                assetId
            ].length;
    }

    function assetDocumentIdAt(
        bytes32 assetId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _assetDocumentIds[
                assetId
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _assetDocumentIds[
                assetId
            ][
                index
            ];
    }

    function assetDocumentIds(
        bytes32 assetId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _assetDocumentIds[
                assetId
            ];
    }

    // =============================================================
    //                    OBJECT ENUMERATION
    // =============================================================

    function objectDocumentCount(
        bytes32 objectId
    )
        external
        view
        returns (uint256)
    {
        return
            _objectDocumentIds[
                objectId
            ].length;
    }

    function objectDocumentIdAt(
        bytes32 objectId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _objectDocumentIds[
                objectId
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _objectDocumentIds[
                objectId
            ][
                index
            ];
    }

    function objectDocumentIds(
        bytes32 objectId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _objectDocumentIds[
                objectId
            ];
    }

    // =============================================================
    //                   REGISTRAR ENUMERATION
    // =============================================================

    function registrarDocumentCount(
        address registrar
    )
        external
        view
        returns (uint256)
    {
        return
            _registrarDocumentIds[
                registrar
            ].length;
    }

    function registrarDocumentIdAt(
        address registrar,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
            _registrarDocumentIds[
                registrar
            ].length
        ) {
            revert InvalidIndex();
        }

        return
            _registrarDocumentIds[
                registrar
            ][
                index
            ];
    }

    function registrarDocumentIds(
        address registrar
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _registrarDocumentIds[
                registrar
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