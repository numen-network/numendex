// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title INumenObjectRegistryBindingView
 * @notice Minimal Object Registry interface required by
 *         NumenObjectBinding.
 */
interface INumenObjectRegistryBindingView {
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

    function getObject(
        bytes32 objectId
    )
        external
        view
        returns (
            ObjectRecord memory
        );
}

/**
 * @title NumenObjectBinding
 * @notice Bilateral-consent relationship layer between
 *         Numen Asset IDs and Numen Object IDs.
 *
 * DESIGN
 * =============================================================
 *
 * Asset identity and Object identity remain independent.
 *
 * One Object ID may be referenced by multiple assets:
 *
 * Physical Object
 *      |
 *      +-- ERC721 Digital Twin
 *      +-- ERC20 Fractional Interest
 *      +-- ERC721 Certificate
 *      +-- ERC1155 Usage Rights
 *
 * CONSENT MODEL
 * =============================================================
 *
 * If Asset controller == Object controller:
 *
 *     bindObject(...)
 *
 * may create the relationship immediately.
 *
 * If controllers are different:
 *
 *     proposeBinding(...)
 *             |
 *             v
 *     acceptBinding(...)
 *
 * is required.
 *
 * Either side may create the proposal.
 * Only the opposite current controller may accept it.
 *
 * REVOCATION
 * =============================================================
 *
 * Either current controller may deactivate an active binding.
 *
 * This is intentionally unilateral because a relationship should
 * not remain represented as active after either side withdraws
 * consent.
 *
 * REACTIVATION
 * =============================================================
 *
 * Reactivation follows the same consent model as creation:
 *
 * - same controller on both sides -> immediate
 * - different controllers -> proposal + acceptance
 *
 * CONTROLLER CHANGES
 * =============================================================
 *
 * Pending proposals store controller snapshots.
 *
 * Acceptance requires the controllers to still match those
 * snapshots. If either controller changed after the proposal was
 * created, the proposal becomes stale and cannot be accepted.
 *
 * A new proposal must then be created using the current
 * controllers.
 *
 * SEMANTIC BOUNDARY
 * =============================================================
 *
 * A binding means only:
 *
 *   "This Numen Asset record references this Numen Object record."
 *
 * It does NOT prove:
 *
 * - physical existence,
 * - authenticity,
 * - legal ownership,
 * - custody,
 * - possession,
 * - manufacturer origin,
 * - provenance,
 * - correctness of a 3D model,
 * - correctness of a spectral fingerprint.
 *
 * Those claims belong to separate attestation, document and
 * provenance layers.
 */
