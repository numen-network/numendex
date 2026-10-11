// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

import "../interfaces/INumenAsset.sol";
import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenFungibleAsset
 * @notice Configurable ERC-20 implementation for the
 *         Numen Asset Protocol.
 *
 * @dev
 * Supports:
 *
 * - Fixed, capped or uncapped supply
 * - Optional minting
 * - Optional burning
 * - Optional pausing
 * - Optional EIP-2612 Permit usage
 * - Optional ERC20Votes governance usage
 * - Custom decimals
 * - Numen metadata
 * - Numen classification
 * - Canonical self-registration
 * - Optional Object Registry integration flag
 *
 * REGISTRY SECURITY MODEL
 * -------------------------------------------------------------
 *
 * The asset registers ITSELF in NumenAssetRegistry.
 *
 * The registry does not receive:
 *
 * - admin privileges,
 * - mint privileges,
 * - pause privileges,
 * - metadata privileges,
 * - token ownership,
 * - arbitrary Asset ID assignment privileges.
 *
 * Anyone may trigger registerNumenAsset(), because the registration
 * data is derived entirely from this contract's stored state.
 *
 * Fungible assets always register with:
 *
 *     scope   = CONTRACT
 *     tokenId = 0
 *
 * The registry sees:
 *
 *     msg.sender == address(this)
 *
 * which satisfies canonical self-registration.
 *
 * IMPORTANT
 * -------------------------------------------------------------
 *
 * Registration or object association does not by itself prove
 * physical authenticity, legal ownership, provenance or
 * regulatory compliance.
 */