contract NumenObjectBinding {
    // =============================================================
    // ERRORS
    // =============================================================

    error ZeroAddress();

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

    error UnauthorizedAssetController(
        address caller,
        bytes32 assetId
    );

    error UnauthorizedObjectController(
        address caller,
        bytes32 objectId
    );

    error UnauthorizedBindingParty(
        address caller,
        bytes32 assetId,
        bytes32 objectId
    );

    error BindingAlreadyExists(
        bytes32 bindingId
    );

    error BindingNotFound(
        bytes32 bindingId
    );

    error BindingAlreadyActive(
        bytes32 bindingId
    );

    error BindingAlreadyInactive(
        bytes32 bindingId
    );

    error ProposalAlreadyExists(
        bytes32 bindingId
    );

    error ProposalNotFound(
        bytes32 bindingId
    );

    error ProposalAlreadyAcceptedByCaller(
        bytes32 bindingId,
        address caller
    );

    error ProposalControllerMismatch(
        bytes32 bindingId
    );

    error SameControllerCanBindDirectly();

    error InvalidIndex();

    // =============================================================
    // EVENTS
    // =============================================================

    event BindingProposed(
        bytes32 indexed bindingId,
        bytes32 indexed assetId,
        bytes32 indexed objectId,
        NumenAssetTypes.ObjectLinkType linkType,
        address proposer,
        address assetController,
        address objectController
    );

    event BindingProposalCancelled(
        bytes32 indexed bindingId,
        address indexed cancelledBy
    );

    event BindingProposalAccepted(
        bytes32 indexed bindingId,
        address indexed acceptedBy
    );

    event ObjectBound(
        bytes32 indexed bindingId,
        bytes32 indexed assetId,
        bytes32 indexed objectId,
        NumenAssetTypes.ObjectLinkType linkType,
        address activatedBy
    );

    event ObjectUnbound(
        bytes32 indexed bindingId,
        bytes32 indexed assetId,
        bytes32 indexed objectId,
        address unboundBy
    );

    event ObjectRebound(
        bytes32 indexed bindingId,
        bytes32 indexed assetId,
        bytes32 indexed objectId,
        address reboundBy
    );

    // =============================================================
    // STRUCTS
    // =============================================================

    struct BindingRecord {
        bytes32 bindingId;

        bytes32 assetId;
        bytes32 objectId;

        NumenAssetTypes.ObjectLinkType linkType;

        address createdBy;

        uint64 createdAt;
        uint64 updatedAt;

        bool active;
    }

    struct BindingProposal {
        bytes32 bindingId;

        bytes32 assetId;
        bytes32 objectId;

        NumenAssetTypes.ObjectLinkType linkType;

        address proposer;

        address assetController;
        address objectController;

        uint64 createdAt;

        bool exists;
    }

    // =============================================================
    // IMMUTABLES
    // =============================================================

    INumenAssetRegistry
        public immutable assetRegistry;

    INumenObjectRegistryBindingView
        public immutable objectRegistry;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 private constant
        _OBJECT_BINDING_VERSION =
            keccak256(
                "NUMEN_OBJECT_BINDING_V2"
            );

    // =============================================================
    // STORAGE
    // =============================================================

    mapping(
        bytes32 =>
            BindingRecord
    )
        private _bindings;

    mapping(
        bytes32 =>
            bool
    )
        private _bindingExists;

    mapping(
        bytes32 =>
            BindingProposal
    )
        private _proposals;

    bytes32[]
        private _allBindingIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _assetBindingIds;

    mapping(
        bytes32 =>
            bytes32[]
    )
        private _objectBindingIds;

    // =============================================================
    // CONSTRUCTOR
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
            INumenObjectRegistryBindingView(
                objectRegistry_
            );
    }

    // =============================================================
    // VERSION
    // =============================================================

    function objectBindingVersion()
        external
        pure
        returns (bytes32)
    {
        return
            _OBJECT_BINDING_VERSION;
    }

    // =============================================================
    // DIRECT BIND
    // =============================================================

    /**
     * @notice Creates a binding immediately when the same address
     *         currently controls both Asset and Object.
     *
     * @dev
     * When controllers differ, proposeBinding + acceptBinding
     * must be used instead.
     */
    function bindObject(
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType
    )
        external
        returns (
            bytes32 bindingId
        )
    {
        (
            address assetController,
            address objectController
        ) =
            _getActiveControllers(
                assetId,
                objectId
            );

        if (
            assetController !=
                msg.sender
        ) {
            revert UnauthorizedAssetController(
                msg.sender,
                assetId
            );
        }

        if (
            objectController !=
                msg.sender
        ) {
            revert UnauthorizedObjectController(
                msg.sender,
                objectId
            );
        }

        bindingId =
            getBindingId(
                assetId,
                objectId,
                linkType
            );

        if (
            _bindingExists[
                bindingId
            ]
        ) {
            revert BindingAlreadyExists(
                bindingId
            );
        }

        _clearProposal(
            bindingId
        );

        _createBinding(
            bindingId,
            assetId,
            objectId,
            linkType,
            msg.sender
        );
    }

    // =============================================================
    // PROPOSE BINDING
    // =============================================================

    /**
     * @notice Creates a bilateral binding proposal.
     *
     * Either the current Asset controller or current Object
     * controller may create the proposal.
     *
     * If both records have the same controller, bindObject()
     * should be used instead.
     */
    function proposeBinding(
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType
    )
        external
        returns (
            bytes32 bindingId
        )
    {
        (
            address assetController,
            address objectController
        ) =
            _getActiveControllers(
                assetId,
                objectId
            );

        if (
            msg.sender !=
                assetController &&
            msg.sender !=
                objectController
        ) {
            revert UnauthorizedBindingParty(
                msg.sender,
                assetId,
                objectId
            );
        }

        if (
            assetController ==
                objectController
        ) {
            revert SameControllerCanBindDirectly();
        }

        bindingId =
            getBindingId(
                assetId,
                objectId,
                linkType
            );

        if (
            _bindingExists[
                bindingId
            ] &&
            _bindings[
                bindingId
            ].active
        ) {
            revert BindingAlreadyActive(
                bindingId
            );
        }

        if (
            _proposals[
                bindingId
            ].exists
        ) {
            revert ProposalAlreadyExists(
                bindingId
            );
        }

        _proposals[
            bindingId
        ] =
            BindingProposal({
                bindingId:
                    bindingId,

                assetId:
                    assetId,

                objectId:
                    objectId,

                linkType:
                    linkType,

                proposer:
                    msg.sender,

                assetController:
                    assetController,

                objectController:
                    objectController,

                createdAt:
                    uint64(
                        block.timestamp
                    ),

                exists:
                    true
            });

        emit BindingProposed(
            bindingId,
            assetId,
            objectId,
            linkType,
            msg.sender,
            assetController,
            objectController
        );
    }

    // =============================================================
    // ACCEPT PROPOSAL
    // =============================================================

    /**
     * @notice Accepts a bilateral binding proposal.
     *
     * The accepting address must be the opposite controller from
     * the proposer.
     *
     * Controller snapshots must still match current Registry
     * controllers.
     */
    function acceptBinding(
        bytes32 bindingId
    )
        external
    {
        BindingProposal
            memory proposal =
                _requireProposal(
                    bindingId
                );

        (
            address currentAssetController,
            address currentObjectController
        ) =
            _getActiveControllers(
                proposal.assetId,
                proposal.objectId
            );

        if (
            currentAssetController !=
                proposal.assetController ||
            currentObjectController !=
                proposal.objectController
        ) {
            revert ProposalControllerMismatch(
                bindingId
            );
        }

        if (
            msg.sender ==
                proposal.proposer
        ) {
            revert ProposalAlreadyAcceptedByCaller(
                bindingId,
                msg.sender
            );
        }

        bool proposerIsAssetController =
            proposal.proposer ==
                proposal.assetController;

        bool proposerIsObjectController =
            proposal.proposer ==
                proposal.objectController;

        if (
            proposerIsAssetController
        ) {
            if (
                msg.sender !=
                    proposal.objectController
            ) {
                revert UnauthorizedObjectController(
                    msg.sender,
                    proposal.objectId
                );
            }
        } else if (
            proposerIsObjectController
        ) {
            if (
                msg.sender !=
                    proposal.assetController
            ) {
                revert UnauthorizedAssetController(
                    msg.sender,
                    proposal.assetId
                );
            }
        } else {
            revert UnauthorizedBindingParty(
                proposal.proposer,
                proposal.assetId,
                proposal.objectId
            );
        }

        delete _proposals[
            bindingId
        ];

        emit BindingProposalAccepted(
            bindingId,
            msg.sender
        );

        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            _createBinding(
                bindingId,
                proposal.assetId,
                proposal.objectId,
                proposal.linkType,
                proposal.proposer
            );
        } else {
            BindingRecord
                storage bindingRecord =
                    _bindings[
                        bindingId
                    ];

            if (
                bindingRecord.active
            ) {
                revert BindingAlreadyActive(
                    bindingId
                );
            }

            bindingRecord.active =
                true;

            bindingRecord.updatedAt =
                uint64(
                    block.timestamp
                );

            emit ObjectRebound(
                bindingId,
                bindingRecord.assetId,
                bindingRecord.objectId,
                msg.sender
            );
        }
    }

    // =============================================================
    // CANCEL PROPOSAL
    // =============================================================

    /**
     * @notice Cancels a pending proposal.
     *
     * Either current controller or the original proposer may cancel.
     */
    function cancelBindingProposal(
        bytes32 bindingId
    )
        external
    {
        BindingProposal
            memory proposal =
                _requireProposal(
                    bindingId
                );

        (
            address currentAssetController,
            address currentObjectController
        ) =
            _getActiveControllers(
                proposal.assetId,
                proposal.objectId
            );

        if (
            msg.sender !=
                proposal.proposer &&
            msg.sender !=
                currentAssetController &&
            msg.sender !=
                currentObjectController
        ) {
            revert UnauthorizedBindingParty(
                msg.sender,
                proposal.assetId,
                proposal.objectId
            );
        }

        delete _proposals[
            bindingId
        ];

        emit BindingProposalCancelled(
            bindingId,
            msg.sender
        );
    }

    // =============================================================
    // UNBIND
    // =============================================================

    /**
     * @notice Deactivates an active relationship.
     *
     * @dev
     * Either current Asset controller OR current Object controller
     * may revoke consent and deactivate the relationship.
     *
     * History remains stored.
     */
    function unbindObject(
        bytes32 bindingId
    )
        external
    {
        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            revert BindingNotFound(
                bindingId
            );
        }

        BindingRecord
            storage bindingRecord =
                _bindings[
                    bindingId
                ];

        if (
            !bindingRecord.active
        ) {
            revert BindingAlreadyInactive(
                bindingId
            );
        }

        (
            address assetController,
            address objectController
        ) =
            _getActiveControllers(
                bindingRecord.assetId,
                bindingRecord.objectId
            );

        if (
            msg.sender !=
                assetController &&
            msg.sender !=
                objectController
        ) {
            revert UnauthorizedBindingParty(
                msg.sender,
                bindingRecord.assetId,
                bindingRecord.objectId
            );
        }

        bindingRecord.active =
            false;

        bindingRecord.updatedAt =
            uint64(
                block.timestamp
            );

        _clearProposal(
            bindingId
        );

        emit ObjectUnbound(
            bindingId,
            bindingRecord.assetId,
            bindingRecord.objectId,
            msg.sender
        );
    }

    // =============================================================
    // DIRECT REBIND
    // =============================================================

    /**
     * @notice Reactivates a binding immediately when the same
     *         address currently controls both Asset and Object.
     *
     * @dev
     * When controllers differ, proposeBinding + acceptBinding
     * must be used.
     */
    function rebindObject(
        bytes32 bindingId
    )
        external
    {
        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            revert BindingNotFound(
                bindingId
            );
        }

        BindingRecord
            storage bindingRecord =
                _bindings[
                    bindingId
                ];

        if (
            bindingRecord.active
        ) {
            revert BindingAlreadyActive(
                bindingId
            );
        }

        (
            address assetController,
            address objectController
        ) =
            _getActiveControllers(
                bindingRecord.assetId,
                bindingRecord.objectId
            );

        if (
            assetController !=
                msg.sender
        ) {
            revert UnauthorizedAssetController(
                msg.sender,
                bindingRecord.assetId
            );
        }

        if (
            objectController !=
                msg.sender
        ) {
            revert UnauthorizedObjectController(
                msg.sender,
                bindingRecord.objectId
            );
        }

        bindingRecord.active =
            true;

        bindingRecord.updatedAt =
            uint64(
                block.timestamp
            );

        _clearProposal(
            bindingId
        );

        emit ObjectRebound(
            bindingId,
            bindingRecord.assetId,
            bindingRecord.objectId,
            msg.sender
        );
    }

    // =============================================================
    // BINDING ID
    // =============================================================

    function getBindingId(
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType
    )
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    assetId,
                    objectId,
                    linkType
                )
            );
    }

    // =============================================================
    // BASIC READS
    // =============================================================

    function bindingExists(
        bytes32 bindingId
    )
        external
        view
        returns (bool)
    {
        return
            _bindingExists[
                bindingId
            ];
    }

    function isBindingActive(
        bytes32 bindingId
    )
        external
        view
        returns (bool)
    {
        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            return false;
        }

        return
            _bindings[
                bindingId
            ].active;
    }

    function getBinding(
        bytes32 bindingId
    )
        external
        view
        returns (
            BindingRecord memory
        )
    {
        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            revert BindingNotFound(
                bindingId
            );
        }

        return
            _bindings[
                bindingId
            ];
    }

    // =============================================================
    // PROPOSAL READS
    // =============================================================

    function proposalExists(
        bytes32 bindingId
    )
        external
        view
        returns (bool)
    {
        return
            _proposals[
                bindingId
            ].exists;
    }

    function getProposal(
        bytes32 bindingId
    )
        external
        view
        returns (
            BindingProposal memory
        )
    {
        if (
            !_proposals[
                bindingId
            ].exists
        ) {
            revert ProposalNotFound(
                bindingId
            );
        }

        return
            _proposals[
                bindingId
            ];
    }

    // =============================================================
    // RELATIONSHIP LOOKUP
    // =============================================================

    function relationshipExists(
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType
    )
        external
        view
        returns (bool)
    {
        bytes32 bindingId =
            getBindingId(
                assetId,
                objectId,
                linkType
            );

        return
            _bindingExists[
                bindingId
            ];
    }

    function isRelationshipActive(
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType
    )
        external
        view
        returns (bool)
    {
        bytes32 bindingId =
            getBindingId(
                assetId,
                objectId,
                linkType
            );

        if (
            !_bindingExists[
                bindingId
            ]
        ) {
            return false;
        }

        return
            _bindings[
                bindingId
            ].active;
    }

    // =============================================================
    // GLOBAL ENUMERATION
    // =============================================================

    function totalBindings()
        external
        view
        returns (uint256)
    {
        return
            _allBindingIds.length;
    }

    function bindingIdAt(
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
                _allBindingIds.length
        ) {
            revert InvalidIndex();
        }

        return
            _allBindingIds[
                index
            ];
    }

    function allBindingIds()
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _allBindingIds;
    }

    // =============================================================
    // ASSET ENUMERATION
    // =============================================================

    function assetBindingCount(
        bytes32 assetId
    )
        external
        view
        returns (uint256)
    {
        return
            _assetBindingIds[
                assetId
            ].length;
    }

    function assetBindingIdAt(
        bytes32 assetId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
                _assetBindingIds[
                    assetId
                ].length
        ) {
            revert InvalidIndex();
        }

        return
            _assetBindingIds[
                assetId
            ][
                index
            ];
    }

    function assetBindingIds(
        bytes32 assetId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _assetBindingIds[
                assetId
            ];
    }

    // =============================================================
    // OBJECT ENUMERATION
    // =============================================================

    function objectBindingCount(
        bytes32 objectId
    )
        external
        view
        returns (uint256)
    {
        return
            _objectBindingIds[
                objectId
            ].length;
    }

    function objectBindingIdAt(
        bytes32 objectId,
        uint256 index
    )
        external
        view
        returns (bytes32)
    {
        if (
            index >=
                _objectBindingIds[
                    objectId
                ].length
        ) {
            revert InvalidIndex();
        }

        return
            _objectBindingIds[
                objectId
            ][
                index
            ];
    }

    function objectBindingIds(
        bytes32 objectId
    )
        external
        view
        returns (
            bytes32[] memory
        )
    {
        return
            _objectBindingIds[
                objectId
            ];
    }

    // =============================================================
    // INTERNAL CREATE
    // =============================================================

    function _createBinding(
        bytes32 bindingId,
        bytes32 assetId,
        bytes32 objectId,
        NumenAssetTypes.ObjectLinkType linkType,
        address createdBy
    )
        internal
    {
        if (
            _bindingExists[
                bindingId
            ]
        ) {
            revert BindingAlreadyExists(
                bindingId
            );
        }

        uint64 timestamp =
            uint64(
                block.timestamp
            );

        _bindings[
            bindingId
        ] =
            BindingRecord({
                bindingId:
                    bindingId,

                assetId:
                    assetId,

                objectId:
                    objectId,

                linkType:
                    linkType,

                createdBy:
                    createdBy,

                createdAt:
                    timestamp,

                updatedAt:
                    timestamp,

                active:
                    true
            });

        _bindingExists[
            bindingId
        ] =
            true;

        _allBindingIds.push(
            bindingId
        );

        _assetBindingIds[
            assetId
        ].push(
            bindingId
        );

        _objectBindingIds[
            objectId
        ].push(
            bindingId
        );

        emit ObjectBound(
            bindingId,
            assetId,
            objectId,
            linkType,
            msg.sender
        );
    }

    // =============================================================
    // INTERNAL CONTROLLER LOOKUP
    // =============================================================

    function _getActiveControllers(
        bytes32 assetId,
        bytes32 objectId
    )
        internal
        view
        returns (
            address assetController,
            address objectController
        )
    {
        assetController =
            _getActiveAssetController(
                assetId
            );

        objectController =
            _getActiveObjectController(
                objectId
            );
    }

    function _getActiveAssetController(
        bytes32 assetId
    )
        internal
        view
        returns (
            address controller
        )
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

        controller =
            record.controller;
    }

    function _getActiveObjectController(
        bytes32 objectId
    )
        internal
        view
        returns (
            address controller
        )
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

        INumenObjectRegistryBindingView
            .ObjectRecord
            memory record =
                objectRegistry.getObject(
                    objectId
                );

        controller =
            record.controller;
    }

    // =============================================================
    // INTERNAL PROPOSAL HELPERS
    // =============================================================

    function _requireProposal(
        bytes32 bindingId
    )
        internal
        view
        returns (
            BindingProposal memory proposal
        )
    {
        if (
            !_proposals[
                bindingId
            ].exists
        ) {
            revert ProposalNotFound(
                bindingId
            );
        }

        proposal =
            _proposals[
                bindingId
            ];
    }

    function _clearProposal(
        bytes32 bindingId
    )
        internal
    {
        if (
            _proposals[
                bindingId
            ].exists
        ) {
            delete _proposals[
                bindingId
            ];
        }
    }
}