contract NumenFungibleAsset is
    ERC20,
    ERC20Permit,
    ERC20Votes,
    ERC20Pausable,
    AccessControl,
    INumenAsset
{
    // =============================================================
    //                            ERRORS
    // =============================================================

    error ZeroAddress();

    error InvalidDecimals(
        uint8 decimals_
    );

    error InvalidSupplyConfiguration();

    error InitialSupplyExceedsMaximum();

    error MintingDisabled();

    error BurningDisabled();

    error PausingDisabled();

    error PermitDisabled();

    error VotesDisabled();

    error MaximumSupplyExceeded(
        uint256 requestedSupply,
        uint256 maximumSupply
    );

    error RegistryNotConfigured();

    error AssetAlreadyRegistered();

    error RegistryReturnedInvalidAssetId();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event NumenAssetRegistered(
        bytes32 indexed assetId,
        address indexed registry,
        address indexed triggeredBy
    );

    // =============================================================
    //                            ROLES
    // =============================================================

    bytes32 public constant MINTER_ROLE =
        keccak256("MINTER_ROLE");

    bytes32 public constant PAUSER_ROLE =
        keccak256("PAUSER_ROLE");

    bytes32 public constant METADATA_ROLE =
        keccak256("METADATA_ROLE");

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant _PROTOCOL_VERSION =
        keccak256(
            "NUMEN_ASSET_PROTOCOL_V1"
        );

    uint8 public constant MAX_DECIMALS = 18;

    /**
     * @dev ERC20 assets are always contract-scoped.
     */
    NumenAssetTypes.AssetScope
        private constant _REGISTRY_SCOPE =
            NumenAssetTypes
                .AssetScope
                .CONTRACT;

    /**
     * @dev Contract-scoped records always use tokenId zero.
     */
    uint256 private constant _REGISTRY_TOKEN_ID = 0;

    // =============================================================
    //                       IMMUTABLE IDENTITY
    // =============================================================

    address private immutable _numenCreator;

    address private immutable _initialAdmin;

    address private immutable _registryController;

    address private immutable _numenRegistry;

    NumenAssetTypes.AssetCategory
        private _numenCategory;

    NumenAssetTypes.RepresentationType
        private _numenRepresentationType;

    // =============================================================
    //                     FEATURE CONFIGURATION
    // =============================================================

    NumenAssetTypes.SupplyModel
        private immutable _supplyModel;

    uint8 private immutable _customDecimals;

    uint256 private immutable _maximumSupply;

    bool private immutable _mintable;

    bool private immutable _burnable;

    bool private immutable _pausable;

    bool private immutable _permitEnabled;

    bool private immutable _votesEnabled;

    bool private immutable _objectBindingEnabled;

    // =============================================================
    //                           METADATA
    // =============================================================

    string private _numenMetadataUri;

    bytes32 private _numenMetadataHashValue;

    // =============================================================
    //                         REGISTRY ID
    // =============================================================

    bytes32 private _numenAssetIdValue;

    // =============================================================
    //                      CONSTRUCTOR CONFIG
    // =============================================================

    struct AssetConfig {
        string name;
        string symbol;

        uint8 decimals;

        uint256 initialSupply;
        uint256 maxSupply;

        NumenAssetTypes.SupplyModel
            supplyModel;

        bool mintable;
        bool burnable;
        bool pausable;
        bool permitEnabled;
        bool votesEnabled;
        bool objectBindingEnabled;

        NumenAssetTypes.AssetCategory
            category;

        NumenAssetTypes.RepresentationType
            representation;

        string metadataURI;
        bytes32 metadataHash;

        address creator;
        address admin;
        address initialRecipient;

        address mintAuthority;
        address pauseAuthority;
        address metadataAuthority;

        address registry;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        AssetConfig memory config
    )
        ERC20(
            config.name,
            config.symbol
        )
        ERC20Permit(
            config.name
        )
    {
        if (
            config.creator ==
                address(0) ||
            config.admin ==
                address(0) ||
            config.initialRecipient ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.decimals >
            MAX_DECIMALS
        ) {
            revert InvalidDecimals(
                config.decimals
            );
        }

        if (
            config.supplyModel ==
            NumenAssetTypes
                .SupplyModel
                .NOT_APPLICABLE
        ) {
            revert InvalidSupplyConfiguration();
        }

        if (
            config.supplyModel ==
            NumenAssetTypes
                .SupplyModel
                .FIXED
        ) {
            if (config.mintable) {
                revert InvalidSupplyConfiguration();
            }

            if (
                config.maxSupply !=
                config.initialSupply
            ) {
                revert InvalidSupplyConfiguration();
            }
        }

        if (
            config.supplyModel ==
            NumenAssetTypes
                .SupplyModel
                .CAPPED
        ) {
            if (
                config.maxSupply == 0
            ) {
                revert InvalidSupplyConfiguration();
            }

            if (
                config.initialSupply >
                config.maxSupply
            ) {
                revert InitialSupplyExceedsMaximum();
            }
        }

        if (
            config.supplyModel ==
            NumenAssetTypes
                .SupplyModel
                .UNCAPPED
        ) {
            if (
                config.maxSupply != 0
            ) {
                revert InvalidSupplyConfiguration();
            }
        }

        if (
            config.mintable &&
            config.mintAuthority ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.pausable &&
            config.pauseAuthority ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.metadataAuthority ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        _numenCreator =
            config.creator;

        _initialAdmin =
            config.admin;

        _registryController =
            config.admin;

        _numenRegistry =
            config.registry;

        _numenCategory =
            config.category;

        _numenRepresentationType =
            config.representation;

        _supplyModel =
            config.supplyModel;

        _customDecimals =
            config.decimals;

        _maximumSupply =
            config.maxSupply;

        _mintable =
            config.mintable;

        _burnable =
            config.burnable;

        _pausable =
            config.pausable;

        _permitEnabled =
            config.permitEnabled;

        _votesEnabled =
            config.votesEnabled;

        _objectBindingEnabled =
            config.objectBindingEnabled;

        _numenMetadataUri =
            config.metadataURI;

        _numenMetadataHashValue =
            config.metadataHash;

        _grantRole(
            DEFAULT_ADMIN_ROLE,
            config.admin
        );

        _grantRole(
            METADATA_ROLE,
            config.metadataAuthority
        );

        if (config.mintable) {
            _grantRole(
                MINTER_ROLE,
                config.mintAuthority
            );
        }

        if (config.pausable) {
            _grantRole(
                PAUSER_ROLE,
                config.pauseAuthority
            );
        }

        if (
            config.initialSupply > 0
        ) {
            _mint(
                config.initialRecipient,
                config.initialSupply
            );
        }
    }

    // =============================================================
    //                         ERC-20 INFO
    // =============================================================

    function decimals()
        public
        view
        override
        returns (uint8)
    {
        return _customDecimals;
    }

    // =============================================================
    //                        NUMEN IDENTITY
    // =============================================================

    function numenAssetProtocolVersion()
        external
        pure
        override
        returns (bytes32)
    {
        return _PROTOCOL_VERSION;
    }

    function numenAssetId()
        external
        view
        override
        returns (bytes32)
    {
        return _numenAssetIdValue;
    }

    function numenCreator()
        external
        view
        override
        returns (address)
    {
        return _numenCreator;
    }

    function numenAdmin()
        external
        view
        override
        returns (address)
    {
        return _initialAdmin;
    }

    function numenAssetClass()
        external
        pure
        override
        returns (
            NumenAssetTypes.AssetClass
        )
    {
        return
            NumenAssetTypes
                .AssetClass
                .FUNGIBLE;
    }

    function numenAssetStandard()
        external
        pure
        override
        returns (
            NumenAssetTypes.AssetStandard
        )
    {
        return
            NumenAssetTypes
                .AssetStandard
                .ERC20;
    }

    function numenAssetCategory()
        external
        view
        override
        returns (
            NumenAssetTypes.AssetCategory
        )
    {
        return _numenCategory;
    }

    function numenRepresentation()
        external
        view
        override
        returns (
            NumenAssetTypes
                .RepresentationType
        )
    {
        return _numenRepresentationType;
    }

    // =============================================================
    //                         NUMEN METADATA
    // =============================================================

    function numenMetadataURI()
        external
        view
        override
        returns (string memory)
    {
        return _numenMetadataUri;
    }

    function numenMetadataHash()
        external
        view
        override
        returns (bytes32)
    {
        return _numenMetadataHashValue;
    }

    function setNumenMetadata(
        string calldata metadataURI_,
        bytes32 metadataHash_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _numenMetadataUri =
            metadataURI_;

        _numenMetadataHashValue =
            metadataHash_;

        emit NumenMetadataUpdated(
            metadataURI_,
            metadataHash_,
            msg.sender
        );
    }

    function setNumenClassification(
        NumenAssetTypes.AssetCategory
            category_,
        NumenAssetTypes
            .RepresentationType
            representation_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _numenCategory =
            category_;

        _numenRepresentationType =
            representation_;

        emit NumenClassificationUpdated(
            category_,
            representation_,
            msg.sender
        );
    }

    // =============================================================
    //                       CAPABILITY FLAGS
    // =============================================================

    function numenMintable()
        external
        view
        override
        returns (bool)
    {
        return _mintable;
    }

    function numenBurnable()
        external
        view
        override
        returns (bool)
    {
        return _burnable;
    }

    function numenPausable()
        external
        view
        override
        returns (bool)
    {
        return _pausable;
    }

    function numenPermitEnabled()
        external
        view
        override
        returns (bool)
    {
        return _permitEnabled;
    }

    function numenVotesEnabled()
        external
        view
        override
        returns (bool)
    {
        return _votesEnabled;
    }

    function numenObjectBindingEnabled()
        external
        view
        override
        returns (bool)
    {
        return _objectBindingEnabled;
    }

    // =============================================================
    //                      SUPPLY INFORMATION
    // =============================================================

    function supplyModel()
        external
        view
        returns (
            NumenAssetTypes.SupplyModel
        )
    {
        return _supplyModel;
    }

    function maximumSupply()
        external
        view
        returns (uint256)
    {
        return _maximumSupply;
    }

    // =============================================================
    //                     REGISTRY INFORMATION
    // =============================================================

    function numenRegistry()
        external
        view
        returns (address)
    {
        return _numenRegistry;
    }

    function initialRegistryController()
        external
        view
        returns (address)
    {
        return _registryController;
    }

    /**
     * @notice Fungible assets always use CONTRACT scope.
     */
    function numenRegistryScope()
        external
        pure
        returns (
            NumenAssetTypes.AssetScope
        )
    {
        return _REGISTRY_SCOPE;
    }

    function isNumenRegistered()
        external
        view
        returns (bool)
    {
        return
            _numenAssetIdValue !=
            bytes32(0);
    }

    /**
     * @notice Performs canonical self-registration.
     *
     * @dev
     * Anyone may trigger this function, but the caller cannot choose
     * any registry field.
     *
     * ERC20 registration is always:
     *
     *     scope   = CONTRACT
     *     tokenId = 0
     */
    function registerNumenAsset()
        external
        returns (bytes32 assetId)
    {
        if (
            _numenRegistry ==
            address(0)
        ) {
            revert RegistryNotConfigured();
        }

        if (
            _numenAssetIdValue !=
            bytes32(0)
        ) {
            revert AssetAlreadyRegistered();
        }

        INumenAssetRegistry.RegisterAssetRequest
            memory request =
            INumenAssetRegistry
                .RegisterAssetRequest({
                    assetClass:
                        NumenAssetTypes
                            .AssetClass
                            .FUNGIBLE,

                    standard:
                        NumenAssetTypes
                            .AssetStandard
                            .ERC20,

                    scope:
                        _REGISTRY_SCOPE,

                    category:
                        _numenCategory,

                    representation:
                        _numenRepresentationType,

                    assetContract:
                        address(this),

                    tokenId:
                        _REGISTRY_TOKEN_ID,

                    creator:
                        _numenCreator,

                    controller:
                        _registryController,

                    metadataURI:
                        _numenMetadataUri,

                    metadataHash:
                        _numenMetadataHashValue
                });

        assetId =
            INumenAssetRegistry(
                _numenRegistry
            ).registerAsset(
                request
            );

        if (
            assetId ==
            bytes32(0)
        ) {
            revert RegistryReturnedInvalidAssetId();
        }

        _numenAssetIdValue =
            assetId;

        emit NumenAssetRegistered(
            assetId,
            _numenRegistry,
            msg.sender
        );
    }

    // =============================================================
    //                           MINTING
    // =============================================================

    function mint(
        address to,
        uint256 amount
    )
        external
        onlyRole(MINTER_ROLE)
    {
        if (!_mintable) {
            revert MintingDisabled();
        }

        if (
            to == address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            _supplyModel ==
            NumenAssetTypes
                .SupplyModel
                .CAPPED
        ) {
            uint256 resultingSupply =
                totalSupply() + amount;

            if (
                resultingSupply >
                _maximumSupply
            ) {
                revert MaximumSupplyExceeded(
                    resultingSupply,
                    _maximumSupply
                );
            }
        }

        _mint(
            to,
            amount
        );
    }

    // =============================================================
    //                           BURNING
    // =============================================================

    function burn(
        uint256 amount
    )
        external
    {
        if (!_burnable) {
            revert BurningDisabled();
        }

        _burn(
            msg.sender,
            amount
        );
    }

    function burnFrom(
        address account,
        uint256 amount
    )
        external
    {
        if (!_burnable) {
            revert BurningDisabled();
        }

        _spendAllowance(
            account,
            msg.sender,
            amount
        );

        _burn(
            account,
            amount
        );
    }

    // =============================================================
    //                           PAUSING
    // =============================================================

    function pause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (!_pausable) {
            revert PausingDisabled();
        }

        _pause();
    }

    function unpause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (!_pausable) {
            revert PausingDisabled();
        }

        _unpause();
    }

    // =============================================================
    //                           PERMIT
    // =============================================================

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        public
        override
    {
        if (!_permitEnabled) {
            revert PermitDisabled();
        }

        super.permit(
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );
    }

    // =============================================================
    //                           VOTING
    // =============================================================

    function delegate(
        address delegatee
    )
        public
        override
    {
        if (!_votesEnabled) {
            revert VotesDisabled();
        }

        super.delegate(
            delegatee
        );
    }

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        public
        override
    {
        if (!_votesEnabled) {
            revert VotesDisabled();
        }

        super.delegateBySig(
            delegatee,
            nonce,
            expiry,
            v,
            r,
            s
        );
    }

    // =============================================================
    //                     COMPLETE DESCRIPTOR
    // =============================================================

    function numenAssetDescriptor()
        external
        view
        override
        returns (
            bytes32 assetId,
            address creator,
            address admin,
            NumenAssetTypes.AssetClass
                assetClass,
            NumenAssetTypes.AssetStandard
                standard,
            NumenAssetTypes.AssetCategory
                category,
            NumenAssetTypes
                .RepresentationType
                representation,
            string memory metadataURI,
            bytes32 metadataHash,
            bool objectBindingEnabled
        )
    {
        return (
            _numenAssetIdValue,
            _numenCreator,
            _initialAdmin,
            NumenAssetTypes
                .AssetClass
                .FUNGIBLE,
            NumenAssetTypes
                .AssetStandard
                .ERC20,
            _numenCategory,
            _numenRepresentationType,
            _numenMetadataUri,
            _numenMetadataHashValue,
            _objectBindingEnabled
        );
    }

    // =============================================================
    //                          ERC-165
    // =============================================================

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            AccessControl,
            INumenAsset
        )
        returns (bool)
    {
        return
            interfaceId ==
                type(INumenAsset)
                    .interfaceId ||
            super.supportsInterface(
                interfaceId
            );
    }

    // =============================================================
    //                       INTERNAL UPDATE
    // =============================================================

    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(
            ERC20,
            ERC20Pausable,
            ERC20Votes
        )
    {
        super._update(
            from,
            to,
            value
        );
    }

    // =============================================================
    //                           NONCES
    // =============================================================

    function nonces(
        address owner
    )
        public
        view
        override(
            ERC20Permit,
            Nonces
        )
        returns (uint256)
    {
        return super.nonces(
            owner
        );
    }
}